import React, { useState, useMemo } from 'react';
import StatsCards from './dashboard/StatsCards';
import NeedsAttentionSection from './dashboard/NeedsAttentionSection';
import ReminderCenter from './dashboard/ReminderCenter';
import PantryItem from './PantryItem';
import ActivityFeed from './activity/ActivityFeed';
import { IconSearch } from './Icons';
import { sortItemsByExpiry } from '../utils/dateUtils';
import './HomePage.css';
import './PantryList.css';

const CATEGORIES = ['All Categories', 'Dairy', 'Meat', 'Vegetables', 'Fruits', 'Bakery', 'Pantry', 'Beverages', 'Frozen', 'Snacks', 'Other'];

function HomePage({
  items,
  stats,
  reminders,
  activityEvents,
  loading,
  error,
  onAddItemClick,
  onEditItem,
  onDeleteItem,
  onConsumeItem,
}) {
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
      <div className="home-page">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page">
        <div className="error">
          <h2>Unable to load</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const itemCount = items?.length ?? 0;

  return (
    <div className="home-page">
      <h1 className="home-page-title">Home</h1>
      <p className="home-page-subtitle">Monitor your pantry and reduce food waste.</p>

      <StatsCards stats={stats || { total_items: 0, fresh: 0, expiring_soon: 0, expired: 0 }} />
      <ReminderCenter reminders={reminders} />
      <NeedsAttentionSection items={items || []} onConsumeItem={onConsumeItem} />

      <section className="home-pantry-section">
        <div className="pantry-page-header">
          <div>
            <h2 className="pantry-section-title">My Pantry</h2>
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
                onEdit={onEditItem}
                onDelete={onDeleteItem}
                onConsume={onConsumeItem}
                showActions
              />
            ))}
          </div>
        )}
      </section>
      <ActivityFeed events={activityEvents || []} />
    </div>
  );
}

export default HomePage;
