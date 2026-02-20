import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import PantryList from "./components/PantryList";
import ScanPage from "./components/ScanPage";
import RecipesPage from "./components/RecipesPage";
import ProduceAIPage from "./components/ProduceAIPage";
import AddItemModal from "./components/AddItemModal";
import BrandLogo from "./components/BrandLogo";
import { IconHome, IconBox, IconCamera, IconChefHat, IconApple } from "./components/Icons";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:5000";

const VIEWS = { dashboard: "dashboard", pantry: "pantry", scan: "scan", recipes: "recipes", produce: "produce" };

function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState(VIEWS.dashboard);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/items`),
        fetch(`${API_BASE_URL}/stats`),
      ]);
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

  useEffect(() => { fetchData(); }, []);

  const handleDeleteItem = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/items/${itemId}`, { method: "DELETE" });
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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="App">
      <header className="topnav">
        <div className="topnav-brand">
          <span className="brand-icon">
            <BrandLogo />
          </span>
          <span className="brand-title">WiseBite</span>
        </div>
        <nav className="nav-tabs" aria-label="Main navigation">
          <button
            className={`nav-tab ${activeView === VIEWS.dashboard ? "active" : ""}`}
            onClick={() => setActiveView(VIEWS.dashboard)}
          >
            <span className="nav-tab-icon"><IconHome size={20} /></span>
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-tab ${activeView === VIEWS.pantry ? "active" : ""}`}
            onClick={() => setActiveView(VIEWS.pantry)}
          >
            <span className="nav-tab-icon"><IconBox size={20} /></span>
            <span>Pantry</span>
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
        </nav>
      </header>

      <main className="main-content">
        {activeView === VIEWS.dashboard && (
          <Dashboard {...common} onGenerateRecipeClick={() => setActiveView(VIEWS.recipes)} />
        )}
        {activeView === VIEWS.pantry && (
          <PantryList {...common} onDeleteItem={handleDeleteItem} />
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
