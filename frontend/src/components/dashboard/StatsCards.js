import React from 'react';
import { IconBox, IconCheck, IconWarning, IconChartDown } from '../Icons';
import './StatsCards.css';

function StatsCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="stats-grid">
      <div className="stat-card total">
        <div className="stat-icon"><IconBox size={28} /></div>
        <div className="stat-value">{stats.total_items}</div>
        <div className="stat-label">Total Items</div>
      </div>
      <div className="stat-card fresh">
        <div className="stat-icon"><IconCheck size={28} /></div>
        <div className="stat-value">{stats.fresh}</div>
        <div className="stat-label">Fresh Items</div>
      </div>
      <div className="stat-card expiring">
        <div className="stat-icon"><IconWarning size={28} /></div>
        <div className="stat-value">{stats.expiring_soon}</div>
        <div className="stat-label">Expiring Soon</div>
      </div>
      <div className="stat-card expired">
        <div className="stat-icon"><IconChartDown size={28} /></div>
        <div className="stat-value">{stats.expired}</div>
        <div className="stat-label">Expired</div>
      </div>
    </div>
  );
}

export default StatsCards;
