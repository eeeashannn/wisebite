import React, { useEffect, useState } from "react";
import "./HouseholdPage.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function HouseholdPage({ authToken, household, onRefresh, onSharingModeChanged }) {
  const [name, setName] = useState("");
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharingEnabled, setSharingEnabled] = useState(false);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };

  useEffect(() => {
    const loadSharing = async () => {
      if (!authToken) return;
      try {
        const res = await fetch(`${API_BASE_URL}/household/sharing`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok) return;
        const data = await res.json();
        setSharingEnabled(!!data.enabled);
      } catch (_) {}
    };
    loadSharing();
  }, [authToken, household?.joined]);

  const createHousehold = async () => {
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/household`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: name.trim() || "My Household" }),
      });
      setName("");
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/household/invite`, { method: "POST", headers });
      const data = await res.json();
      setInviteCode(data.invite_code || "");
    } finally {
      setLoading(false);
    }
  };

  const joinHousehold = async () => {
    if (!inviteCodeInput.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/household/accept`, {
        method: "POST",
        headers,
        body: JSON.stringify({ invite_code: inviteCodeInput.trim() }),
      });
      setInviteCodeInput("");
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  const updateSharingMode = async (enabled) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/household/sharing`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ enabled }),
      });
      if (res.ok) {
        setSharingEnabled(enabled);
        onSharingModeChanged?.();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="household-page">
      <h1 className="household-title">Household</h1>
      <p className="household-subtitle">Create or join a shared pantry household.</p>

      {!household?.joined ? (
        <div className="household-card">
          <h3>Create household</h3>
          <div className="household-row">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Household name" />
            <button type="button" onClick={createHousehold} disabled={loading}>Create</button>
          </div>
          <h3>Join with code</h3>
          <div className="household-row">
            <input value={inviteCodeInput} onChange={(e) => setInviteCodeInput(e.target.value)} placeholder="Invite code" />
            <button type="button" onClick={joinHousehold} disabled={loading}>Join</button>
          </div>
        </div>
      ) : (
        <div className="household-card">
          <h3>{household.household?.name}</h3>
          <p>Members: {household.household?.members?.length || 0}</p>
          <div className="share-mode-row">
            <label htmlFor="sharingModeToggle" className="share-mode-label">Shared pantry mode</label>
            <input
              id="sharingModeToggle"
              type="checkbox"
              checked={sharingEnabled}
              onChange={(e) => updateSharingMode(e.target.checked)}
              disabled={loading}
            />
          </div>
          <p className="share-mode-helper">
            {sharingEnabled
              ? "Household members' pantry is visible."
              : "Only your pantry is visible."}
          </p>
          <ul className="household-members">
            {(household.household?.members || []).map((m) => (
              <li key={m.user_id}>{m.email}</li>
            ))}
          </ul>
          <button type="button" onClick={generateInvite} disabled={loading}>Generate Invite Code</button>
          {inviteCode && <p className="invite-code">Invite Code: {inviteCode}</p>}
        </div>
      )}
    </div>
  );
}

export default HouseholdPage;
