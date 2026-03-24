import React from "react";
import "./ReminderCenter.css";

function ReminderCenter({ reminders }) {
  const expired = reminders?.expired || [];
  const today = reminders?.today || [];
  const soon = reminders?.soon || [];

  return (
    <section className="reminder-center">
      <h2 className="reminder-title">Needs Attention Today</h2>
      <div className="reminder-grid">
        <div className="reminder-card">
          <p className="reminder-label">Expired</p>
          <p className="reminder-count">{expired.length}</p>
        </div>
        <div className="reminder-card">
          <p className="reminder-label">Expires Today</p>
          <p className="reminder-count">{today.length}</p>
        </div>
        <div className="reminder-card">
          <p className="reminder-label">1-2 Days</p>
          <p className="reminder-count">{soon.length}</p>
        </div>
      </div>
    </section>
  );
}

export default ReminderCenter;
