import React from 'react';
import PantryItem from './PantryItem';
import AddItemModal from './AddItemModal';
import './PantryList.css';

function PantryList({ items, loading, error, onMarkConsumed, onAddItemClick, isModalOpen, onCloseModal, onAddItem }) {
  if (loading) {
    return (
      <div className="pantry-list">
        <div className="loading">Loading pantry items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pantry-list">
        <div className="error">
          <h2>⚠️ Unable to load pantry items</h2>
          <p>{error}</p>
          <p className="error-hint">
            Make sure the backend server is running on http://127.0.0.1:5000
          </p>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="pantry-list">
        <div className="empty-state">
          <h2>Your pantry is empty</h2>
          <p>Start adding items to track their expiry dates and reduce food waste!</p>
        </div>
      </div>
    );
  }

  // Sort items by expiry date (expired first, then by days remaining)
  const sortedItems = [...items].sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateA = new Date(a.expiry);
    dateA.setHours(0, 0, 0, 0);
    const dateB = new Date(b.expiry);
    dateB.setHours(0, 0, 0, 0);
    
    const daysA = Math.ceil((dateA - today) / (1000 * 60 * 60 * 24));
    const daysB = Math.ceil((dateB - today) / (1000 * 60 * 60 * 24));
    
    return daysA - daysB;
  });

  return (
    <div className="pantry-list">
      <div className="pantry-list-header">
        <h2>Pantry Inventory</h2>
        <div className="header-actions">
          <span className="item-count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <button className="add-item-btn" onClick={onAddItemClick}>
            <span className="add-icon">+</span>
            <span>Add Item</span>
          </button>
        </div>
      </div>
      <div className="pantry-items-container">
        {sortedItems.map((item) => (
          <PantryItem 
            key={item.id} 
            item={item} 
            onMarkConsumed={onMarkConsumed}
            showMarkConsumed={true}
          />
        ))}
      </div>

      <AddItemModal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        onAddItem={onAddItem}
      />
    </div>
  );
}

export default PantryList;
