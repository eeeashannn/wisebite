from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta, date
import os
import base64
import re
import uuid
import jwt
import requests

app = Flask(__name__)
# Allow frontend origin for CORS; preflight (OPTIONS) must succeed for POST with JSON
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:5173",
                "http://127.0.0.1:5173",
            ],
        }
    },
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    supports_credentials=False,
)

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
JWT_EXPIRY_DAYS = 7

# Open Food Facts (and some other APIs) return 403 for the default "python-requests/..." User-Agent.
_HTTP_USER_AGENT = os.environ.get(
    "WISEBITE_HTTP_USER_AGENT",
    "WiseBite/1.0 (https://github.com/wisebite; educational pantry app)",
)
OUTBOUND_REQUEST_HEADERS = {
    "User-Agent": _HTTP_USER_AGENT,
    "Accept": "application/json",
}
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "profile_photos")
ALLOWED_PROFILE_IMAGE_EXTS = {"jpg", "jpeg", "png", "webp"}
MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024

os.makedirs(PROFILE_UPLOAD_DIR, exist_ok=True)

# In-memory user store: email -> { "id", "email", "password_hash" }
USERS = {}
_NEXT_USER_ID = 1

def _next_user_id():
    global _NEXT_USER_ID
    n = _NEXT_USER_ID
    _NEXT_USER_ID += 1
    return n

def _make_token(user_id, email):
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def _default_name_from_email(email):
    local = (email or "").split("@")[0].strip()
    if not local:
        return "User"
    return local.replace(".", " ").replace("_", " ").title()


def _user_to_profile(user_obj):
    if not user_obj:
        return None
    return {
        "id": user_obj.get("id"),
        "email": user_obj.get("email"),
        "name": user_obj.get("name") or _default_name_from_email(user_obj.get("email")),
        "photo_url": user_obj.get("photo_url"),
    }


def _get_user_record_by_id(user_id):
    return next((u for u in USERS.values() if u.get("id") == user_id), None)


def _allowed_profile_file(filename):
    if not filename or "." not in filename:
        return False
    ext = filename.rsplit(".", 1)[1].lower()
    return ext in ALLOWED_PROFILE_IMAGE_EXTS


