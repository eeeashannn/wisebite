import React from 'react';
import { getDaysRemaining, getStatus } from '../utils/dateUtils';
import { getItemDisplay } from '../utils/itemImage';
import { formatDate } from '../utils/dateUtils';
import { IconEdit, IconTrash } from './Icons';
import './PantryItem.css';

function PantryItem({ item, onDelete, showActions }) {
  const display = getItemDisplay(item);
  const daysRemaining = getDaysRemaining(item.expiry);
  const status = getStatus(daysRemaining);
  const quantity = item.quantity || 1;
  const unit = item.unit || 'units';
  const category = item.category || 'Pantry';
  const addedDate = item.added_date;

  const expiryLabel =
    daysRemaining < 0
      ? `Expired ${Math.abs(daysRemaining)} days ago`
      : daysRemaining === 0
        ? 'Expires today'
        : `${daysRemaining} days left`;

  return (
    <div className="pantry-card">
      {showActions && (
        <div className="pantry-card-actions">
          <button type="button" className="card-action-btn edit-btn" title="Edit" aria-label="Edit">
            <IconEdit size={16} />
          </button>
          <button
            type="button"
            className="card-action-btn delete-btn"
            title="Delete"
            aria-label="Delete"
            onClick={() => onDelete?.(item.id)}
          >
            <IconTrash size={16} />
          </button>
        </div>
      )}
      <div className="pantry-card-icon">
        {display.type === 'image' ? (
          <img src={display.value} alt={item.name} className="pantry-card-img" />
        ) : (
          <span className="pantry-card-letter">{display.value}</span>
        )}
      </div>
      <h3 className="pantry-card-name">{item.name}</h3>
      <p className="pantry-card-meta">{category}</p>
      <p className="pantry-card-quantity">
        {quantity} {quantity === 1 ? (unit === 'Pieces' ? 'piece' : unit.toLowerCase()) : unit.toLowerCase()}
      </p>
      <p className="pantry-card-added">{addedDate ? `Added ${formatDate(addedDate)}` : 'Added -'}</p>
      <p className={`pantry-card-expiry ${daysRemaining <= 0 ? 'expired' : 'fresh'}`}>
        <span className="expiry-dot" data-expired={daysRemaining <= 0} />
        {expiryLabel}
      </p>
    </div>
  );
}

export default PantryItem;
