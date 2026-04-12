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

  // Keep the config.js mutable singleton in sync with currentUser.
  useEffect(() => {
    setGlobalUser(currentUser?.name || "");
  }, [currentUser]);

  // ── 30-minute idle auto-logout ──
  useEffect(() => {
    if (!currentUser) return;
    let timer;
    const IDLE_MS = 30 * 60 * 1000; // 30 minutes
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.removeItem("fti_user");
        setCurrentUserState(null);
        setGlobalUser("");
        window.location.href = '/';
      }, IDLE_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // start the timer
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
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

  // ── Activity logging ──
  const logActivity = useCallback((action, entityType, entityId, details) => {
    // Fire-and-forget — don't block UI for logging
    fetch(`${API_URL}/activity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser?.id || null,
        user_name: currentUser?.name || null,
        action,
        entity_type: entityType || null,
        entity_id: entityId ? String(entityId) : null,
        details: details || null,
      }),
    }).catch(() => {}); // silent fail — logging should never break the app
  }, [currentUser]);

  // ── Auth mutations ──
  const setCurrentUser = useCallback((user) => {
    if (user) {
      sessionStorage.setItem("fti_user", JSON.stringify(user));
      // Log login
      fetch(`${API_URL}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, user_name: user.name, action: "login" }),
      }).catch(() => {});
    } else {
      sessionStorage.removeItem("fti_user");
    }
    setCurrentUserState(user);
  }, []);

  const logout = useCallback(() => {
    // Log logout before clearing user
    if (currentUser) {
      fetch(`${API_URL}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, action: "logout" }),
      }).catch(() => {});
    }
    setCurrentUser(null);
    window.location.href = '/';
  }, [setCurrentUser, currentUser]);

  // ── Derived ──
  const { userNames, userIdByName } = useMemo(() => {
    const names = users.map(u => u.name);
    const idByName = {};
    users.forEach(u => { idByName[u.name] = u.id; });
    return { userNames: names, userIdByName: idByName };
  }, [users]);

  const value = useMemo(() => ({
    currentUser, setCurrentUser, logout, logActivity,
    settings, users, customers, qbItems, assets,
    userNames, userIdByName,
    loading,
    refreshSettings, refreshUsers, refreshCustomers, refreshQbItems, refreshAssets,
  }), [
    currentUser, setCurrentUser, logout, logActivity,
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
