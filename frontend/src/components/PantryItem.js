import React from 'react';
import { getDaysRemaining, getItemStatusBucket, formatDate } from '../utils/dateUtils';
import { getItemDisplay } from '../utils/itemImage';
import { IconEdit, IconTrash } from './Icons';
import './PantryItem.css';

function PantryItem({ item, onDelete, onEdit, onConsume, showActions }) {
  const display = getItemDisplay(item);
  const daysRemaining = getDaysRemaining(item.expiry);
  const statusBucket = getItemStatusBucket(item);
  const statusClass =
    statusBucket === 'expired'
      ? 'pantry-card--expired'
      : statusBucket === 'expiring'
        ? 'pantry-card--expiring'
        : statusBucket === 'fresh'
          ? 'pantry-card--fresh'
          : 'pantry-card--unknown';
  const expiryTone =
    statusBucket === 'expired'
      ? 'expired'
      : statusBucket === 'expiring'
        ? 'expiring-soon'
        : statusBucket === 'fresh'
          ? 'fresh'
          : 'unknown';
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
    <div className={`pantry-card ${statusClass}`}>
      {showActions && (
        <div className="pantry-card-actions">
          <button
            type="button"
            className="card-action-btn edit-btn"
            title="Edit"
            aria-label="Edit"
            onClick={() => onEdit?.(item)}
          >
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
      <p className={`pantry-card-expiry ${expiryTone}`}>
        <span
          className="expiry-dot"
          data-status={statusBucket || 'unknown'}
          aria-hidden
        />
        {expiryLabel}
      </p>
      {onConsume && (
        <button
          type="button"
          className="consume-btn"
          onClick={() => onConsume(item.id, 1)}
        >
          Consume 1
        </button>
      )}
    </div>
  );
}

export default PantryItem;
