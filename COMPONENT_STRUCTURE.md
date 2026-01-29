# WiseBite Component Structure

This document outlines the organized component structure of the WiseBite application.

## 📁 Directory Structure

```
frontend/src/
├── components/
│   ├── dashboard/
│   │   ├── WelcomeHeader.js          # Welcome section with Add Item button
│   │   ├── WelcomeHeader.css
│   │   ├── StatsCards.js              # Statistics cards component
│   │   ├── StatsCards.css
│   │   ├── NeedsAttentionSection.js   # Items needing attention section
│   │   └── NeedsAttentionSection.css
│   ├── recipes/
│   │   ├── RecipeGenerator.js         # AI Recipe Generator component
│   │   └── RecipeGenerator.css
│   ├── AddItemModal.js                # Modal for adding new items
│   ├── AddItemModal.css
│   ├── Dashboard.js                   # Main dashboard container
│   ├── Dashboard.css
│   ├── PantryItem.js                  # Individual pantry item card
│   ├── PantryItem.css
│   ├── PantryList.js                  # List of all pantry items
│   ├── PantryList.css
│   └── TipOfTheDay.js                 # Daily tip component
│   └── TipOfTheDay.css
├── utils/
│   └── dateUtils.js                   # Date calculation utilities
├── App.js                              # Main application component
├── App.css
└── index.js                            # Application entry point
```

## 🧩 Component Breakdown

### Dashboard Components (`components/dashboard/`)

#### WelcomeHeader
- **Purpose**: Displays welcome message and Add Item button
- **Props**: `onAddItemClick` (function)
- **Features**: Responsive header with action button

#### StatsCards
- **Purpose**: Displays pantry statistics (Total, Expiring Soon, Fresh, Expired)
- **Props**: `stats` (object with counts)
- **Features**: Four-card grid layout with icons

#### NeedsAttentionSection
- **Purpose**: Shows items that need immediate attention (expiring soon/expired)
- **Props**: `items` (array), `onMarkConsumed` (function)
- **Features**: Grid of item cards, sorted by urgency

### Recipe Components (`components/recipes/`)

#### RecipeGenerator
- **Purpose**: AI-powered recipe generation based on pantry inventory
- **Props**: `items` (array), `onGenerateRecipe` (optional function)
- **Features**:
  - Prioritizes expiring items in recipe suggestions
  - Connects to backend API or uses local generation
  - Displays recipe with ingredients, instructions, and prep time
  - Highlights items that are expiring soon

### Utility Functions (`utils/`)

#### dateUtils.js
- **Functions**:
  - `getDaysRemaining(expiryDate)`: Calculates days until expiry
  - `getStatus(daysRemaining)`: Returns status object (Fresh/Expiring/Expired)
  - `formatDate(dateString)`: Formats date for display
  - `sortItemsByExpiry(items)`: Sorts items by expiry date
  - `getExpiringItems(items, threshold)`: Filters and sorts expiring items

## 🔌 Backend API Endpoints

### Recipe Generation
- **Endpoint**: `POST /recipes/generate`
- **Request Body**: `{ "items": [...] }`
- **Response**: 
  ```json
  {
    "success": true,
    "recipe": {
      "name": "...",
      "description": "...",
      "ingredients": [...],
      "instructions": [...],
      "prep_time": "...",
      "servings": 2
    },
    "prioritized_items": [...],
    "expiring_count": 3
  }
  ```

## 🎯 Key Features

### 1. Component Separation
- Each feature is in its own file
- Related components grouped in subdirectories
- Reusable utility functions extracted

### 2. AI Recipe Generator
- **Prioritization Logic**: 
  - Items expiring within 3 days are prioritized
  - Categories with expiring items are preferred
  - Recipes are generated to use expiring items first
  
- **Smart Matching**:
  - Matches recipes to available categories
  - Suggests recipes based on item combinations
  - Provides cooking instructions

### 3. Modular Architecture
- Easy to add new features
- Components are self-contained
- Clear separation of concerns

## 🚀 Future Enhancements

1. **Real AI Integration**: Connect to OpenAI API or similar for more intelligent recipe generation
2. **Recipe History**: Save and view previously generated recipes
3. **Shopping List**: Generate shopping lists for missing ingredients
4. **Nutritional Info**: Add nutritional information to recipes
5. **Recipe Sharing**: Share recipes with other users
