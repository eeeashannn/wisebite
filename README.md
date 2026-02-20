# WiseBite: A Smart Food Inventory and Waste Reduction Platform

## 🔹 Project Overview

WiseBite is a smart food inventory and waste-reduction application designed to help individuals manage their pantry items efficiently and reduce household food waste. The system allows users to record food items along with their expiry dates and provides intelligent tracking, prioritisation, and alerts based on time-to-expiry.

## 🔹 Features

- **User Dashboard**: Summary of total pantry items with counts of fresh, expiring soon, and expired items
- **Pantry Inventory Management**: View all items with expiry dates and color-coded status indicators
- **Intelligent Expiry Tracking**: Automatic calculation of days remaining until expiry
- **Visual Prioritisation**: Items automatically sorted by expiry date with color-coded indicators
- **Error Handling**: Graceful error handling with loading states and user-friendly messages
- **Modular Architecture**: Clean separation of concerns with reusable React components

## 🔹 Technologies

### Backend
- Python 3
- Flask
- Flask-CORS
- RESTful API design

### Frontend
- React (Create React App)
- JavaScript (ES6+)
- CSS with modern styling
- Component-based UI architecture

## 🔹 Setup Instructions

### Prerequisites
- Python 3.7 or higher
- Node.js 14 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the Flask server:
```bash
python app.py
```

The backend will be available at `http://127.0.0.1:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## 🔹 API Endpoints

- `GET /` - API information and available endpoints
- `GET /items` - Retrieve all pantry items
- `GET /items/<id>` - Retrieve a specific item by ID
- `POST /items` - Add a pantry item
- `DELETE /items/<id>` - Delete a pantry item
- `GET /stats` - Get dashboard statistics (total, fresh, expiring soon, expired)
- `GET /barcode/<code>` - Look up product by barcode (see Barcode lookup below)

### Barcode lookup

The app resolves barcodes using two sources:

1. **FatSecret Platform API** (optional, recommended): Nutrition-focused food database with high barcode match rate. Requires a free API key from [FatSecret Platform](https://platform.fatsecret.com). Set these environment variables before starting the backend:
   - `FATSECRET_CLIENT_ID` – your FatSecret OAuth2 Client ID  
   - `FATSECRET_CLIENT_SECRET` – your FatSecret OAuth2 Client Secret  
   If both are set, barcode lookups use FatSecret first.

2. **Open Food Facts** (fallback): Free, no API key. Used when FatSecret is not configured or when FatSecret does not find the product (e.g. error 211). Provides product name, category, and image.

The Scan page uses the device camera (via the `html5-qrcode` library) to scan barcodes, or you can enter the barcode number manually.

## 🔹 Project Structure

```
exs415/
├── backend/
│   ├── app.py              # Flask application
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── Dashboard.js
│   │   │   ├── PantryItem.js
│   │   │   └── PantryList.js
│   │   ├── App.js          # Main application component
│   │   └── index.js        # Entry point
│   └── package.json        # Node dependencies
└── README.md
```

## 🔹 Usage

1. Start the backend server first (see Backend Setup)
2. Start the frontend development server (see Frontend Setup)
3. Open your browser to `http://localhost:3000`
4. Navigate between the Dashboard and Pantry views using the navigation bar

## 🔹 Future Enhancements

- Barcode scanning integration
- OCR-based extraction of expiry dates from packaging
- Mobile application support
- User accounts and authentication
- Notifications and reminders
- Analytics on food waste reduction
- Item creation, deletion, and update functionality

## 🔹 Development Notes

- The backend uses CORS to allow cross-origin requests from the frontend
- Items are currently stored in memory (sample data)
- The frontend automatically sorts items by expiry date
- Status indicators: Green (Fresh), Orange (Expiring Soon), Red (Expired) 