import React from 'react';
import PantryItem from '../PantryItem';
import './NeedsAttentionSection.css';

const STATUS_HEADING = {
  expired: 'Expired items',
  expiring: 'Expiring soon',
  fresh: null,
};

function NeedsAttentionSection({ attentionItems, activeStatusFilter = 'all', onConsumeItem }) {
  if (!attentionItems?.length) {
    return null;
  }

  const scoped =
    activeStatusFilter !== 'all' ? STATUS_HEADING[activeStatusFilter] : null;

  return (
    <div className="needs-attention-section">
      <div className="section-header">
        <h2 className="section-title">
          Needs Attention
          {scoped && (
            <span className="needs-attention-scope"> — {scoped}</span>
          )}
        </h2>
        <span className="attention-count">{attentionItems.length} item(s)</span>
      </div>
      <div className="items-grid">
        {attentionItems.map((item) => (
          <PantryItem
            key={item.id}
            item={item}
            onConsume={onConsumeItem}
            showActions={false}
          />
        ))}
      </div>
    </div>
  );
}

export default NeedsAttentionSection;
