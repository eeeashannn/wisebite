import React from 'react';
import { IconBox, IconCheck, IconWarning, IconChartDown } from '../Icons';
import './StatsCards.css';

function StatsCards({ stats, activeStatusFilter = 'all', onStatusFilterChange }) {
  if (!stats) return null;

  const set = onStatusFilterChange || (() => {});

  return (
    <div className="stats-grid" role="toolbar" aria-label="Filter pantry by freshness">
      <button
        type="button"
        className={`stat-card total ${activeStatusFilter === 'all' ? 'active' : ''}`}
        onClick={() => set('all')}
        aria-pressed={activeStatusFilter === 'all'}
      >
        <div className="stat-icon"><IconBox size={28} /></div>
        <div className="stat-value">{stats.total_items}</div>
        <div className="stat-label">Total Items</div>
      </button>
      <button
        type="button"
        className={`stat-card fresh ${activeStatusFilter === 'fresh' ? 'active' : ''}`}
        onClick={() => set('fresh')}
        aria-pressed={activeStatusFilter === 'fresh'}
      >
        <div className="stat-icon"><IconCheck size={28} /></div>
        <div className="stat-value">{stats.fresh}</div>
        <div className="stat-label">Fresh Items</div>
      </button>
      <button
        type="button"
        className={`stat-card expiring ${activeStatusFilter === 'expiring' ? 'active' : ''}`}
        onClick={() => set('expiring')}
        aria-pressed={activeStatusFilter === 'expiring'}
      >
        <div className="stat-icon"><IconWarning size={28} /></div>
        <div className="stat-value">{stats.expiring_soon}</div>
        <div className="stat-label">Expiring Soon</div>
      </button>
      <button
        type="button"
        className={`stat-card expired ${activeStatusFilter === 'expired' ? 'active' : ''}`}
        onClick={() => set('expired')}
        aria-pressed={activeStatusFilter === 'expired'}
      >
        <div className="stat-icon"><IconChartDown size={28} /></div>
        <div className="stat-value">{stats.expired}</div>
        <div className="stat-label">Expired</div>
      </button>
    </div>
  );
}

export default StatsCards;
