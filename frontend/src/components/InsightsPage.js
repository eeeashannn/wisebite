import React from "react";
import "./InsightsPage.css";

function InsightsPage({ insights }) {
  return (
    <div className="insights-page">
      <h1 className="insights-title">Insights</h1>
      <p className="insights-subtitle">Weekly pantry behavior summary.</p>

      <div className="insights-grid">
        <div className="insight-card">
          <p>Saved Items</p>
          <h3>{insights?.saved_items_this_week ?? 0}</h3>
        </div>
        <div className="insight-card">
          <p>Consumed</p>
          <h3>{insights?.consumed_count ?? 0}</h3>
        </div>
        <div className="insight-card">
          <p>Expired</p>
          <h3>{insights?.expired_count ?? 0}</h3>
        </div>
      </div>

      <div className="insight-card">
        <h3>Top Wasted Categories</h3>
        {!insights?.top_wasted_categories?.length ? (
          <p className="insights-empty">No waste signals yet.</p>
        ) : (
          <ul className="insights-list">
            {insights.top_wasted_categories.map((c) => (
              <li key={c.category}>
                {c.category}: {c.count}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default InsightsPage;
