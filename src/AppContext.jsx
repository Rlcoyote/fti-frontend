import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_URL, setCurrentUser as setGlobalUser } from "./config.js";
import BrandedSplash from "./BrandedSplash.jsx";
import { NoticeModal } from "./SharedUI.jsx";

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

  // ── Global notice (replaces ad-hoc window.alert() calls) ──
  // One NoticeModal mounted at the Provider; any component calls
  // useApp().showNotice(title, message, variant) to surface a styled,
  // dismissible modal. User must click OK — no ephemeral toasts.
  const [notice, setNotice] = useState(null);
  const showNotice = useCallback((title, message, variant = "ok") => {
    setNotice({ title, message, variant });
  }, []);
  const clearNotice = useCallback(() => setNotice(null), []);

  // Keep the config.js mutable singleton in sync with currentUser.
  useEffect(() => {
    setGlobalUser(currentUser?.name || "");
  }, [currentUser]);

  // ── Idle auto-logout (per-user, set by owner/admin on Users page) ──
  useEffect(() => {
    if (!currentUser) return;
    const timeoutMin = parseInt(currentUser.session_timeout_minutes) || 30;
    if (timeoutMin <= 0) return; // 0 = "Never" = disabled
    const IDLE_MS = timeoutMin * 60 * 1000;
    let timer;
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
    resetTimer();
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

  // ── Heartbeat — keeps the logged-in user visible in /activity/online while the app is open.
  // Backend "online" window is 15 minutes; we ping every 10 so idle users don't drop off.
  // Also fire on visibilitychange so mobile browsers (which throttle setInterval on backgrounded tabs)
  // report "online" immediately when the user returns to the tab. Heartbeat rows are filtered out of
  // the main activity log query server-side (see GET /api/activity).
  useEffect(() => {
    if (!currentUser?.id) return;
    const ping = () => {
      fetch(`${API_URL}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.id, user_name: currentUser.name, action: "heartbeat" }),
      }).catch(() => {});
    };
    ping(); // fire once immediately so session-restored users appear online without waiting 10 min
    const interval = setInterval(ping, 10 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentUser?.id, currentUser?.name]);

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
    showNotice,
  }), [
    currentUser, setCurrentUser, logout, logActivity,
    settings, users, customers, qbItems, assets,
    userNames, userIdByName, loading,
    refreshSettings, refreshUsers, refreshCustomers, refreshQbItems, refreshAssets,
    showNotice,
  ]);

  // Show splash while the initial fetch is in flight post-login. Pre-login
  // (currentUser === null) we render children immediately so LoginScreen
  // paints without a splash flash.
  if (currentUser && loading) {
    return (
      <AppContext.Provider value={value}>
        <BrandedSplash />
        {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={clearNotice} />}
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={value}>
      {children}
      {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={clearNotice} />}
    </AppContext.Provider>
  );
}
