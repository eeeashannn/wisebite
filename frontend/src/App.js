import React, { useEffect, useRef, useState } from "react";
import HomePage from "./components/HomePage";
import ScanPage from "./components/ScanPage";
import RecipesPage from "./components/RecipesPage";
import ShoppingListPage from "./components/ShoppingListPage";
import InsightsPage from "./components/InsightsPage";
import HouseholdPage from "./components/HouseholdPage";
import ProfilePage from "./components/ProfilePage";
import AddItemModal from "./components/AddItemModal";
import AuthPage from "./components/AuthPage";
import BrandLogo from "./components/BrandLogo";
import UndoSnackbar from "./components/common/UndoSnackbar";
import {
  IconMenu,
  IconHome,
  IconCamera,
  IconChefHat,
  IconBox,
  IconChartDown,
  IconUsers,
  IconUser,
} from "./components/Icons";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

const VIEWS = {
  home: "home",
  scan: "scan",
  recipes: "recipes",
  shopping: "shopping",
  insights: "insights",
  household: "household",
  profile: "profile",
};

const MAIN_PAGES = [
  { view: VIEWS.home, label: "Home", Icon: IconHome },
  { view: VIEWS.scan, label: "Scan", Icon: IconCamera },
  { view: VIEWS.recipes, label: "Recipes", Icon: IconChefHat },
  { view: VIEWS.shopping, label: "Shopping", Icon: IconBox },
  { view: VIEWS.insights, label: "Insights", Icon: IconChartDown },
  { view: VIEWS.household, label: "Household", Icon: IconUsers },
  { view: VIEWS.profile, label: "Profile", Icon: IconUser },
];

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
  const [reminders, setReminders] = useState({ expired: [], today: [], soon: [] });
  const [activityEvents, setActivityEvents] = useState([]);
  const [shoppingItems, setShoppingItems] = useState([]);
  const [shoppingSuggestions, setShoppingSuggestions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [household, setHousehold] = useState({ joined: false, household: null });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState(VIEWS.home);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [undoToken, setUndoToken] = useState(null);
  const [undoLoading, setUndoLoading] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isPagesMenuOpen, setIsPagesMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const pagesMenuRef = useRef(null);

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
      await Promise.all([
        fetchReminders(),
        fetchActivity(),
        fetchShopping(),
        fetchInsights(),
        fetchHousehold(),
        fetchProfile(),
      ]);
    } catch (err) {
      setError(err.message || "Unable to connect to the backend server.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const res = await fetch(`${API_BASE_URL}/profile`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      localStorage.setItem("user", JSON.stringify(data));
    }
  };

  const fetchReminders = async () => {
    const res = await fetch(`${API_BASE_URL}/reminders`, { headers: authHeaders() });
    if (res.ok) {
      const data = await res.json();
      setReminders({ expired: data.expired || [], today: data.today || [], soon: data.soon || [] });
    }
  };

  const fetchActivity = async () => {
    const res = await fetch(`${API_BASE_URL}/activity`, { headers: authHeaders() });
    if (res.ok) setActivityEvents(await res.json());
  };

  const fetchShopping = async () => {
    const [itemsRes, sugRes] = await Promise.all([
      fetch(`${API_BASE_URL}/shopping-list`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/shopping-list/suggestions`, { headers: authHeaders() }),
    ]);
    if (itemsRes.ok) setShoppingItems(await itemsRes.json());
    if (sugRes.ok) setShoppingSuggestions(await sugRes.json());
  };

  const fetchInsights = async () => {
    const res = await fetch(`${API_BASE_URL}/insights/weekly`, { headers: authHeaders() });
    if (res.ok) setInsights(await res.json());
  };

  const fetchHousehold = async () => {
    const res = await fetch(`${API_BASE_URL}/household`, { headers: authHeaders() });
    if (res.ok) setHousehold(await res.json());
  };

  useEffect(() => {
    if (auth) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const inProfile = profileMenuRef.current?.contains(event.target);
      const inPages = pagesMenuRef.current?.contains(event.target);
      if (!inProfile) setIsProfileMenuOpen(false);
      if (!inPages) setIsPagesMenuOpen(false);
    };
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
        setIsPagesMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

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
        setEditingItem(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItem = async (updatedItem) => {
    if (!updatedItem?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/items/${updatedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          name: updatedItem.name,
          category: updatedItem.category,
          expiry: updatedItem.expiry,
          quantity: updatedItem.quantity || 1,
          unit: updatedItem.unit,
          notes: updatedItem.notes,
          image_url: updatedItem.image_url,
          barcode: updatedItem.barcode,
          added_date: updatedItem.added_date,
        }),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        fetchData();
        setIsModalOpen(false);
        setEditingItem(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const upsertPantryItem = async (existingItem, nextQuantity) => {
    if (!existingItem?.id) return;
    if (nextQuantity <= 0) {
      await fetch(`${API_BASE_URL}/items/${existingItem.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      return;
    }
    await fetch(`${API_BASE_URL}/items/${existingItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        name: existingItem.name,
        category: existingItem.category,
        expiry: existingItem.expiry,
        quantity: nextQuantity,
        unit: existingItem.unit,
        notes: existingItem.notes,
        image_url: existingItem.image_url,
        barcode: existingItem.barcode,
        added_date: existingItem.added_date,
      }),
    });
  };

  const handleConsumeItem = async (itemId, amount = 1) => {
    try {
      const res = await fetch(`${API_BASE_URL}/items/${itemId}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.undo_token) setUndoToken(data.undo_token);
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUseRecipeIngredients = async (recipe) => {
    const ingredients = recipe?.ingredients || [];
    if (!ingredients.length) return;
    const updates = [];
    for (const ingredient of ingredients) {
      const ingredientName = (ingredient.name || "").trim().toLowerCase();
      if (!ingredientName) continue;
      const matched = items.find((it) => (it.name || "").trim().toLowerCase() === ingredientName);
      if (!matched) continue;
      const currentQty = Number(matched.quantity) || 1;
      updates.push(upsertPantryItem(matched, currentQty - 1));
    }
    if (!updates.length) return;
    try {
      await Promise.all(updates);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUndo = async () => {
    if (!undoToken) return;
    setUndoLoading(true);
    try {
      await fetch(`${API_BASE_URL}/actions/undo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ undo_token: undoToken }),
      });
      setUndoToken(null);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setUndoLoading(false);
    }
  };

  const common = {
    items,
    stats,
    reminders,
    activityEvents,
    loading,
    error,
    isModalOpen,
    onCloseModal: () => { setIsModalOpen(false); setEditingItem(null); },
    onAddItemClick: () => { setEditingItem(null); setIsModalOpen(true); },
    onEditItem: (item) => { setEditingItem(item); setIsModalOpen(true); },
    onAddItem: handleAddItem,
    onUpdateItem: handleUpdateItem,
    onConsumeItem: handleConsumeItem,
  };

  const profileInitial =
    (profile?.name || profile?.email || auth?.user?.email || "U").trim().charAt(0).toUpperCase();
  const profilePhotoSrc = profile?.photo_url
    ? (profile.photo_url.startsWith("http") ? profile.photo_url : `${API_BASE_URL}${profile.photo_url}`)
    : "";
  const currentPage = MAIN_PAGES.find((p) => p.view === activeView) || MAIN_PAGES[0];

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
        <nav className="topnav-actions" aria-label="Main navigation">
          <div className="pages-menu-wrap" ref={pagesMenuRef}>
            <button
              type="button"
              className={`pages-menu-trigger ${isPagesMenuOpen ? "open" : ""}`}
              onClick={() => {
                setIsPagesMenuOpen((v) => !v);
                setIsProfileMenuOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={isPagesMenuOpen}
              aria-controls="pages-menu-dropdown"
              id="pages-menu-button"
            >
              <span className="pages-menu-trigger-icon" aria-hidden>
                <IconMenu size={20} />
              </span>
              <span className="pages-menu-current">{currentPage.label}</span>
              <span className="pages-menu-chevron" aria-hidden />
            </button>
            {isPagesMenuOpen && (
              <div
                className="pages-menu-dropdown"
                id="pages-menu-dropdown"
                role="menu"
                aria-labelledby="pages-menu-button"
              >
                {MAIN_PAGES.map(({ view, label, Icon }) => (
                  <button
                    key={view}
                    type="button"
                    role="menuitem"
                    className={`pages-menu-item ${activeView === view ? "active" : ""}`}
                    onClick={() => {
                      setActiveView(view);
                      setIsPagesMenuOpen(false);
                    }}
                  >
                    <span className="pages-menu-item-icon" aria-hidden>
                      <Icon size={20} />
                    </span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="profile-menu-trigger"
              onClick={() => {
                setIsProfileMenuOpen((v) => !v);
                setIsPagesMenuOpen(false);
              }}
              aria-haspopup="menu"
              aria-expanded={isProfileMenuOpen}
            >
              {profile?.photo_url ? (
                <img
                  src={profilePhotoSrc}
                  alt=""
                  className="profile-trigger-photo"
                />
              ) : (
                <span className="profile-trigger-fallback">{profileInitial}</span>
              )}
              <span className="profile-trigger-name">{profile?.name || auth?.user?.email || "Account"}</span>
            </button>
            {isProfileMenuOpen && (
              <div className="profile-menu-dropdown" role="menu">
                <button type="button" className="profile-menu-item danger" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            )}
          </div>
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
          <RecipesPage
            {...common}
            authToken={auth?.token}
            onUseRecipeIngredients={handleUseRecipeIngredients}
            onRecipeMissingAdded={fetchShopping}
          />
        )}
        {activeView === VIEWS.shopping && (
          <ShoppingListPage
            authToken={auth?.token}
            shoppingItems={shoppingItems}
            suggestions={shoppingSuggestions}
            onRefresh={fetchShopping}
          />
        )}
        {activeView === VIEWS.insights && (
          <InsightsPage insights={insights} />
        )}
        {activeView === VIEWS.household && (
          <HouseholdPage
            authToken={auth?.token}
            household={household}
            onRefresh={fetchHousehold}
            onSharingModeChanged={fetchData}
          />
        )}
        {activeView === VIEWS.profile && (
          <ProfilePage
            authToken={auth?.token}
            profile={profile || auth?.user}
            onProfileUpdated={(nextProfile) => {
              setProfile(nextProfile);
              setAuth((prev) => ({ ...prev, user: nextProfile }));
              localStorage.setItem("user", JSON.stringify(nextProfile));
            }}
          />
        )}
      </main>

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onAddItem={handleAddItem}
        onUpdateItem={handleUpdateItem}
        initialValues={editingItem}
      />
      <UndoSnackbar
        visible={!!undoToken}
        loading={undoLoading}
        onUndo={handleUndo}
        onClose={() => setUndoToken(null)}
      />
    </div>
  );
}

export default App;
