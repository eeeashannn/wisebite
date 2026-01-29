import React from 'react';
import './WelcomeHeader.css';

function WelcomeHeader({ onAddItemClick }) {
  return (
    <div className="dashboard-header">
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome Back</h1>
        <p className="welcome-subtitle">Here's what's happening in your pantry today.</p>
      </div>
      <button className="add-item-btn" onClick={onAddItemClick}>
        <span className="add-icon">+</span>
        <span>Add Item</span>
      </button>
    </div>
  );
}

export default WelcomeHeader;
