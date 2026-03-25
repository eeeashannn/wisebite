import React, { useMemo, useState } from "react";
import "./ProfilePage.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function ProfilePage({ authToken, profile, onProfileUpdated }) {
  const [name, setName] = useState(profile?.name || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const photoSrc = useMemo(() => {
    if (!profile?.photo_url) return "";
    if (profile.photo_url.startsWith("http")) return profile.photo_url;
    return `${API_BASE_URL}${profile.photo_url}`;
  }, [profile]);

  const saveName = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save profile");
      onProfileUpdated?.(data);
      setSuccess("Profile saved.");
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch(`${API_BASE_URL}/profile/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onProfileUpdated?.(data);
      setSuccess("Profile photo updated.");
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="profile-page">
      <h1 className="profile-title">Profile</h1>
      <p className="profile-subtitle">Manage your account details.</p>

      <div className="profile-card">
        <div className="profile-photo-wrap">
          {photoSrc ? (
            <img src={photoSrc} alt="Profile" className="profile-photo" />
          ) : (
            <div className="profile-photo-fallback">
              {(profile?.name || profile?.email || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <label className="profile-upload-btn">
            {uploading ? "Uploading..." : "Upload photo"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => uploadPhoto(e.target.files?.[0])}
              disabled={uploading}
              hidden
            />
          </label>
        </div>

        <div className="profile-form">
          <label htmlFor="profile-name">Name</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />

          <label htmlFor="profile-email">Email</label>
          <input id="profile-email" type="text" value={profile?.email || ""} readOnly />

          <button type="button" className="profile-save-btn" onClick={saveName} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          {error && <p className="profile-message error">{error}</p>}
          {success && <p className="profile-message success">{success}</p>}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
