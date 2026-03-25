import React, { useState } from "react";
import ShoppingListItem from "./shopping/ShoppingListItem";
import "./ShoppingListPage.css";

import { getApiBaseUrl } from "../config";

function ShoppingListPage({ authToken, shoppingItems, suggestions, onRefresh }) {
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(false);

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
  };

  const addItem = async (name, source = "manual") => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await fetch(`${getApiBaseUrl()}/shopping-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: name.trim(), source }),
      });
      setNewItem("");
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (id) => {
    setLoading(true);
    try {
      await fetch(`${getApiBaseUrl()}/shopping-list?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shopping-page">
      <h1 className="shopping-title">Shopping List</h1>
      <p className="shopping-subtitle">Track missing ingredients and quick reorders.</p>

      <div className="shopping-add-row">
        <input
          className="shopping-input"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add item..."
        />
        <button type="button" className="shopping-add-btn" disabled={loading} onClick={() => addItem(newItem)}>
          Add
        </button>
      </div>

      <section className="shopping-card">
        <h3>Suggested Reorders</h3>
        {suggestions?.length ? (
          <div className="shopping-suggestions">
            {suggestions.map((s) => (
              <button key={s.name} type="button" className="suggestion-chip" onClick={() => addItem(s.name, "suggestion")}>
                + {s.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="shopping-empty">No reorder suggestions yet.</p>
        )}
      </section>

      <section className="shopping-card">
        <h3>My Items</h3>
        {shoppingItems?.length ? (
          <div className="shopping-list">
            {shoppingItems.map((item) => (
              <ShoppingListItem key={item.id} item={item} onRemove={removeItem} />
            ))}
          </div>
        ) : (
          <p className="shopping-empty">Your shopping list is empty.</p>
        )}
      </section>
    </div>
  );
}

export default ShoppingListPage;
