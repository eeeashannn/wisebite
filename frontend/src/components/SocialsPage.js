import React, { useEffect, useMemo, useState } from "react";
import "./SocialsPage.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

function toLines(value) {
  return (value || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toText(lines) {
  return (lines || []).join("\n");
}

function fmtDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function mediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
}

function getMyUserId() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id ?? null;
  } catch (_) {
    return null;
  }
}

function SocialsPage({ authToken }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [likeLoadingId, setLikeLoadingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    caption: "",
    ingredients: "",
    steps: "",
    cooked_on: "",
    photo_url: "",
  });
  const myUserId = useMemo(() => getMyUserId(), []);

  const authHeaders = {
    Authorization: `Bearer ${authToken}`,
  };

  const fetchFeed = async () => {
    if (!authToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/social/posts`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        throw new Error("Could not load social feed.");
      }
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Could not load social feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const resetForm = () => {
    setForm({
      title: "",
      caption: "",
      ingredients: "",
      steps: "",
      cooked_on: "",
      photo_url: "",
    });
    setEditingId(null);
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    const body = new FormData();
    body.append("photo", file);
    try {
      const res = await fetch(`${API_BASE_URL}/social/posts/photo`, {
        method: "POST",
        headers: authHeaders,
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Upload failed");
      }
      setForm((prev) => ({ ...prev, photo_url: data.photo_url_absolute || data.photo_url || "" }));
    } catch (err) {
      setError(err.message || "Upload failed");
    }
  };

  const submitPost = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        caption: form.caption.trim(),
        ingredients: toLines(form.ingredients),
        steps: toLines(form.steps),
        cooked_on: form.cooked_on || null,
        photo_url: form.photo_url || null,
      };
      const url = editingId
        ? `${API_BASE_URL}/social/posts/${editingId}`
        : `${API_BASE_URL}/social/posts`;
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Could not save post");
      }
      resetForm();
      await fetchFeed();
    } catch (err) {
      setError(err.message || "Could not save post");
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleLike = async (postId) => {
    setLikeLoadingId(postId);
    try {
      const res = await fetch(`${API_BASE_URL}/social/posts/${postId}/like`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Could not update like");
      await fetchFeed();
    } catch (err) {
      setError(err.message || "Could not update like");
    } finally {
      setLikeLoadingId(null);
    }
  };

  const startEdit = (post) => {
    setEditingId(post.id);
    setForm({
      title: post.title || "",
      caption: post.caption || "",
      ingredients: toText(post.ingredients || []),
      steps: toText(post.steps || []),
      cooked_on: post.cooked_on || "",
      photo_url: post.photo_url || "",
    });
  };

  const deletePost = async (postId) => {
    const ok = window.confirm("Delete this recipe post?");
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL}/social/posts/${postId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not delete post");
      await fetchFeed();
    } catch (err) {
      setError(err.message || "Could not delete post");
    }
  };

  return (
    <div className="socials-page">
      <h1 className="socials-title">Share Your Recipes</h1>
      <p className="socials-subtitle">Post what you cooked and explore recipes from everyone.</p>

      <form className="socials-composer" onSubmit={submitPost}>
        <h2>{editingId ? "Edit recipe post" : "Create recipe post"}</h2>
        <input
          type="text"
          placeholder="Recipe title"
          value={form.title}
          onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          required
          maxLength={120}
        />
        <textarea
          placeholder="Caption / notes"
          value={form.caption}
          onChange={(e) => setForm((p) => ({ ...p, caption: e.target.value }))}
          rows={3}
        />
        <textarea
          placeholder="Ingredients (one per line)"
          value={form.ingredients}
          onChange={(e) => setForm((p) => ({ ...p, ingredients: e.target.value }))}
          rows={4}
        />
        <textarea
          placeholder="Steps (one per line)"
          value={form.steps}
          onChange={(e) => setForm((p) => ({ ...p, steps: e.target.value }))}
          rows={5}
        />
        <label className="socials-date-label">
          Cooked on (optional)
          <input
            type="date"
            value={form.cooked_on}
            onChange={(e) => setForm((p) => ({ ...p, cooked_on: e.target.value }))}
          />
        </label>
        <label className="socials-file-label">
          Photo (optional)
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
          />
        </label>
        {form.photo_url && (
          <img className="socials-photo-preview" src={mediaUrl(form.photo_url)} alt="Recipe preview" />
        )}
        <div className="socials-actions">
          <button type="submit" disabled={submitLoading}>
            {submitLoading ? "Saving..." : editingId ? "Update post" : "Share recipe"}
          </button>
          {editingId && (
            <button type="button" className="secondary" onClick={resetForm}>
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {error && <div className="socials-error">{error}</div>}
      {loading ? (
        <div className="socials-loading">Loading feed...</div>
      ) : (
        <div className="socials-feed">
          {posts.length === 0 && <div className="socials-empty">No posts yet. Share the first recipe.</div>}
          {posts.map((post) => {
            const isOwner = post.is_owner || String(post.user_id) === String(myUserId);
            return (
              <article key={post.id} className="socials-card">
                <header className="socials-card-head">
                  <div className="socials-author">
                    {post.author?.photo_url ? (
                      <img src={mediaUrl(post.author.photo_url)} alt="" className="socials-author-photo" />
                    ) : (
                      <span className="socials-author-fallback">
                        {(post.author?.name || "U").trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <div className="socials-author-name">{post.author?.name || "User"}</div>
                      <div className="socials-meta">
                        {fmtDate(post.created_at)}
                        {post.cooked_on ? ` - Cooked on ${post.cooked_on}` : ""}
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="socials-owner-actions">
                      <button type="button" className="secondary" onClick={() => startEdit(post)}>Edit</button>
                      <button type="button" className="danger" onClick={() => deletePost(post.id)}>Delete</button>
                    </div>
                  )}
                </header>
                <h3>{post.title}</h3>
                {post.caption && <p className="socials-caption">{post.caption}</p>}
                {post.photo_url && (
                  <img
                    className="socials-post-photo"
                    src={post.photo_url_absolute || mediaUrl(post.photo_url)}
                    alt={post.title}
                  />
                )}
                {(post.ingredients || []).length > 0 && (
                  <div>
                    <h4>Ingredients</h4>
                    <ul>
                      {(post.ingredients || []).map((item, idx) => (
                        <li key={`ing-${post.id}-${idx}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(post.steps || []).length > 0 && (
                  <div>
                    <h4>Steps</h4>
                    <ol>
                      {(post.steps || []).map((item, idx) => (
                        <li key={`step-${post.id}-${idx}`}>{item}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <button
                  type="button"
                  className={`socials-like-btn ${post.liked_by_me ? "liked" : ""}`}
                  onClick={() => toggleLike(post.id)}
                  disabled={likeLoadingId === post.id}
                >
                  {post.liked_by_me ? "Unlike" : "Like"} ({post.like_count || 0})
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SocialsPage;
