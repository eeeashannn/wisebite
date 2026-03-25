import React, { useState, useMemo } from 'react';
import StatsCards from './dashboard/StatsCards';
import NeedsAttentionSection from './dashboard/NeedsAttentionSection';
import ReminderCenter from './dashboard/ReminderCenter';
import PantryItem from './PantryItem';
import ActivityFeed from './activity/ActivityFeed';
import { IconSearch } from './Icons';
import { sortItemsByExpiry, getItemStatusBucket, getExpiringItems } from '../utils/dateUtils';
import './HomePage.css';
import './PantryList.css';

const CATEGORIES = ['All Categories', 'Dairy', 'Meat', 'Vegetables', 'Fruits', 'Bakery', 'Pantry', 'Beverages', 'Frozen', 'Snacks', 'Other'];

const STATUS_FILTER_LABELS = {
  fresh: 'fresh only',
  expiring: 'expiring soon',
  expired: 'expired only',
};

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
  const [statusFilter, setStatusFilter] = useState('all');

  // Stats card filter first, then search + category (stat selection is the primary scope).
  const afterStatusFilter = useMemo(() => {
    let list = items || [];
    if (statusFilter !== 'all') {
      list = list.filter((item) => getItemStatusBucket(item) === statusFilter);
    }
    return sortItemsByExpiry(list);
  }, [items, statusFilter]);

  const filteredItems = useMemo(() => {
    let list = afterStatusFilter;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => (i.name || '').toLowerCase().includes(q));
    }
    if (categoryFilter !== 'All Categories') {
      list = list.filter((i) => (i.category || '') === categoryFilter);
    }
    return list;
  }, [afterStatusFilter, search, categoryFilter]);

  const needsAttentionItems = useMemo(() => {
    const list = items || [];
    if (statusFilter === 'expired') {
      return sortItemsByExpiry(list.filter((i) => getItemStatusBucket(i) === 'expired')).slice(0, 6);
    }
    if (statusFilter === 'expiring') {
      return sortItemsByExpiry(list.filter((i) => getItemStatusBucket(i) === 'expiring')).slice(0, 6);
    }
    if (statusFilter === 'fresh') {
      return [];
    }
    return getExpiringItems(list, 3).slice(0, 6);
  }, [items, statusFilter]);

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
  const statusPoolCount = afterStatusFilter.length;
  const shownCount = filteredItems.length;
  const pantryCountLine =
    statusFilter !== 'all'
      ? `Showing ${shownCount} of ${statusPoolCount} item${statusPoolCount !== 1 ? 's' : ''} (${STATUS_FILTER_LABELS[statusFilter]})`
      : search.trim() || categoryFilter !== 'All Categories'
        ? `Showing ${shownCount} of ${itemCount} item${itemCount !== 1 ? 's' : ''}`
        : `${itemCount} item${itemCount !== 1 ? 's' : ''} in your pantry`;

  return (
    <div className="home-page">
      <h1 className="home-page-title">Home</h1>
      <p className="home-page-subtitle">Monitor your pantry and reduce food waste.</p>

      <StatsCards
        stats={stats || { total_items: 0, fresh: 0, expiring_soon: 0, expired: 0 }}
        activeStatusFilter={statusFilter}
        onStatusFilterChange={(next) => {
          setStatusFilter((prev) => (prev === next ? 'all' : next));
        }}
      />
      <ReminderCenter reminders={reminders} />
      <NeedsAttentionSection
        attentionItems={needsAttentionItems}
        activeStatusFilter={statusFilter}
        onConsumeItem={onConsumeItem}
      />

      <section className="home-pantry-section">
        <div className="pantry-page-header">
          <div>
            <h2 className="pantry-section-title">My Pantry</h2>
            <p className="pantry-page-count">{pantryCountLine}</p>
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
            <p>
              {!items?.length
                ? 'Your pantry is empty. Add items to get started!'
                : 'No items match your filters.'}
            </p>
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
