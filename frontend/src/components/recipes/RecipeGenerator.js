import React, { useState } from 'react';
import { getDaysRemaining, getExpiringItems } from '../../utils/dateUtils';
import './RecipeGenerator.css';

const RECIPE_TEMPLATES = {
  'Dairy': [
    { name: 'Creamy Pasta', ingredients: ['milk', 'cheese', 'pasta'], description: 'A rich and creamy pasta dish using dairy products' },
    { name: 'Scrambled Eggs', ingredients: ['eggs', 'milk', 'cheese'], description: 'Fluffy scrambled eggs with cheese' },
    { name: 'Yogurt Parfait', ingredients: ['yogurt', 'fruits'], description: 'Healthy yogurt parfait with fresh fruits' },
  ],
  'Vegetables': [
    { name: 'Stir-Fry', ingredients: ['vegetables', 'spinach', 'tomatoes'], description: 'Quick and healthy vegetable stir-fry' },
    { name: 'Fresh Salad', ingredients: ['spinach', 'tomatoes', 'vegetables'], description: 'Crisp and refreshing salad' },
    { name: 'Roasted Vegetables', ingredients: ['vegetables', 'tomatoes'], description: 'Oven-roasted vegetables with herbs' },
  ],
  'Meat': [
    { name: 'Grilled Chicken', ingredients: ['chicken', 'vegetables'], description: 'Tender grilled chicken with sides' },
    { name: 'Chicken Stir-Fry', ingredients: ['chicken', 'vegetables'], description: 'Quick chicken and vegetable stir-fry' },
  ],
  'Bakery': [
    { name: 'French Toast', ingredients: ['bread', 'eggs', 'milk'], description: 'Classic French toast for breakfast' },
    { name: 'Bread Pudding', ingredients: ['bread', 'milk', 'eggs'], description: 'Warm and comforting bread pudding' },
  ],
  'Pantry': [
    { name: 'Pasta with Sauce', ingredients: ['pasta', 'pasta sauce', 'cheese'], description: 'Simple pasta dish with sauce' },
  ],
  'default': [
    { name: 'Quick Meal', ingredients: [], description: 'A simple meal using available ingredients' },
  ]
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function RecipeGenerator({ items, onGenerateRecipe }) {
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [useBackend, setUseBackend] = useState(true);

  const generateRecipe = async () => {
    if (!items || items.length === 0) {
      alert('No items in pantry to generate recipes from!');
      return;
    }

    setLoading(true);
    setRecipe(null);

    try {
      let generatedRecipe;

      if (useBackend) {
        // Try to use backend API
        try {
          const response = await fetch(`${API_BASE_URL}/recipes/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ items }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              generatedRecipe = {
                name: data.recipe.name,
                description: data.recipe.description,
                ingredients: data.recipe.ingredients.map(ing => ({
                  name: ing.name,
                  category: ing.category,
                  daysRemaining: ing.days_remaining,
                  quantity: ing.quantity || 1
                })),
                instructions: data.recipe.instructions,
                priorityItems: data.recipe.priority_items || [],
                prepTime: data.recipe.prep_time,
                servings: data.recipe.servings
              };
            } else {
              throw new Error(data.error || 'Failed to generate recipe');
            }
          } else {
            throw new Error('Backend API unavailable, using local generation');
          }
        } catch (apiError) {
          console.warn('Backend API error, falling back to local generation:', apiError);
          // Fall back to local generation
          generatedRecipe = generateRecipeLocally();
        }
      } else {
        generatedRecipe = generateRecipeLocally();
      }

      setRecipe(generatedRecipe);
      if (onGenerateRecipe) {
        onGenerateRecipe(generatedRecipe);
      }
    } catch (error) {
      console.error('Error generating recipe:', error);
      alert('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateRecipeLocally = () => {
    // Prioritize expiring items
    const expiringItems = getExpiringItems(items, 3);
    const allItems = [...expiringItems, ...items.filter(item => 
      !expiringItems.some(exp => exp.id === item.id)
    )];

    // Group items by category
    const itemsByCategory = {};
    allItems.forEach(item => {
      const category = item.category || 'Other';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      itemsByCategory[category].push(item);
    });

    // Find matching recipe templates
    let selectedRecipe = null;
    const categories = Object.keys(itemsByCategory).sort((a, b) => {
      // Prioritize categories with expiring items
      const aExpiring = itemsByCategory[a].filter(item => getDaysRemaining(item.expiry) <= 3).length;
      const bExpiring = itemsByCategory[b].filter(item => getDaysRemaining(item.expiry) <= 3).length;
      return bExpiring - aExpiring;
    });

    for (const category of categories) {
      const templates = RECIPE_TEMPLATES[category] || RECIPE_TEMPLATES['default'];
      if (templates && templates.length > 0) {
        selectedRecipe = templates[0];
        break;
      }
    }

    if (!selectedRecipe) {
      selectedRecipe = RECIPE_TEMPLATES['default'][0];
    }

    // Build recipe with actual items
    const recipeItems = allItems.slice(0, 5).map(item => ({
      name: item.name,
      category: item.category,
      daysRemaining: getDaysRemaining(item.expiry),
      quantity: item.quantity || 1
    }));

    return {
      name: selectedRecipe.name,
      description: selectedRecipe.description,
      ingredients: recipeItems,
      instructions: generateInstructions(selectedRecipe.name, recipeItems),
      priorityItems: recipeItems.filter(item => item.daysRemaining <= 3),
      prepTime: '15-20 min',
      servings: 2
    };
  };

  const generateInstructions = (recipeName, ingredients) => {
    const baseInstructions = [
      'Gather all ingredients and prepare your workspace',
      'Follow the recipe steps carefully',
      'Cook until ingredients are properly combined',
      'Serve hot and enjoy!'
    ];

    if (recipeName.toLowerCase().includes('pasta')) {
      return [
        'Boil water in a large pot and cook pasta according to package instructions',
        'While pasta cooks, heat sauce in a separate pan',
        'Drain pasta and combine with sauce',
        'Add cheese and seasonings, then serve immediately'
      ];
    } else if (recipeName.toLowerCase().includes('stir-fry')) {
      return [
        'Heat oil in a large wok or pan over high heat',
        'Add meat (if using) and cook until browned',
        'Add vegetables and stir-fry for 3-5 minutes',
        'Season with soy sauce and serve over rice or noodles'
      ];
    } else if (recipeName.toLowerCase().includes('salad')) {
      return [
        'Wash and chop all vegetables',
        'Combine in a large bowl',
        'Add dressing and toss gently',
        'Serve immediately for best freshness'
      ];
    }

    return baseInstructions;
  };

  return (
    <div className="recipe-generator">
      <div className="recipe-generator-header">
        <h2 className="recipe-title">🍳 AI Recipe Generator</h2>
        <p className="recipe-subtitle">
          Get personalized recipes using your pantry items, prioritizing expiring items first!
        </p>
      </div>

      <button 
        className="generate-recipe-btn" 
        onClick={generateRecipe}
        disabled={loading || !items || items.length === 0}
      >
        {loading ? (
          <>
            <span className="spinner">⏳</span>
            <span>Generating Recipe...</span>
          </>
        ) : (
          <>
            <span>✨</span>
            <span>Generate Recipe</span>
          </>
        )}
      </button>

      {recipe && (
        <div className="recipe-card">
          <div className="recipe-card-header">
            <h3 className="recipe-name">{recipe.name}</h3>
            <div className="recipe-meta">
              <span>⏱️ {recipe.prepTime}</span>
              <span>👥 {recipe.servings} servings</span>
            </div>
          </div>

          <p className="recipe-description">{recipe.description}</p>

          {recipe.priorityItems.length > 0 && (
            <div className="priority-alert">
              <span className="alert-icon">⚠️</span>
              <span>This recipe uses {recipe.priorityItems.length} item(s) expiring soon!</span>
            </div>
          )}

          <div className="recipe-section">
            <h4 className="section-title">Ingredients:</h4>
            <ul className="ingredients-list">
              {recipe.ingredients.map((ingredient, index) => {
                const isExpiring = ingredient.daysRemaining <= 3;
                return (
                  <li key={index} className={isExpiring ? 'expiring-ingredient' : ''}>
                    <span className="ingredient-name">{ingredient.name}</span>
                    {isExpiring && (
                      <span className="expiry-badge">
                        {ingredient.daysRemaining < 0 
                          ? `Expired ${Math.abs(ingredient.daysRemaining)}d ago`
                          : `Expires in ${ingredient.daysRemaining}d`
                        }
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="recipe-section">
            <h4 className="section-title">Instructions:</h4>
            <ol className="instructions-list">
              {recipe.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeGenerator;
