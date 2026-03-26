import React from 'react';
import { getDaysRemaining, getExpiringItems } from '../utils/dateUtils';
import RecipeGenerator from './recipes/RecipeGenerator';
import './RecipesPage.css';

function RecipesPage({ items, authToken, onUseRecipeIngredients, onRecipeMissingAdded }) {
  const priorityItems = getExpiringItems(items || [], 7);

  return (
    <div className="recipes-page">
      <h1 className="recipes-page-title">Advanced Recipe Generator</h1>
      <p className="recipes-page-subtitle">Get detailed recipes based on your pantry items and preferences.</p>

      {priorityItems.length > 0 && (
        <div className="priority-ingredients-box">
          <h3 className="priority-ingredients-title">Priority Ingredients (Use Soon)</h3>
          <div className="priority-tags">
            {priorityItems.slice(0, 8).map((item) => {
              const days = getDaysRemaining(item.expiry);
              const label = days < 0 ? `${item.name} (${days} days)` : `${item.name} (${days} days)`;
              return (
                <span key={item.id} className="priority-tag">
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <RecipeGenerator
        items={items || []}
        authToken={authToken}
        onUseRecipeIngredients={onUseRecipeIngredients}
        onRecipeMissingAdded={onRecipeMissingAdded}
      />
    </div>
  );
}

export default RecipesPage;
