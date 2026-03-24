import React from "react";
import "./ActivityFeed.css";

function ActivityFeed({ events }) {
  return (
    <section className="activity-feed">
      <h2 className="activity-title">Recent Activity</h2>
      {!events?.length ? (
        <p className="activity-empty">No activity yet.</p>
      ) : (
        <ul className="activity-list">
          {events.slice(0, 10).map((ev) => (
            <li key={ev.id} className="activity-row">
              <p className="activity-message">{ev.message}</p>
              <p className="activity-time">{new Date(ev.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default ActivityFeed;
