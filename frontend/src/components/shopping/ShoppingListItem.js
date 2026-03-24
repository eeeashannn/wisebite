import React from "react";

function ShoppingListItem({ item, onRemove }) {
  return (
    <div className="shopping-item">
      <div>
        <p className="shopping-item-name">{item.name}</p>
        <p className="shopping-item-meta">
          Qty: {item.quantity || 1} • {item.source || "manual"}
        </p>
      </div>
      <button type="button" className="shopping-remove-btn" onClick={() => onRemove?.(item.id)}>
        Remove
      </button>
    </div>
  );
}

export default ShoppingListItem;
