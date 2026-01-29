from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

# Sample pantry items with more realistic data
# Note: Some items are set to expired dates to match the design
PANTRY_ITEMS = [
    {"id": 1, "name": "Bread", "expiry": "2026-01-07", "category": "Bakery", "quantity": 1},
    {"id": 2, "name": "milk", "expiry": "2026-01-08", "category": "Dairy", "quantity": 1},
    {"id": 3, "name": "Spinach", "expiry": "2026-01-09", "category": "Vegetables", "quantity": 1},
    {"id": 4, "name": "Milk", "expiry": "2026-01-10", "category": "Dairy", "quantity": 1},
    {"id": 5, "name": "Eggs (Dozen)", "expiry": "2026-01-13", "category": "Dairy", "quantity": 1},
    {"id": 6, "name": "Pasta Sauce", "expiry": "2026-02-07", "category": "Pantry", "quantity": 2},
]

@app.route('/')
def home():
    return jsonify({
        "message": "Welcome to WiseBite API!",
        "version": "1.0.0",
        "endpoints": {
            "/items": "GET - Retrieve all pantry items",
            "/items/<id>": "GET - Retrieve a specific item",
            "/stats": "GET - Get dashboard statistics"
        }
    })

@app.route('/items')
def get_items():
    """Return all pantry items"""
    return jsonify(PANTRY_ITEMS)

@app.route('/items/<int:item_id>')
def get_item(item_id):
    """Return a specific pantry item by ID"""
    item = next((item for item in PANTRY_ITEMS if item["id"] == item_id), None)
    if item:
        return jsonify(item)
    return jsonify({"error": "Item not found"}), 404

@app.route('/stats')
def get_stats():
    """Return dashboard statistics"""
    today = datetime.now().date()
    total_items = len(PANTRY_ITEMS)
    fresh_count = 0
    expiring_soon_count = 0
    expired_count = 0
    
    for item in PANTRY_ITEMS:
        expiry_date = datetime.strptime(item["expiry"], "%Y-%m-%d").date()
        days_remaining = (expiry_date - today).days
        
        if days_remaining < 0:
            expired_count += 1
        elif days_remaining <= 3:
            expiring_soon_count += 1
        else:
            fresh_count += 1
    
    return jsonify({
        "total_items": total_items,
        "fresh": fresh_count,
        "expiring_soon": expiring_soon_count,
        "expired": expired_count
    })

@app.route('/recipes/generate', methods=['POST'])
def generate_recipe():
    """Generate AI-powered recipe based on pantry items, prioritizing expiring items"""
    try:
        data = request.get_json()
        items = data.get('items', PANTRY_ITEMS)
        
        today = datetime.now().date()
        
        # Separate items by expiry status
        expiring_items = []
        fresh_items = []
        
        for item in items:
            expiry_date = datetime.strptime(item["expiry"], "%Y-%m-%d").date()
            days_remaining = (expiry_date - today).days
            
            if days_remaining <= 3:
                expiring_items.append({
                    **item,
                    "days_remaining": days_remaining
                })
            else:
                fresh_items.append({
                    **item,
                    "days_remaining": days_remaining
                })
        
        # Sort expiring items by urgency (most urgent first)
        expiring_items.sort(key=lambda x: x["days_remaining"])
        
        # Combine: expiring items first, then fresh items
        prioritized_items = expiring_items + fresh_items
        
        # Group by category
        items_by_category = {}
        for item in prioritized_items[:10]:  # Limit to top 10 items
            category = item.get("category", "Other")
            if category not in items_by_category:
                items_by_category[category] = []
            items_by_category[category].append(item)
        
        # Generate recipe based on available items
        recipe = generate_recipe_from_items(prioritized_items[:5], items_by_category)
        
        return jsonify({
            "success": True,
            "recipe": recipe,
            "prioritized_items": prioritized_items[:5],
            "expiring_count": len(expiring_items)
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def generate_recipe_from_items(items, items_by_category):
    """Generate a recipe suggestion based on available items"""
    
    recipe_templates = {
        'Dairy': {
            'name': 'Creamy Pasta Delight',
            'description': 'A rich and creamy pasta dish that uses your dairy products before they expire',
            'prep_time': '20 min',
            'servings': 2
        },
        'Vegetables': {
            'name': 'Fresh Vegetable Stir-Fry',
            'description': 'Quick and healthy stir-fry using your fresh vegetables',
            'prep_time': '15 min',
            'servings': 2
        },
        'Meat': {
            'name': 'Grilled Chicken with Vegetables',
            'description': 'Tender grilled chicken paired with fresh vegetables',
            'prep_time': '25 min',
            'servings': 2
        },
        'Bakery': {
            'name': 'French Toast Breakfast',
            'description': 'Classic French toast using bread and eggs',
            'prep_time': '15 min',
            'servings': 2
        },
        'Pantry': {
            'name': 'Pasta with Sauce',
            'description': 'Simple and satisfying pasta dish',
            'prep_time': '15 min',
            'servings': 2
        }
    }
    
    # Find the best matching recipe based on categories with expiring items
    best_category = None
    for category in items_by_category.keys():
        if category in recipe_templates:
            # Check if this category has expiring items
            expiring_in_category = [item for item in items_by_category[category] 
                                  if item.get('days_remaining', 999) <= 3]
            if expiring_in_category:
                best_category = category
                break
    
    # Fallback to first available category
    if not best_category and items_by_category:
        best_category = list(items_by_category.keys())[0]
    
    # Default recipe
    if not best_category or best_category not in recipe_templates:
        recipe_template = {
            'name': 'Quick Pantry Meal',
            'description': 'A simple meal using your available ingredients',
            'prep_time': '20 min',
            'servings': 2
        }
    else:
        recipe_template = recipe_templates[best_category]
    
    # Generate instructions
    instructions = [
        "Gather all the ingredients listed above",
        "Prepare your cooking workspace and necessary utensils",
        "Follow the cooking method for this recipe type",
        "Cook until all ingredients are properly combined and heated",
        "Serve immediately while hot and enjoy your meal!"
    ]
    
    return {
        **recipe_template,
        'ingredients': [{
            'name': item['name'],
            'category': item.get('category', 'Other'),
            'quantity': item.get('quantity', 1),
            'days_remaining': item.get('days_remaining', 999)
        } for item in items[:5]],
        'instructions': instructions,
        'priority_items': [item for item in items if item.get('days_remaining', 999) <= 3]
    }

if __name__ == '__main__':
    app.run(debug=True, port=5000)
