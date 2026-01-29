import React from 'react';
import PantryItem from '../PantryItem';
import { getExpiringItems } from '../../utils/dateUtils';
import './NeedsAttentionSection.css';

function NeedsAttentionSection({ items, onMarkConsumed }) {
  const needsAttentionItems = getExpiringItems(items, 3).slice(0, 6);

  if (needsAttentionItems.length === 0) {
    return null;
  }

  return (
    <div className="needs-attention-section">
      <div className="section-header">
        <h2 className="section-title">Needs Attention</h2>
        <button className="view-all-link">View All</button>
      </div>
      <div className="items-grid">
        {needsAttentionItems.map((item) => (
          <PantryItem 
            key={item.id} 
            item={item} 
            onMarkConsumed={onMarkConsumed}
            showMarkConsumed={true}
          />
        ))}
      </div>
    </div>
  );
}

export default NeedsAttentionSection;
