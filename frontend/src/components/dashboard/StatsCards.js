import React from 'react';
import './StatsCards.css';

function StatsCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-grid">
      <div className="stat-card total">
        <div className="stat-icon">📦</div>
        <div className="stat-value">{stats.total_items}</div>
        <div className="stat-label">Total Items</div>
      </div>
      <div className="stat-card expiring">
        <div className="stat-icon">⚠️</div>
        <div className="stat-value">{stats.expiring_soon}</div>
        <div className="stat-label">Expiring Soon</div>
      </div>
      <div className="stat-card fresh">
        <div className="stat-icon">🌿</div>
        <div className="stat-value">{stats.fresh}</div>
        <div className="stat-label">Fresh</div>
      </div>
      <div className="stat-card expired">
        <div className="stat-icon">🗑️</div>
        <div className="stat-value">{stats.expired}</div>
        <div className="stat-label">Expired</div>
      </div>
    </div>
  );
}

export default StatsCards;
