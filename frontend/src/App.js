import React, { useEffect, useState } from "react";
import Dashboard from "./components/Dashboard";
import PantryList from "./components/PantryList";
import TipOfTheDay from "./components/TipOfTheDay";
import "./App.css";

const API_BASE_URL = "http://127.0.0.1:5000";

function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch items and stats in parallel
      const [itemsResponse, statsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/items`),
        fetch(`${API_BASE_URL}/stats`),
      ]);

      if (!itemsResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to fetch data from backend");
      }

      const itemsData = await itemsResponse.json();
      const statsData = await statsResponse.json();

      setItems(itemsData);
      setStats(statsData);
    } catch (err) {
      setError(
        err.message || "Unable to connect to the backend server. Please ensure it's running."
      );
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkConsumed = (itemId) => {
    // TODO: Implement API call to mark item as consumed
    setItems(items.filter(item => item.id !== itemId));
    // Update stats
    if (stats) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(item.expiry);
        expiry.setHours(0, 0, 0, 0);
        const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        
        const newStats = { ...stats, total_items: stats.total_items - 1 };
        if (daysRemaining < 0) {
          newStats.expired = Math.max(0, stats.expired - 1);
        } else if (daysRemaining <= 3) {
          newStats.expiring_soon = Math.max(0, stats.expiring_soon - 1);
        } else {
          newStats.fresh = Math.max(0, stats.fresh - 1);
        }
        setStats(newStats);
      }
    }
  };

  const handleAddItem = async (newItem) => {
    try {
      // Generate a new ID (in a real app, this would come from the backend)
      const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
      const itemToAdd = {
        id: newId,
        name: newItem.name,
        category: newItem.category,
        expiry: newItem.expiry,
        quantity: newItem.quantity || 1
      };

      // Add to frontend state immediately
      const updatedItems = [...items, itemToAdd];
      setItems(updatedItems);

      // Recalculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(itemToAdd.expiry);
      expiry.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

      const newStats = { ...stats };
      newStats.total_items = (newStats.total_items || 0) + 1;
      
      if (daysRemaining < 0) {
        newStats.expired = (newStats.expired || 0) + 1;
      } else if (daysRemaining <= 3) {
        newStats.expiring_soon = (newStats.expiring_soon || 0) + 1;
      } else {
        newStats.fresh = (newStats.fresh || 0) + 1;
      }
      
      setStats(newStats);

      // TODO: Make API call to backend to persist the item
      // await fetch(`${API_BASE_URL}/items`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(itemToAdd)
      // });
    } catch (err) {
      console.error('Error adding item:', err);
      // Could show an error message to the user here
    }
  };

  return (
    <div className="App">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="brand-icon">👨‍🍳</span>
          <h1 className="brand-title">WiseBite</h1>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-link ${activeView === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveView("dashboard")}
          >
            <span className="nav-icon">⊞</span>
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-link ${activeView === "pantry" ? "active" : ""}`}
            onClick={() => setActiveView("pantry")}
          >
            <span className="nav-icon">📦</span>
            <span>My Pantry</span>
          </button>
        </nav>

        <TipOfTheDay />
      </aside>

      <main className="main-content">
        {activeView === "dashboard" && (
          <Dashboard 
            stats={stats} 
            items={items}
            loading={loading} 
            error={error}
            onMarkConsumed={handleMarkConsumed}
            onAddItemClick={() => setIsModalOpen(true)}
            isModalOpen={isModalOpen}
            onCloseModal={() => setIsModalOpen(false)}
            onAddItem={handleAddItem}
          />
        )}
        {activeView === "pantry" && (
          <PantryList 
            items={items} 
            loading={loading} 
            error={error}
            onMarkConsumed={handleMarkConsumed}
            onAddItemClick={() => setIsModalOpen(true)}
            isModalOpen={isModalOpen}
            onCloseModal={() => setIsModalOpen(false)}
            onAddItem={handleAddItem}
          />
        )}
      </main>
    </div>
  );
}

export default App;
