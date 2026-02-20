import React, { useState, useMemo } from 'react';
import PantryItem from './PantryItem';
import { IconSearch } from './Icons';
import { sortItemsByExpiry } from '../utils/dateUtils';
import './PantryList.css';

const CATEGORIES = ['All Categories', 'Dairy', 'Meat', 'Vegetables', 'Fruits', 'Bakery', 'Pantry', 'Beverages', 'Frozen', 'Snacks', 'Other'];

function PantryList({ items, loading, error, onAddItemClick, onDeleteItem, onAddItem, isModalOpen, onCloseModal }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const filteredItems = useMemo(() => {
    let list = items || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => (i.name || '').toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All Categories') {
      list = list.filter((i) => (i.category || '') === categoryFilter);
    }
    return sortItemsByExpiry(list);
  }, [items, search, categoryFilter]);

  if (loading) {
    return (
      <div className="pantry-page">
        <div className="loading">Loading pantry...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pantry-page">
        <div className="error">
          <h2>Unable to load pantry</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const itemCount = items?.length ?? 0;

  return (
    <div className="pantry-page">
      <div className="pantry-page-header">
        <div>
          <h1 className="pantry-page-title">My Pantry</h1>
          <p className="pantry-page-count">{itemCount} item{itemCount !== 1 ? 's' : ''} in your pantry</p>
        </div>
        <button type="button" className="add-item-btn" onClick={onAddItemClick}>
          <span className="add-icon">+</span>
          Add Item
        </button>
      </div>

      <div className="pantry-toolbar">
        <div className="search-wrap">
          <span className="search-icon"><IconSearch size={20} /></span>
          <input
            type="text"
            className="search-input"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="category-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="pantry-empty">
          <p>{items?.length ? 'No items match your search.' : 'Your pantry is empty. Add items to get started!'}</p>
        </div>
      ) : (
        <div className="pantry-grid">
          {filteredItems.map((item) => (
            <PantryItem
              key={item.id}
              item={item}
              onDelete={onDeleteItem}
              showActions
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PantryList;
