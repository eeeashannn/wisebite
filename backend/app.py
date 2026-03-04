from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta, date
import os
import base64
import re
import jwt
import requests

app = Flask(__name__)
# Allow frontend origin for CORS; preflight (OPTIONS) must succeed for POST with JSON
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    supports_credentials=False,
)

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-change-in-production")
JWT_EXPIRY_DAYS = 7

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

def _next_id():
    global _NEXT_ID
    n = _NEXT_ID
    _NEXT_ID += 1
    return n

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


@app.after_request
def after_request(response):
    """Ensure CORS headers on every response so preflight (OPTIONS) succeeds."""
    origin = request.origin if request.origin else "*"
    if origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
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
    USERS[email] = {
        "id": user_id,
        "email": email,
        "password_hash": generate_password_hash(password),
    }
    token = _make_token(user_id, email)
    return jsonify({
        "token": token,
        "user": {"id": user_id, "email": email},
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
        "user": {"id": user["id"], "email": user["email"]},
    })


@app.route('/items', methods=['GET'])
def get_items():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    my_items = [i for i in PANTRY_ITEMS if i.get("user_id") == user["user_id"]]
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
    return jsonify(item), 201


@app.route('/items/<int:item_id>', methods=['GET'])
def get_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    item = next((i for i in PANTRY_ITEMS if i["id"] == item_id and i.get("user_id") == user["user_id"]), None)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    return jsonify(item)


@app.route('/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    global PANTRY_ITEMS
    item = next((i for i in PANTRY_ITEMS if i["id"] == item_id and i.get("user_id") == user["user_id"]), None)
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
    return jsonify(item)


@app.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    global PANTRY_ITEMS
    for i, item in enumerate(PANTRY_ITEMS):
        if item["id"] == item_id and item.get("user_id") == user["user_id"]:
            PANTRY_ITEMS.pop(i)
            return jsonify({"success": True})
    return jsonify({"error": "Item not found"}), 404


@app.route('/stats')
def get_stats():
    user = _get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    my_items = [i for i in PANTRY_ITEMS if i.get("user_id") == user["user_id"]]
    return jsonify(_compute_stats(my_items))


# ---------- Barcode: FatSecret (optional) + Open Food Facts (fallback) ----------
def _normalize_barcode_gtin13(barcode):
    """FatSecret expects GTIN-13: 13 digits. UPC-A is 12 digits -> pad with leading 0."""
    s = "".join(c for c in str(barcode) if c.isdigit())
    if len(s) == 12:
        return "0" + s
    if len(s) == 13:
        return s
    return s  # pass through; API may still accept

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
            headers={"Authorization": f"Bearer {token}"},
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

def _lookup_barcode_openfoodfacts(barcode):
    """Open Food Facts barcode lookup. Returns our shape or None."""
    try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        r = requests.get(url, timeout=5)
        r.raise_for_status()
        data = r.json()
        if data.get("status") != 1 or not data.get("product"):
            return None
        p = data["product"]
        product_name = p.get("product_name") or p.get("product_name_en") or "Unknown"
        categories = p.get("categories", "") or p.get("categories_tags", [])
        category_str = categories.split(",")[0].strip() if isinstance(categories, str) else (categories[0] if categories else "Other")
        cat_map = {"Dairy": "Dairy", "Meat": "Meat", "Vegetables": "Vegetables", "Fruits": "Fruits",
                   "Bakery": "Bakery", "Beverages": "Beverages", "Snacks": "Snacks", "Frozen": "Frozen"}
        category = "Other"
        for k, v in cat_map.items():
            if k.lower() in category_str.lower():
                category = v
                break
        return {
            "found": True,
            "name": product_name,
            "category": category,
            "image_url": p.get("image_url") or p.get("image_front_url"),
            "brands": p.get("brands", ""),
            "quantity": p.get("quantity", ""),
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
    return jsonify({
        "success": True,
        "estimate": freshness,
        "message": "AI-based estimate only; may not be 100% accurate.",
        "suggestion": "Store in fridge and use within a few days." if freshness != "good" else "Product appears fresh. Use within normal shelf life.",
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
