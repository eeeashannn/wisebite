import React from 'react';
import { getDaysRemaining, getStatus } from '../utils/dateUtils';
import './PantryItem.css';

function PantryItem({ item, onMarkConsumed, showMarkConsumed = false }) {

  const getItemImage = (itemName) => {
    // Map item names to emoji/images
    const imageMap = {
      'milk': '🥛',
      'Milk': '🥛',
      'Bread': '🍞',
      'bread': '🍞',
      'Eggs': '🥚',
      'eggs': '🥚',
      'Eggs (Dozen)': '🥚',
      'Spinach': '🥬',
      'spinach': '🥬',
      'Chicken': '🍗',
      'chicken': '🍗',
      'Chicken Breast': '🍗',
      'Pasta': '🍝',
      'pasta': '🍝',
      'Pasta Sauce': '🍝',
      'Yogurt': '🥛',
      'yogurt': '🥛',
      'Tomatoes': '🍅',
      'tomatoes': '🍅',
      'Cheese': '🧀',
      'cheese': '🧀',
    };
    
    // Try exact match first, then case-insensitive, then partial match
    if (imageMap[itemName]) return imageMap[itemName];
    if (imageMap[itemName.toLowerCase()]) return imageMap[itemName.toLowerCase()];
    
    // Try partial matches
    const lowerName = itemName.toLowerCase();
    for (const [key, emoji] of Object.entries(imageMap)) {
      if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
        return emoji;
      }
    }
    
    return itemName.charAt(0).toUpperCase();
  };

  const daysRemaining = getDaysRemaining(item.expiry);
  const status = getStatus(daysRemaining);
  const quantity = item.quantity || 1;
  const category = item.category || 'Pantry';

  const handleMarkConsumed = () => {
    if (onMarkConsumed) {
      onMarkConsumed(item.id);
    }
  };

  return (
    <div className="pantry-item-card">
      <div className="status-badge-top">
        <span className={`status-badge ${status.className}`}>
          <span className="status-icon">{status.icon}</span>
          <span>{status.label}</span>
        </span>
      </div>
      
      <div className="item-content">
        <div className="item-image">
          <span className="item-image-placeholder">{getItemImage(item.name)}</span>
        </div>
        
        <div className="item-info">
          <h3 className="item-name">{item.name}</h3>
          <p className="item-meta">
            {quantity} {quantity === 1 ? 'unit' : 'units'} • {category}
          </p>
          <p className="item-expiry">
            {daysRemaining < 0 ? (
              <span className="expiry-text expired">
                Expires {Math.abs(daysRemaining)} day{Math.abs(daysRemaining) !== 1 ? 's' : ''} ago
              </span>
            ) : daysRemaining === 0 ? (
              <span className="expiry-text expiring">Expires today!</span>
            ) : (
              <span className="expiry-text fresh">
                Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {showMarkConsumed && (
        <button className="mark-consumed-btn" onClick={handleMarkConsumed}>
          Mark Consumed
        </button>
      )}
    </div>
  );
}

export default PantryItem;
