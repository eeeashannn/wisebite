import React from 'react';
import StatsCards from './dashboard/StatsCards';
import { IconChefHat } from './Icons';
import './Dashboard.css';

function Dashboard({ stats, loading, error, onGenerateRecipeClick }) {
  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error">
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <h1 className="dashboard-page-title">Dashboard</h1>
      <p className="dashboard-page-subtitle">Monitor your pantry and reduce food waste.</p>

      <StatsCards stats={stats || { total_items: 0, fresh: 0, expiring_soon: 0, expired: 0 }} />

      <div className="generate-recipe-cta">
        <button type="button" className="generate-recipe-cta-btn" onClick={onGenerateRecipeClick}>
          <span className="generate-recipe-cta-icon"><IconChefHat size={40} /></span>
          <span className="generate-recipe-cta-text">Generate Recipe</span>
          <span className="generate-recipe-cta-desc">Get AI-powered suggestions based on your pantry</span>
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
