import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_URL, setCurrentUser as setGlobalUser } from "./config.js";
import BrandedSplash from "./BrandedSplash.jsx";

// ─── AppContext ──────────────────────────────────────────────────────────────
// Single source of truth for app-wide state: currentUser, settings, users,
// customers, qbItems, assets. Page-level state (jobs, tickets, todos,
// inventory, jsas, deletedTickets) stays in FTIDashboard.
//
// Consumers call useApp() to read state and call refresh<Thing>() after a
// mutation that needs to propagate. Splash renders while the initial fetch
// is in flight after login.

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp() called outside <AppProvider>");
  return ctx;
}

// Read currentUser from sessionStorage synchronously on first render so we
// don't need a separate "authChecked" flicker gate like the old App.jsx had.
function readSavedUser() {
  try {
    const raw = sessionStorage.getItem("fti_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    sessionStorage.removeItem("fti_user");
    return null;
  }
}

// qb-items API → shape the rest of the app expects.
// Must match the transform that used to live in FTIDashboard.jsx lines 185-190.
function mapQbItem(q) {
  return {
    code: q.code,
    desc: q.description,
    um: q.unit_measure,
    price: Number(q.price),
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(readSavedUser);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [qbItems, setQbItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Keep the config.js mutable singleton in sync with currentUser. This is
  // a compatibility shim for getCurrentUser() callers (TodoPage, TodoComponents,
  // utils.todoVisible, TicketDetail) that were not migrated in v26.92.
  useEffect(() => {
    setGlobalUser(currentUser?.name || "");
  }, [currentUser]);

  // ── Fetch functions (also used as refresh handles) ──
  const refreshSettings = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/settings`);
      if (r.ok) setSettings(await r.json());
    } catch (err) {
      console.error("AppContext: settings fetch failed", err);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/users`);
      if (r.ok) setUsers(await r.json() || []);
    } catch (err) {
      console.error("AppContext: users fetch failed", err);
    }
  }, []);

  const refreshCustomers = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/customers`);
      if (r.ok) setCustomers(await r.json() || []);
    } catch (err) {
      console.error("AppContext: customers fetch failed", err);
    }
  }, []);

  const refreshQbItems = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/qb-items`);
      if (r.ok) {
        const raw = await r.json();
        setQbItems((raw || []).map(mapQbItem));
      }
    } catch (err) {
      console.error("AppContext: qb-items fetch failed", err);
    }
  }, []);

  const refreshAssets = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/assets`);
      if (r.ok) setAssets(await r.json() || []);
    } catch (err) {
      console.error("AppContext: assets fetch failed", err);
    }
  }, []);

  // ── Initial load on authentication ──
  useEffect(() => {
    if (!currentUser) {
      // Logged out — clear everything so the next login can't see stale state.
      setSettings(null);
      setUsers([]);
      setCustomers([]);
      setQbItems([]);
      setAssets([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      refreshSettings(),
      refreshUsers(),
      refreshCustomers(),
      refreshQbItems(),
      refreshAssets(),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentUser, refreshSettings, refreshUsers, refreshCustomers, refreshQbItems, refreshAssets]);

  // ── Auth mutations ──
  const setCurrentUser = useCallback((user) => {
    if (user) {
      sessionStorage.setItem("fti_user", JSON.stringify(user));
    } else {
      sessionStorage.removeItem("fti_user");
    }
    setCurrentUserState(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    // Force navigation to root so next login lands on the dashboard,
    // not the last visited page (BrowserRouter preserves the URL path).
    window.location.href = '/';
  }, [setCurrentUser]);

  // ── Derived ──
  const { userNames, userIdByName } = useMemo(() => {
    const names = users.map(u => u.name);
    const idByName = {};
    users.forEach(u => { idByName[u.name] = u.id; });
    return { userNames: names, userIdByName: idByName };
  }, [users]);

  const value = useMemo(() => ({
    currentUser, setCurrentUser, logout,
    settings, users, customers, qbItems, assets,
    userNames, userIdByName,
    loading,
    refreshSettings, refreshUsers, refreshCustomers, refreshQbItems, refreshAssets,
  }), [
    currentUser, setCurrentUser, logout,
    settings, users, customers, qbItems, assets,
    userNames, userIdByName, loading,
    refreshSettings, refreshUsers, refreshCustomers, refreshQbItems, refreshAssets,
  ]);

  // Show splash while the initial fetch is in flight post-login. Pre-login
  // (currentUser === null) we render children immediately so LoginScreen
  // paints without a splash flash.
  if (currentUser && loading) {
    return (
      <AppContext.Provider value={value}>
        <BrandedSplash />
      </AppContext.Provider>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
