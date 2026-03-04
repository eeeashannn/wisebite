import React, { useEffect, useState } from "react";
import HomePage from "./components/HomePage";
import ScanPage from "./components/ScanPage";
import RecipesPage from "./components/RecipesPage";
import ProduceAIPage from "./components/ProduceAIPage";
import AddItemModal from "./components/AddItemModal";
import AuthPage from "./components/AuthPage";
import BrandLogo from "./components/BrandLogo";
import { IconHome, IconCamera, IconChefHat, IconApple } from "./components/Icons";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:5000";

const VIEWS = { home: "home", scan: "scan", recipes: "recipes", produce: "produce" };

function getStoredAuth() {
  try {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) {
      const user = JSON.parse(userStr);
      return { token, user };
    }
  } catch (_) {}
  return null;
}

function App() {
  const [auth, setAuth] = useState(getStoredAuth);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState(VIEWS.home);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setAuth(null);
  };

  const authHeaders = () => ({
    ...(auth?.token && { Authorization: `Bearer ${auth.token}` }),
  });

  const fetchData = async () => {
    if (!auth?.token) return;
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/items`, { headers: authHeaders() }),
        fetch(`${API_BASE_URL}/stats`, { headers: authHeaders() }),
      ]);
      if (itemsRes.status === 401 || statsRes.status === 401) {
        handleLogout();
        return;
      }
      if (!itemsRes.ok || !statsRes.ok) throw new Error("Failed to fetch data");
      const [itemsData, statsData] = await Promise.all([itemsRes.json(), statsRes.json()]);
      setItems(itemsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth) fetchData();
  }, [auth]);

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/items/${itemId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) fetchData();
      else {
        setItems(items.filter((i) => i.id !== itemId));
        if (stats) setStats({ ...stats, total_items: Math.max(0, stats.total_items - 1) });
      }
    } catch {
      setItems(items.filter((i) => i.id !== itemId));
      if (stats) setStats({ ...stats, total_items: Math.max(0, stats.total_items - 1) });
    }
  };

  const handleAddItem = async (newItem) => {
    try {
      const res = await fetch(`${API_BASE_URL}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: newItem.name,
          category: newItem.category,
          expiry: newItem.expiry,
          quantity: newItem.quantity || 1,
          unit: newItem.unit,
          notes: newItem.notes,
          image_url: newItem.image_url,
          barcode: newItem.barcode,
        }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const common = {
    items,
    stats,
    loading,
    error,
    isModalOpen,
    onCloseModal: () => setIsModalOpen(false),
    onAddItemClick: () => setIsModalOpen(true),
    onAddItem: handleAddItem,
  };

  if (!auth) {
    return (
      <div className="App">
        <AuthPage onAuthSuccess={(payload) => setAuth({ token: payload.token, user: payload.user })} />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="topnav">
        <button
          type="button"
          className="topnav-brand"
          onClick={() => setActiveView(VIEWS.home)}
          aria-label="Go to Home"
        >
          <span className="brand-icon">
            <BrandLogo />
          </span>
          <span className="brand-title">WiseBite</span>
        </button>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button
            className={`nav-tab ${activeView === VIEWS.home ? "active" : ""}`}
            onClick={() => setActiveView(VIEWS.home)}
          >
            <span className="nav-tab-icon"><IconHome size={20} /></span>
            <span>Home</span>
          </button>
          <button
            className={`nav-tab ${activeView === VIEWS.scan ? "active" : ""}`}
            onClick={() => setActiveView(VIEWS.scan)}
          >
            <span className="nav-tab-icon"><IconCamera size={20} /></span>
            <span>Scan</span>
          </button>
          <button
            className={`nav-tab ${activeView === VIEWS.recipes ? "active" : ""}`}
            onClick={() => setActiveView(VIEWS.recipes)}
          >
            <span className="nav-tab-icon"><IconChefHat size={20} /></span>
            <span>Recipes</span>
          </button>
          <button
            className={`nav-tab ${activeView === VIEWS.produce ? "active" : ""}`}
            onClick={() => setActiveView(VIEWS.produce)}
          >
            <span className="nav-tab-icon"><IconApple size={20} /></span>
            <span>Produce AI</span>
          </button>
          <button
            type="button"
            className="nav-tab nav-tab-logout"
            onClick={handleLogout}
          >
            Log out
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeView === VIEWS.home && (
          <HomePage {...common} onDeleteItem={handleDeleteItem} />
        )}
        {activeView === VIEWS.scan && (
          <ScanPage {...common} />
        )}
        {activeView === VIEWS.recipes && (
          <RecipesPage {...common} />
        )}
        {activeView === VIEWS.produce && (
          <ProduceAIPage />
        )}
      </main>

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddItem={handleAddItem}
      />
    </div>
  );
}

export default App;
