import React, { useState } from 'react';
import { getDaysRemaining, getExpiringItems } from '../../utils/dateUtils';
import { IconChefHat, IconWarning, IconTimer, IconUsers } from '../Icons';
import './RecipeGenerator.css';

import { getApiBaseUrl } from '../../config';

const DIETARY_OPTIONS = ['Any', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free'];
const CUISINE_OPTIONS = ['Any', 'Italian', 'Asian', 'Mexican', 'Indian', 'Mediterranean', 'British'];
const TIME_OPTIONS = [
  { label: 'Any', value: null },
  { label: 'Under 15 min', value: 15 },
  { label: 'Under 30 min', value: 30 },
  { label: 'Under 45 min', value: 45 },
  { label: 'Under 60 min', value: 60 },
];

const RECIPE_TEMPLATES = {
  Dairy: [
    { name: 'Creamy Pasta', ingredients: ['milk', 'cheese', 'pasta'], description: 'A rich and creamy pasta dish using dairy products', missing: ['pasta', 'olive oil'] },
    { name: 'Scrambled Eggs', ingredients: ['eggs', 'milk', 'cheese'], description: 'Fluffy scrambled eggs with cheese', missing: ['butter'] },
  ],
  Vegetables: [
    { name: 'Stir-Fry', ingredients: ['vegetables', 'spinach', 'tomatoes'], description: 'Quick and healthy vegetable stir-fry', missing: ['soy sauce', 'rice'] },
    { name: 'Fresh Salad', ingredients: ['spinach', 'tomatoes'], description: 'Crisp and refreshing salad', missing: ['olive oil', 'lemon'] },
  ],
  Meat: [
    { name: 'Grilled Chicken', ingredients: ['chicken', 'vegetables'], description: 'Tender grilled chicken with sides', missing: ['olive oil', 'herbs'] },
  ],
  Bakery: [
    { name: 'French Toast', ingredients: ['bread', 'eggs', 'milk'], description: 'Classic French toast for breakfast', missing: ['butter', 'maple syrup'] },
  ],
  Pantry: [
    { name: 'Pasta with Sauce', ingredients: ['pasta', 'pasta sauce', 'cheese'], description: 'Simple pasta dish with sauce', missing: ['pasta', 'basil'] },
  ],
  default: [
    { name: 'Quick Meal', ingredients: [], description: 'A simple meal using available ingredients', missing: [] },
  ],
};

const DELIVEROO_BASE = 'https://deliveroo.co.uk/search?q=';
const UBER_EATS_BASE = 'https://www.ubereats.com/gb/search?q=';

function RecipeGenerator({ items, authToken, onGenerateRecipe, onUseRecipeIngredients, onRecipeMissingAdded }) {
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [dietary, setDietary] = useState('Any');
  const [cuisine, setCuisine] = useState('Any');
  const [maxTime, setMaxTime] = useState(null);
  const [useRecipeLoading, setUseRecipeLoading] = useState(false);
  const [shoppingLoading, setShoppingLoading] = useState(false);

  const buildBody = () => {
    const body = { items };
    if (dietary && dietary !== 'Any') body.dietary = dietary;
    if (cuisine && cuisine !== 'Any') body.cuisine = cuisine;
    if (maxTime != null) body.max_time_minutes = maxTime;
    return body;
  };

  const generateRecipe = async () => {
    if (!items || items.length === 0) {
      alert('No items in pantry to generate recipes from!');
      return;
    }
    setLoading(true);
    setRecipe(null);
    try {
      let generatedRecipe;
      try {
        const response = await fetch(`${getApiBaseUrl()}/recipes/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildBody()),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const r = data.recipe;
            generatedRecipe = {
              name: r.name,
              description: r.description,
              ingredients: (r.ingredients || []).map(ing => ({
                name: ing.name,
                category: ing.category,
                daysRemaining: ing.days_remaining ?? 999,
                quantity: ing.quantity || 1,
              })),
              instructions: r.instructions || [],
              priorityItems: r.priority_items || [],
              prepTime: r.prep_time,
              servings: r.servings,
              dietaryNote: r.dietary_note,
              cuisineNote: r.cuisine_note,
              missingIngredients: [],
            };
          } else throw new Error(data.error);
        } else throw new Error('API error');
      } catch (apiErr) {
        generatedRecipe = generateRecipeLocally();
      }
      const pantryNames = (items || []).map(i => (i.name || '').toLowerCase());
      const selected = RECIPE_TEMPLATES[Object.keys(RECIPE_TEMPLATES).find(cat => 
        (generatedRecipe.ingredients || []).some(ing => (ing.category || '').includes(cat))
      )]?.[0] || RECIPE_TEMPLATES.default[0];
      const missing = (selected.missing || []).filter(m => !pantryNames.some(p => p.includes(m) || m.includes(p)));
      generatedRecipe.missingIngredients = missing;
      setRecipe(generatedRecipe);
      if (onGenerateRecipe) onGenerateRecipe(generatedRecipe);
    } catch (err) {
      console.error(err);
      alert('Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyRecipeToPantry = async () => {
    if (!recipe || !onUseRecipeIngredients) return;
    setUseRecipeLoading(true);
    try {
      await onUseRecipeIngredients(recipe);
    } finally {
      setUseRecipeLoading(false);
    }
  };

  const addMissingToShoppingList = async () => {
    if (!recipe?.missingIngredients?.length || !authToken) return;
    setShoppingLoading(true);
    try {
      await fetch(`${getApiBaseUrl()}/shopping-list/from-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ missing_ingredients: recipe.missingIngredients }),
      });
      onRecipeMissingAdded?.();
    } catch (err) {
      console.error(err);
    } finally {
      setShoppingLoading(false);
    }
  };

  const generateRecipeLocally = () => {
    const expiringItems = getExpiringItems(items, 3);
    const allItems = [...expiringItems, ...items.filter(item => !expiringItems.some(exp => exp.id === item.id))];
    const itemsByCategory = {};
    allItems.forEach(item => {
      const category = item.category || 'Other';
      if (!itemsByCategory[category]) itemsByCategory[category] = [];
      itemsByCategory[category].push(item);
    });
    let selectedRecipe = null;
    const categories = Object.keys(itemsByCategory).sort((a, b) => {
      const ae = itemsByCategory[a].filter(item => getDaysRemaining(item.expiry) <= 3).length;
      const be = itemsByCategory[b].filter(item => getDaysRemaining(item.expiry) <= 3).length;
      return be - ae;
    });
    for (const category of categories) {
      const templates = RECIPE_TEMPLATES[category] || RECIPE_TEMPLATES.default;
      if (templates?.length) {
        selectedRecipe = templates[0];
        break;
      }
    }
    if (!selectedRecipe) selectedRecipe = RECIPE_TEMPLATES.default[0];
    const recipeItems = allItems.slice(0, 5).map(item => ({
      name: item.name,
      category: item.category,
      daysRemaining: getDaysRemaining(item.expiry),
      quantity: item.quantity || 1,
    }));
    return {
      name: selectedRecipe.name,
      description: selectedRecipe.description,
      ingredients: recipeItems,
      instructions: selectedRecipe.name.toLowerCase().includes('pasta') ? [
        'Boil water and cook pasta according to package.',
        'Heat sauce in a pan, then combine with drained pasta.',
        'Add cheese and seasonings, serve.',
      ] : selectedRecipe.name.toLowerCase().includes('stir-fry') ? [
        'Heat oil in a wok. Add vegetables and stir-fry 3–5 min.',
        'Season with soy sauce. Serve over rice or noodles.',
      ] : [
        'Gather ingredients and prepare workspace.',
        'Follow the recipe steps, then serve and enjoy.',
      ],
      priorityItems: recipeItems.filter(i => i.daysRemaining <= 3),
      prepTime: maxTime ? `Under ${maxTime} min` : '15-20 min',
      servings: 2,
      missingIngredients: selectedRecipe.missing || [],
    };
  };

  return (
    <div className="recipe-generator">
      <div className="recipe-generator-header">
        <h2 className="recipe-title">AI Recipe Generator</h2>
        <p className="recipe-subtitle">
          Context-aware recipes from your pantry: expiry priority, dietary preferences, cooking time, and cuisine.
        </p>
      </div>

      <div className="recipe-preferences-section">
        <h3 className="recipe-preferences-title">Recipe Preferences</h3>
        <div className="recipe-filters">
          <div className="filter-group">
            <label>Dietary Preference</label>
            <select value={dietary} onChange={(e) => setDietary(e.target.value)}>
              {DIETARY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Cuisine Type</label>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              {CUISINE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Max time</label>
            <select value={maxTime ?? ''} onChange={(e) => setMaxTime(e.target.value ? parseInt(e.target.value, 10) : null)}>
              {TIME_OPTIONS.map(opt => <option key={opt.label} value={opt.value ?? ''}>{opt.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button
        className="generate-recipe-btn"
        onClick={generateRecipe}
        disabled={loading || !items || items.length === 0}
      >
        {loading ? <><span className="spinner" /> Generating...</> : <><span className="generate-btn-icon"><IconChefHat size={22} /></span> Generate Recipes</>}
      </button>

      {recipe && (
        <div className="recipe-card">
          <div className="recipe-card-header">
            <h3 className="recipe-name">{recipe.name}</h3>
            <div className="recipe-meta">
              <span><IconTimer size={16} /> {recipe.prepTime}</span>
              <span><IconUsers size={16} /> {recipe.servings} servings</span>
              {recipe.dietaryNote && <span>{recipe.dietaryNote}</span>}
              {recipe.cuisineNote && <span>{recipe.cuisineNote}</span>}
            </div>
          </div>
          <p className="recipe-description">{recipe.description}</p>
          {recipe.priorityItems?.length > 0 && (
            <div className="priority-alert">
              <span className="alert-icon"><IconWarning size={18} /></span>
              This recipe uses {recipe.priorityItems.length} item(s) expiring soon!
            </div>
          )}
          <div className="recipe-section">
            <h4 className="section-title">Ingredients</h4>
            <ul className="ingredients-list">
              {(recipe.ingredients || []).map((ingredient, index) => {
                const isExpiring = ingredient.daysRemaining <= 3;
                return (
                  <li key={index} className={isExpiring ? 'expiring-ingredient' : ''}>
                    <span className="ingredient-name">{ingredient.name}</span>
                    {isExpiring && (
                      <span className="expiry-badge">
                        {ingredient.daysRemaining < 0 ? `Expired ${Math.abs(ingredient.daysRemaining)}d ago` : `Expires in ${ingredient.daysRemaining}d`}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
          {recipe.missingIngredients?.length > 0 && (
            <div className="recipe-section missing-section">
              <h4 className="section-title">Missing ingredients – order online</h4>
              <p className="missing-intro">Get these delivered:</p>
              <ul className="missing-list">
                {recipe.missingIngredients.map((name, i) => (
                  <li key={i}>{name}</li>
                ))}
              </ul>
              <div className="delivery-links">
                <button
                  type="button"
                  className="delivery-btn add-shopping"
                  onClick={addMissingToShoppingList}
                  disabled={shoppingLoading}
                >
                  {shoppingLoading ? "Adding..." : "Add missing to shopping list"}
                </button>
                <a href={`${DELIVEROO_BASE}${encodeURIComponent(recipe.name + ' ingredients')}`} target="_blank" rel="noopener noreferrer" className="delivery-btn deliveroo">
                  Order via Deliveroo
                </a>
                <a href={`${UBER_EATS_BASE}${encodeURIComponent(recipe.name + ' ingredients')}`} target="_blank" rel="noopener noreferrer" className="delivery-btn ubereats">
                  Order via Uber Eats
                </a>
              </div>
            </div>
          )}
          <div className="recipe-section">
            <h4 className="section-title">Instructions</h4>
            <ol className="instructions-list">
              {(recipe.instructions || []).map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>
          <button
            type="button"
            className="use-recipe-btn"
            onClick={applyRecipeToPantry}
            disabled={useRecipeLoading || !onUseRecipeIngredients}
          >
            {useRecipeLoading ? 'Updating pantry…' : 'Cooked this - use ingredients'}
          </button>
        </div>
      )}
    </div>
  );
}

export default RecipeGenerator;
