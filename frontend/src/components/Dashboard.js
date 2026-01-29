import React from 'react';
import WelcomeHeader from './dashboard/WelcomeHeader';
import StatsCards from './dashboard/StatsCards';
import NeedsAttentionSection from './dashboard/NeedsAttentionSection';
import RecipeGenerator from './recipes/RecipeGenerator';
import AddItemModal from './AddItemModal';
import './Dashboard.css';

function Dashboard({ stats, items, loading, error, onMarkConsumed, onAddItemClick, isModalOpen, onCloseModal, onAddItem }) {
  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error">
          <h2>⚠️ Unable to load dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <h2>No pantry data available</h2>
          <p>Start adding items to your pantry to see statistics here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <WelcomeHeader onAddItemClick={onAddItemClick} />
      <StatsCards stats={stats} />
      <NeedsAttentionSection items={items || []} onMarkConsumed={onMarkConsumed} />
      <RecipeGenerator items={items || []} />
      <AddItemModal
        isOpen={isModalOpen}
        onClose={onCloseModal}
        onAddItem={onAddItem}
      />
    </div>
  );
}

export default Dashboard;
