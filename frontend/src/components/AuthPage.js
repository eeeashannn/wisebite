import React, { useState } from "react";
import BrandLogo from "./BrandLogo";
import "./AuthPage.css";

import { getApiBaseUrl } from "../config";

const MODES = { signIn: "signIn", signUp: "signUp" };

function AuthPage({ onAuthSuccess }) {
  const [mode, setMode] = useState(MODES.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (mode === MODES.signUp && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === MODES.signUp ? "/auth/signup" : "/auth/login";
      const base = getApiBaseUrl();
      const res = await fetch(`${base}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || (res.status === 409 ? "Email already registered." : "Invalid email or password."));
        return;
      }

      if (data.token && data.user) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        onAuthSuccess({ token: data.token, user: data.user });
      } else {
        setError("Invalid response from server.");
      }
    } catch (err) {
      const base = getApiBaseUrl();
      const hint =
        process.env.NODE_ENV === "development"
          ? ` Tried ${base}. On your Mac run: python app.py (from backend/). iPhone: Settings → Privacy & Security → Local Network → enable for Safari if prompted.`
          : "";
      setError(`Could not reach server. Check backend is running.${hint}`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === MODES.signIn ? MODES.signUp : MODES.signIn);
    setError(null);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-brand-icon">
            <BrandLogo />
          </span>
          <h1 className="auth-brand-title">WiseBite</h1>
          <p className="auth-brand-subtitle">Manage your pantry, reduce waste</p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === MODES.signIn ? "active" : ""}`}
            onClick={() => { setMode(MODES.signIn); setError(null); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === MODES.signUp ? "active" : ""}`}
            onClick={() => { setMode(MODES.signUp); setError(null); }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            className="auth-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
          <label className="auth-label" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            className="auth-input"
            placeholder={mode === MODES.signUp ? "At least 6 characters" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === MODES.signUp ? "new-password" : "current-password"}
            disabled={loading}
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? "Please wait…" : mode === MODES.signIn ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p className="auth-switch">
          {mode === MODES.signIn ? "Don't have an account? " : "Already have an account? "}
          <button type="button" className="auth-switch-btn" onClick={switchMode}>
            {mode === MODES.signIn ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