def _get_current_user():
    """Read Authorization: Bearer <token>, decode JWT; return {"user_id", "email"} or None."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    token = auth[7:].strip()
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return {"user_id": payload.get("user_id"), "email": payload.get("email")}
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None


# Optional: FatSecret Platform API (barcode + nutrition). If set, used first; else Open Food Facts.
FATSECRET_CLIENT_ID = os.environ.get("FATSECRET_CLIENT_ID", "").strip()
FATSECRET_CLIENT_SECRET = os.environ.get("FATSECRET_CLIENT_SECRET", "").strip()
_FATSECRET_TOKEN = None

# In-memory pantry storage; each item has user_id for per-user inventory
PANTRY_ITEMS = []
_NEXT_ID = 1
SHOPPING_LIST_ITEMS = []
ACTIVITY_EVENTS = []
UNDO_ACTIONS = {}
HOUSEHOLDS = {}
INVITES = {}
USER_HOUSEHOLD = {}
USER_SHARE_MODE = {}
_NEXT_HOUSEHOLD_ID = 1

def _next_id():
    global _NEXT_ID
    n = _NEXT_ID
    _NEXT_ID += 1
    return n


def _next_household_id():
    global _NEXT_HOUSEHOLD_ID
    n = _NEXT_HOUSEHOLD_ID
    _NEXT_HOUSEHOLD_ID += 1
    return n


def _today_str():
    return datetime.now().strftime("%Y-%m-%d")


def _get_scope_user_ids(user_id):
    if not USER_SHARE_MODE.get(user_id, False):
        return [user_id]
    household_id = USER_HOUSEHOLD.get(user_id)
    if not household_id:
        return [user_id]
    household = HOUSEHOLDS.get(household_id)
    if not household:
        return [user_id]
    return household.get("members", [user_id])


def _log_activity(actor_user_id, event_type, message, payload=None):
    ACTIVITY_EVENTS.append({
        "id": str(uuid.uuid4()),
        "user_id": actor_user_id,
        "type": event_type,
        "message": message,
        "payload": payload or {},
        "created_at": datetime.utcnow().isoformat() + "Z",
    })


def _compute_reminders(items):
    today = datetime.now().date()
    reminders = {"expired": [], "today": [], "soon": []}
    for item in items:
        try:
            expiry_date = datetime.strptime(item["expiry"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue
        days = (expiry_date - today).days
        row = {"id": item["id"], "name": item["name"], "expiry": item["expiry"], "days_remaining": days}
        if days < 0:
            reminders["expired"].append(row)
        elif days == 0:
            reminders["today"].append(row)
        elif days <= 2:
            reminders["soon"].append(row)
    return reminders


def _compute_reorder_suggestions(user_id):
    # Simple heuristic: frequently consumed items with low remaining quantity.
    consumed_counts = {}
    scope_user_ids = _get_scope_user_ids(user_id)
    for ev in ACTIVITY_EVENTS:
        if ev.get("type") != "item_consumed" or ev.get("user_id") not in scope_user_ids:
            continue
        name = (ev.get("payload", {}).get("item_name") or "").strip()
        if not name:
            continue
        consumed_counts[name] = consumed_counts.get(name, 0) + 1

    scoped_items = [i for i in PANTRY_ITEMS if i.get("user_id") in scope_user_ids]
    suggestions = []
    for name, count in sorted(consumed_counts.items(), key=lambda x: x[1], reverse=True):
        matching = [i for i in scoped_items if (i.get("name") or "").lower() == name.lower()]
        qty = sum((float(i.get("quantity", 0) or 0) for i in matching))
        if count >= 2 and qty <= 1:
            suggestions.append({"name": name, "reason": "Frequently used and running low", "consumed_count": count})
    return suggestions[:5]


def _compute_weekly_insights(user_id):
    scope_user_ids = _get_scope_user_ids(user_id)
    since = datetime.utcnow() - timedelta(days=7)
    recent = []
    for ev in ACTIVITY_EVENTS:
        if ev.get("user_id") not in scope_user_ids:
            continue
        created_at = ev.get("created_at", "").replace("Z", "")
        try:
            stamp = datetime.fromisoformat(created_at)
        except ValueError:
            continue
        if stamp >= since:
            recent.append(ev)

    consumed = len([e for e in recent if e.get("type") == "item_consumed"])
    expired = len([e for e in recent if e.get("type") == "item_expired_removed"])
    saved = len([e for e in recent if e.get("type") == "item_consumed_before_expiry"])

    waste_by_category = {}
    for e in recent:
        if e.get("type") != "item_expired_removed":
            continue
        cat = e.get("payload", {}).get("category") or "Other"
        waste_by_category[cat] = waste_by_category.get(cat, 0) + 1

    top_wasted = [{"category": k, "count": v} for k, v in sorted(waste_by_category.items(), key=lambda x: x[1], reverse=True)[:5]]
    return {
        "consumed_before_expiry": saved,
        "expired_count": expired,
        "consumed_count": consumed,
        "saved_items_this_week": saved,
        "top_wasted_categories": top_wasted,
    }


def _compute_stats(items):
    today = datetime.now().date()
    total = len(items)
    fresh = expiring_soon = expired = 0
    for item in items:
        try:
            expiry_date = datetime.strptime(item["expiry"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue
        days = (expiry_date - today).days
        if days < 0:
            expired += 1
        elif days <= 3:
            expiring_soon += 1
        else:
            fresh += 1
    return {
        "total_items": total,
        "fresh": fresh,
        "expiring_soon": expiring_soon,
        "expired": expired,
    }


_ALLOWED_CORS_ORIGINS = frozenset(
    {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }
)


@app.after_request
def after_request(response):
    """Ensure CORS headers on every response so preflight (OPTIONS) succeeds."""
    origin = request.origin if request.origin else "*"
    if origin in _ALLOWED_CORS_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response


@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to WiseBite API!",
        "version": "1.0.0",
        "endpoints": {
            "/auth/signup": "POST sign up (email, password)",
            "/auth/login": "POST sign in (email, password)",
            "/profile": "GET/PUT profile details",
            "/profile/photo": "POST upload profile photo",
            "/items": "GET all, POST add",
            "/items/<id>": "GET one, DELETE one",
            "/stats": "GET dashboard statistics",
            "/barcode/<code>": "GET product by barcode (FatSecret if configured, else Open Food Facts)",
            "/recipes/generate": "POST generate recipe",
            "/produce/scan": "POST AI produce freshness (estimate)",
        }
    })


@app.route('/auth/signup', methods=['OPTIONS', 'POST'])
def auth_signup():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email:
        return jsonify({"error": "Email is required"}), 400
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        return jsonify({"error": "Invalid email format"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    if email in USERS:
        return jsonify({"error": "Email already registered"}), 409

    user_id = _next_user_id()
    display_name = (data.get("name") or "").strip() or _default_name_from_email(email)
    USERS[email] = {
        "id": user_id,
        "email": email,
        "name": display_name,
        "photo_url": None,
        "password_hash": generate_password_hash(password),
    }
    token = _make_token(user_id, email)
    return jsonify({
        "token": token,
        "user": _user_to_profile(USERS[email]),
    }), 201


@app.route('/auth/login', methods=['OPTIONS', 'POST'])
def auth_login():
    if request.method == "OPTIONS":
        return "", 204
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = USERS.get(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = _make_token(user["id"], user["email"])
    return jsonify({
        "token": token,
        "user": _user_to_profile(user),
    })


@app.route('/uploads/profile_photos/<path:filename>', methods=['GET'])
def serve_profile_photo(filename):
    return send_from_directory(PROFILE_UPLOAD_DIR, filename)


@app.route('/profile', methods=['GET', 'PUT'])
def profile():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    user_record = _get_user_record_by_id(user["user_id"])
    if not user_record:
        return jsonify({"error": "User not found"}), 404

    if request.method == "GET":
        return jsonify(_user_to_profile(user_record))

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    user_record["name"] = name
    _log_activity(user["user_id"], "profile_updated", "Updated profile details", {"name": name})
    return jsonify(_user_to_profile(user_record))


@app.route('/profile/photo', methods=['POST'])
def upload_profile_photo():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    user_record = _get_user_record_by_id(user["user_id"])
    if not user_record:
        return jsonify({"error": "User not found"}), 404

    if "photo" not in request.files:
        return jsonify({"error": "photo file is required"}), 400
    photo = request.files["photo"]
    if not photo or not photo.filename:
        return jsonify({"error": "photo file is required"}), 400
    if not _allowed_profile_file(photo.filename):
        return jsonify({"error": "Unsupported file type. Use JPG, PNG, or WEBP"}), 400

    photo.stream.seek(0, os.SEEK_END)
    size = photo.stream.tell()
    photo.stream.seek(0)
    if size > MAX_PROFILE_IMAGE_BYTES:
        return jsonify({"error": "File too large. Max size is 5MB"}), 400

    safe_name = secure_filename(photo.filename)
    ext = safe_name.rsplit(".", 1)[1].lower()
    filename = f"{user['user_id']}_{uuid.uuid4().hex[:10]}.{ext}"
    path = os.path.join(PROFILE_UPLOAD_DIR, filename)
    photo.save(path)

    # Remove old photo file to avoid unbounded local growth.
    old_url = user_record.get("photo_url")
    if old_url and old_url.startswith("/uploads/profile_photos/"):
        old_name = old_url.rsplit("/", 1)[-1]
        old_path = os.path.join(PROFILE_UPLOAD_DIR, old_name)
        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    user_record["photo_url"] = f"/uploads/profile_photos/{filename}"
    _log_activity(user["user_id"], "profile_photo_updated", "Updated profile photo", {"photo_url": user_record["photo_url"]})
    return jsonify(_user_to_profile(user_record))


@app.route('/items', methods=['GET'])
def get_items():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    my_items = [i for i in PANTRY_ITEMS if i.get("user_id") in scope_user_ids]
    return jsonify(my_items)


@app.route('/items', methods=['POST'])
def add_item():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    global PANTRY_ITEMS, _NEXT_ID
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    expiry = data.get('expiry')
    if not name or not expiry:
        return jsonify({"error": "name and expiry are required"}), 400
    today = datetime.now().strftime("%Y-%m-%d")
    item = {
        "id": _next_id(),
        "user_id": user["user_id"],
        "name": name,
        "category": data.get('category', 'Other'),
        "expiry": expiry,
        "quantity": data.get('quantity', 1),
        "unit": data.get('unit', 'Pieces'),
        "notes": data.get('notes', ''),
        "image_url": data.get('image_url'),
        "barcode": data.get('barcode'),
        "added_date": data.get('added_date') or today,
    }
    PANTRY_ITEMS.append(item)
    _log_activity(user["user_id"], "item_added", f"Added {item['name']}", {"item_id": item["id"], "item_name": item["name"], "category": item.get("category")})
    return jsonify(item), 201


@app.route('/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    item = next((i for i in PANTRY_ITEMS if i["id"] == item_id and i.get("user_id") in scope_user_ids), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item)


@app.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    global PANTRY_ITEMS
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    item = next((i for i in PANTRY_ITEMS if i["id"] == item_id and i.get("user_id") in scope_user_ids), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    data = request.get_json() or {}
    name = (data.get("name") or item["name"]).strip()
    expiry = data.get("expiry") or item["expiry"]
    if not name or not expiry:
        return jsonify({"error": "name and expiry are required"}), 400
    item["name"] = name
    item["category"] = data.get("category", item.get("category", "Other"))
    item["expiry"] = expiry
    item["quantity"] = data.get("quantity", item.get("quantity", 1))
    item["unit"] = data.get("unit", item.get("unit", "Pieces"))
    item["notes"] = data.get("notes", item.get("notes", ""))
    item["image_url"] = data.get("image_url") if "image_url" in data else item.get("image_url")
    item["barcode"] = data.get("barcode") if "barcode" in data else item.get("barcode")
    if data.get("added_date"):
        item["added_date"] = data["added_date"]
    _log_activity(user["user_id"], "item_updated", f"Updated {item['name']}", {"item_id": item["id"], "item_name": item["name"], "category": item.get("category")})
    return jsonify(item)


@app.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    global PANTRY_ITEMS
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    for i, item in enumerate(PANTRY_ITEMS):
        if item["id"] == item_id and item.get("user_id") in scope_user_ids:
            PANTRY_ITEMS.pop(i)
            _log_activity(user["user_id"], "item_deleted", f"Deleted {item['name']}", {"item_id": item["id"], "item_name": item["name"], "category": item.get("category")})
            return jsonify({"success": True})
    return jsonify({"error": "Item not found"}), 404


@app.route('/stats')
def get_stats():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    my_items = [i for i in PANTRY_ITEMS if i.get("user_id") in scope_user_ids]
    return jsonify(_compute_stats(my_items))


@app.route('/items/<int:item_id>/consume', methods=['POST'])
def consume_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    amount = float(data.get("amount", 1) or 1)
    if amount <= 0:
        return jsonify({"error": "amount must be > 0"}), 400

    scope_user_ids = _get_scope_user_ids(user["user_id"])
    item = next((i for i in PANTRY_ITEMS if i["id"] == item_id and i.get("user_id") in scope_user_ids), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404

    previous = dict(item)
    current_qty = float(item.get("quantity", 1) or 1)
    next_qty = current_qty - amount
    removed = False
    if next_qty <= 0:
        PANTRY_ITEMS.remove(item)
        removed = True
    else:
        item["quantity"] = next_qty

    undo_token = str(uuid.uuid4())
    UNDO_ACTIONS[undo_token] = {
        "type": "consume_item",
        "created_at": datetime.utcnow().isoformat() + "Z",
        "actor_user_id": user["user_id"],
        "previous_item": previous,
        "removed": removed,
    }

    try:
        expiry_date = datetime.strptime(previous["expiry"], "%Y-%m-%d").date()
        expired = (expiry_date - datetime.now().date()).days < 0
    except Exception:
        expired = False
    if expired:
        _log_activity(user["user_id"], "item_expired_removed", f"Used expired item {previous['name']}", {"item_name": previous["name"], "category": previous.get("category")})
    else:
        _log_activity(user["user_id"], "item_consumed_before_expiry", f"Used {previous['name']} before expiry", {"item_name": previous["name"], "category": previous.get("category")})
    _log_activity(user["user_id"], "item_consumed", f"Consumed {amount:g} {previous.get('unit', '')} of {previous['name']}", {"item_id": previous["id"], "item_name": previous["name"], "amount": amount, "category": previous.get("category")})
    return jsonify({"success": True, "undo_token": undo_token, "removed": removed})


@app.route('/actions/undo', methods=['POST'])
def undo_action():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    token = data.get("undo_token")
    action = UNDO_ACTIONS.pop(token, None)
    if not action:
        return jsonify({"error": "Undo token not found or expired"}), 404
    if action.get("actor_user_id") != user["user_id"]:
        return jsonify({"error": "Forbidden"}), 403
    if action.get("type") != "consume_item":
        return jsonify({"error": "Unsupported undo action"}), 400

    prev = action["previous_item"]
    existing = next((i for i in PANTRY_ITEMS if i["id"] == prev["id"]), None)
    if existing:
        existing.update(prev)
    else:
        PANTRY_ITEMS.append(prev)
    _log_activity(user["user_id"], "undo_applied", f"Restored {prev['name']}", {"item_id": prev["id"], "item_name": prev["name"]})
    return jsonify({"success": True, "item": prev})


@app.route('/reminders', methods=['GET'])
def get_reminders():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    items = [i for i in PANTRY_ITEMS if i.get("user_id") in scope_user_ids]
    reminders = _compute_reminders(items)
    return jsonify({"success": True, **reminders})


@app.route('/activity', methods=['GET'])
def get_activity():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    events = [e for e in ACTIVITY_EVENTS if e.get("user_id") in scope_user_ids]
    events.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return jsonify(events[:50])


@app.route('/shopping-list', methods=['GET', 'POST', 'DELETE'])
def shopping_list():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    scope_user_ids = _get_scope_user_ids(user["user_id"])
    if request.method == "GET":
        items = [i for i in SHOPPING_LIST_ITEMS if i.get("owner_user_id") in scope_user_ids]
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return jsonify(items)

    if request.method == "POST":
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        if not name:
            return jsonify({"error": "name is required"}), 400
        item = {
            "id": str(uuid.uuid4()),
            "owner_user_id": user["user_id"],
            "name": name,
            "quantity": data.get("quantity") or 1,
            "checked": bool(data.get("checked", False)),
            "source": data.get("source") or "manual",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        SHOPPING_LIST_ITEMS.append(item)
        _log_activity(user["user_id"], "shopping_item_added", f"Added {name} to shopping list", {"name": name})
        return jsonify(item), 201

    item_id = request.args.get("id")
    if not item_id:
        return jsonify({"error": "id query param required"}), 400
    for i, item in enumerate(SHOPPING_LIST_ITEMS):
        if item.get("id") == item_id and item.get("owner_user_id") in scope_user_ids:
            SHOPPING_LIST_ITEMS.pop(i)
            _log_activity(user["user_id"], "shopping_item_removed", f"Removed {item.get('name')} from shopping list", {"name": item.get("name")})
            return jsonify({"success": True})
    return jsonify({"error": "Shopping item not found"}), 404


@app.route('/shopping-list/from-recipe', methods=['POST'])
def add_missing_from_recipe():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    missing = data.get("missing_ingredients") or []
    created = []
    for name in missing:
        n = (name or "").strip()
        if not n:
            continue
        item = {
            "id": str(uuid.uuid4()),
            "owner_user_id": user["user_id"],
            "name": n,
            "quantity": 1,
            "checked": False,
            "source": "recipe",
            "created_at": datetime.utcnow().isoformat() + "Z",
        }
        SHOPPING_LIST_ITEMS.append(item)
        created.append(item)
    if created:
        _log_activity(user["user_id"], "shopping_recipe_added", f"Added {len(created)} recipe items to shopping list", {"count": len(created)})
    return jsonify({"success": True, "created": created})


@app.route('/shopping-list/suggestions', methods=['GET'])
def shopping_suggestions():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(_compute_reorder_suggestions(user["user_id"]))


@app.route('/insights/weekly', methods=['GET'])
def weekly_insights():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    return jsonify(_compute_weekly_insights(user["user_id"]))


@app.route('/household', methods=['GET', 'POST'])
def household():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    if request.method == "GET":
        household_id = USER_HOUSEHOLD.get(user["user_id"])
        if not household_id:
            return jsonify({"joined": False, "household": None})
        hh = HOUSEHOLDS.get(household_id)
        if not hh:
            return jsonify({"joined": False, "household": None})
        members = []
        for uid in hh.get("members", []):
            match = next((u for u in USERS.values() if u.get("id") == uid), None)
            members.append({"user_id": uid, "email": match.get("email") if match else f"user-{uid}"})
        return jsonify({"joined": True, "household": {**hh, "members": members}})

    data = request.get_json() or {}
    name = (data.get("name") or "").strip() or "My Household"
    if USER_HOUSEHOLD.get(user["user_id"]):
        return jsonify({"error": "Already in a household"}), 409
    hid = _next_household_id()
    HOUSEHOLDS[hid] = {"id": hid, "name": name, "owner_id": user["user_id"], "members": [user["user_id"]]}
    USER_HOUSEHOLD[user["user_id"]] = hid
    USER_SHARE_MODE.setdefault(user["user_id"], False)
    _log_activity(user["user_id"], "household_created", f"Created household {name}", {"household_id": hid})
    return jsonify({"success": True, "household": HOUSEHOLDS[hid]}), 201


@app.route('/household/invite', methods=['POST'])
def household_invite():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    household_id = USER_HOUSEHOLD.get(user["user_id"])
    if not household_id:
        return jsonify({"error": "Create household first"}), 400
    code = uuid.uuid4().hex[:8].upper()
    INVITES[code] = {"household_id": household_id, "created_by": user["user_id"], "created_at": datetime.utcnow().isoformat() + "Z"}
    return jsonify({"success": True, "invite_code": code})


@app.route('/household/sharing', methods=['GET', 'PUT'])
def household_sharing():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    user_id = user["user_id"]

    if request.method == "GET":
        return jsonify({"enabled": bool(USER_SHARE_MODE.get(user_id, False))})

    data = request.get_json() or {}
    enabled = bool(data.get("enabled", False))
    USER_SHARE_MODE[user_id] = enabled
    _log_activity(
        user_id,
        "household_share_mode_updated",
        f"Shared pantry mode {'enabled' if enabled else 'disabled'}",
        {"enabled": enabled},
    )
    return jsonify({"success": True, "enabled": enabled})


@app.route('/household/accept', methods=['POST'])
def household_accept():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json() or {}
    code = (data.get("invite_code") or "").strip().upper()
    invite = INVITES.get(code)
    if not invite:
        return jsonify({"error": "Invalid invite code"}), 404
    household_id = invite["household_id"]
    hh = HOUSEHOLDS.get(household_id)
    if not hh:
        return jsonify({"error": "Household not found"}), 404
    if USER_HOUSEHOLD.get(user["user_id"]) == household_id:
        return jsonify({"success": True, "already_joined": True})
    hh["members"] = list(set(hh.get("members", []) + [user["user_id"]]))
    USER_HOUSEHOLD[user["user_id"]] = household_id
    USER_SHARE_MODE.setdefault(user["user_id"], False)
    _log_activity(user["user_id"], "household_joined", f"Joined household {hh['name']}", {"household_id": household_id})
    return jsonify({"success": True, "household": hh})


# ---------- Barcode: FatSecret (optional) + Open Food Facts (fallback) ----------
def _normalize_barcode_gtin13(barcode):
    """FatSecret expects GTIN-13. UPC-A 12 digits -> leading 0; EAN-8 -> left-pad to 13."""
    s = "".join(c for c in str(barcode) if c.isdigit())
    if len(s) == 8:
        return s.zfill(13)
    if len(s) == 12:
        return "0" + s
    if len(s) == 13:
        return s
    if len(s) == 14:
        return s[-13:]
    return s

def _fatsecret_get_token():
    """OAuth2 client_credentials token for FatSecret. Cached in process."""
    global _FATSECRET_TOKEN
    if not FATSECRET_CLIENT_ID or not FATSECRET_CLIENT_SECRET:
        return None
    if _FATSECRET_TOKEN:
        return _FATSECRET_TOKEN
    try:
        auth = base64.b64encode(
            f"{FATSECRET_CLIENT_ID}:{FATSECRET_CLIENT_SECRET}".encode()
        ).decode()
        r = requests.post(
            "https://oauth.fatsecret.com/connect/token",
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": _HTTP_USER_AGENT,
            },
            data={"grant_type": "client_credentials", "scope": "barcode"},
            timeout=10,
        )
        r.raise_for_status()
        _FATSECRET_TOKEN = r.json().get("access_token")
        return _FATSECRET_TOKEN
    except Exception:
        return None

def _lookup_barcode_fatsecret(barcode):
    """Call FatSecret food.find_id_for_barcode.v2. Returns our shape or None."""
    token = _fatsecret_get_token()
    if not token:
        return None
    gtin = _normalize_barcode_gtin13(barcode)
    if len(gtin) != 13:
        return None
    try:
        r = requests.get(
            "https://platform.fatsecret.com/rest/food/barcode/find-by-id/v2",
            headers={
                "Authorization": f"Bearer {token}",
                **OUTBOUND_REQUEST_HEADERS,
            },
            params={"barcode": gtin, "format": "json"},
            timeout=8,
        )
        if r.status_code != 200:
            return None
        data = r.json()
        food = data.get("food")
        if not food:
            return None
        name = food.get("food_name") or "Unknown"
        brand = food.get("brand_name", "").strip()
        if brand:
            name = f"{brand} {name}".strip()
        return {
            "found": True,
            "name": name,
            "category": "Other",
            "image_url": None,
            "brands": brand,
            "quantity": "",
        }
    except Exception:
        return None

def _off_category_from_product(p):
    """Map OFF categories / tags to our pantry category."""
    cat_map = {
        "dairy": "Dairy",
        "meat": "Meat",
        "vegetable": "Vegetables",
        "fruit": "Fruits",
        "bakery": "Bakery",
        "beverage": "Beverages",
        "snack": "Snacks",
        "frozen": "Frozen",
        "pantry": "Pantry",
    }
    tags = p.get("categories_tags") or []
    blob = " ".join(tags) if isinstance(tags, list) else str(tags)
    blob += " " + (p.get("categories") or "")
    low = blob.lower()
    for key, val in cat_map.items():
        if key in low:
            return val
    return "Other"


def _lookup_barcode_openfoodfacts(barcode):
    """Open Food Facts barcode lookup (API v2). Requires a non-bot User-Agent."""
    code = "".join(c for c in str(barcode) if c.isdigit())
    if not code:
        return None
    fields = (
        "product_name,product_name_en,brands,categories,categories_tags,"
        "image_url,image_front_url,quantity,code"
    )
    try:
        url = f"https://world.openfoodfacts.org/api/v2/product/{code}"
        r = requests.get(
            url,
            params={"fields": fields},
            headers=OUTBOUND_REQUEST_HEADERS,
            timeout=12,
        )
        r.raise_for_status()
        data = r.json()
        if data.get("status") != 1 or not data.get("product"):
            return None
        p = data["product"]
        product_name = (
            p.get("product_name")
            or p.get("product_name_en")
            or "Unknown"
        )
        category = _off_category_from_product(p)
        return {
            "found": True,
            "name": product_name,
            "category": category,
            "image_url": p.get("image_url") or p.get("image_front_url"),
            "brands": p.get("brands", "") or "",
            "quantity": p.get("quantity", "") or "",
        }
    except Exception:
        return None

@app.route('/barcode/<barcode>')
def lookup_barcode(barcode):
    # Try FatSecret first if configured, then Open Food Facts
    result = _lookup_barcode_fatsecret(barcode)
    if result is None:
        result = _lookup_barcode_openfoodfacts(barcode)
    if result is None:
        return jsonify({"found": False, "error": "Product not found"}), 404
    return jsonify(result)


# ---------- Recipes (advanced: dietary, time, cuisine) ----------
@app.route('/recipes/generate', methods=['POST'])
def generate_recipe():
    try:
        data = request.get_json() or {}
        items = data.get('items', [])
        dietary = data.get('dietary', '')  # e.g. vegetarian, vegan, gluten-free
        max_time_min = data.get('max_time_minutes')  # optional
        cuisine = data.get('cuisine', '')  # e.g. Italian, Asian

        today = datetime.now().date()
        expiring = []
        fresh = []
        for item in items:
            try:
                expiry_date = datetime.strptime(item["expiry"], "%Y-%m-%d").date()
            except (ValueError, KeyError):
                continue
            days = (expiry_date - today).days
            entry = {**item, "days_remaining": days}
            if days <= 3:
                expiring.append(entry)
            else:
                fresh.append(entry)
        expiring.sort(key=lambda x: x["days_remaining"])
        prioritized = expiring + fresh

        items_by_cat = {}
        for item in prioritized[:10]:
            cat = item.get("category", "Other")
            items_by_cat.setdefault(cat, []).append(item)

        recipe = generate_recipe_from_items(prioritized[:5], items_by_cat, dietary, max_time_min, cuisine)
        return jsonify({
            "success": True,
            "recipe": recipe,
            "prioritized_items": prioritized[:5],
            "expiring_count": len(expiring),
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def generate_recipe_from_items(items, items_by_category, dietary, max_time_min, cuisine):
    templates = {
        'Dairy': {'name': 'Creamy Pasta Delight', 'description': 'A rich and creamy pasta dish.', 'prep_time': '20 min', 'servings': 2},
        'Vegetables': {'name': 'Fresh Vegetable Stir-Fry', 'description': 'Quick and healthy stir-fry.', 'prep_time': '15 min', 'servings': 2},
        'Meat': {'name': 'Grilled Chicken with Vegetables', 'description': 'Tender grilled chicken with sides.', 'prep_time': '25 min', 'servings': 2},
        'Bakery': {'name': 'French Toast Breakfast', 'description': 'Classic French toast.', 'prep_time': '15 min', 'servings': 2},
        'Pantry': {'name': 'Pasta with Sauce', 'description': 'Simple pasta dish.', 'prep_time': '15 min', 'servings': 2},
    }
    best = None
    for cat in items_by_category:
        if cat in templates:
            exp = [i for i in items_by_category[cat] if i.get('days_remaining', 999) <= 3]
            if exp:
                best = cat
                break
    if not best and items_by_category:
        best = list(items_by_category.keys())[0]
    template = templates.get(best, {'name': 'Quick Pantry Meal', 'description': 'A simple meal with your ingredients.', 'prep_time': '20 min', 'servings': 2})

    instructions = [
        "Gather all the ingredients listed above.",
        "Prepare your workspace and utensils.",
        "Follow the cooking method for this recipe type.",
        "Cook until combined and heated through.",
        "Serve and enjoy!",
    ]
    ings = [{"name": i["name"], "category": i.get("category", "Other"), "quantity": i.get("quantity", 1), "days_remaining": i.get("days_remaining", 999)} for i in items[:5]]
    return {
        **template,
        "ingredients": ings,
        "instructions": instructions,
        "priority_items": [i for i in items if i.get("days_remaining", 999) <= 3],
        "dietary_note": dietary or None,
        "cuisine_note": cuisine or None,
        "max_time_minutes": max_time_min,
    }


# ---------- AI Produce Scanner (estimate with disclaimer) ----------
@app.route('/produce/scan', methods=['POST'])
def produce_scan():
    # Expect JSON with base64 image or URL; we do a mock freshness estimate
    data = request.get_json() or {}
    if not data.get('image_base64') and not data.get('image_url'):
        return jsonify({"error": "image_base64 or image_url required"}), 400
    # Mock: return a deterministic "estimate" based on image size/length for demo
    seed = len(data.get('image_base64', '') or data.get('image_url', ''))
    freshness = "good" if seed % 3 == 0 else ("fair" if seed % 3 == 1 else "use_soon")
    produce_types = ["Apple", "Banana", "Tomato", "Spinach", "Avocado"]
    detected = produce_types[seed % len(produce_types)]
    confidence = 0.72 + ((seed % 20) / 100.0)
    confidence = min(confidence, 0.95)
    risk_level = "low" if freshness == "good" else ("medium" if freshness == "fair" else "high")
    signals = [
        "surface_color_consistency",
        "texture_pattern",
        "visible_bruising_score",
    ]
    return jsonify({
        "success": True,
        "estimate": freshness,
        "message": "AI-based estimate only; may not be 100% accurate.",
        "suggestion": "Store in fridge and use within a few days." if freshness != "good" else "Product appears fresh. Use within normal shelf life.",
        "detected_produce": detected,
        "confidence": round(confidence, 2),
        "risk_level": risk_level,
        "signals": signals,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
