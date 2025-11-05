from flask import Flask
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "Welcome to Pantry Backend!"

@app.route('/items')
def get_items():
    items = [
        {"name": "Milk", "expiry": "2025-11-10"},
        {"name": "Eggs", "expiry": "2025-11-15"},
        {"name": "Bread", "expiry": "2025-11-08"}
    ]
    return jsonify(items)

if __name__ == '__main__':
    app.run(debug=True)
