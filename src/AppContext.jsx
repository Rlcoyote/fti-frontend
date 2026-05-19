import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { API_URL, setCurrentUser as setGlobalUser, applyTheme, getTheme } from "./config.js";
import BrandedSplash from "./BrandedSplash.jsx";
import { NoticeModal } from "./SharedUI.jsx";
import { makeCan } from "./utils.js";

// ─── Fetch wrapper: auto-attach JWT on API calls (v27.65) ───────────────────
// Installed once on module load. Every fetch() to our API_URL gets the
// Authorization: Bearer <token> header automatically; any other URL passes
// through unchanged. No existing fetch() call site needs to change.
//
// If the token is missing (not logged in, or before /auth/login completes),
// no header is attached — backend reads/mutations stay as-is.
(function installFetchAuthWrapper() {
  if (typeof window === "undefined" || window.__ftiFetchWrapped) return;
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (url.startsWith(API_URL)) {
        const raw = sessionStorage.getItem("fti_user");
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed && parsed.token;
          if (token) {
            const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
            if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
            init = { ...init, headers };
          }
        }
      }
    } catch (_e) {
      // Fetch wrapper must never break the actual request — fail open.
    }
    return origFetch(input, init);
  };
  window.__ftiFetchWrapped = true;
})();

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

// Role list fallback — used if /api/config/roles is unavailable. Must stay in
// sync with backend src/routes/config.js ROLES. The whole point of the API
// fetch is to eliminate drift; this fallback just keeps the UI working if the
// endpoint ever fails.
const DEFAULT_ROLES = {
  all: ["owner", "admin", "manager", "hse", "lead", "mechanic", "salesman", "field"],
  allowedForEmployee: ["admin", "manager", "hse", "lead", "mechanic", "salesman", "field"],
  privileged: ["owner", "admin"],
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUserState] = useState(readSavedUser);
  const [settings, setSettings] = useState(null);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [qbItems, setQbItems] = useState([]);
  const [assets, setAssets] = useState([]);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [loading, setLoading] = useState(false);

  // ── Theme (v28.25) ──
  // Mirrors the persisted localStorage value; on mount, config.js has
  // already called applyTheme(getTheme()) synchronously so first paint
  // matches preference. setTheme below re-applies (mutating the global
  // C palette in place), persists to localStorage, and bumps state to
  // re-render the tree. Components that read C.X get fresh values on
  // re-render because C is the same object reference with new property
  // values.
  const [theme, setThemeState] = useState(() => getTheme());
  const setTheme = useCallback((t) => {
    const next = t === "dark" ? "dark" : "light";
    applyTheme(next);
    setThemeState(next);
  }, []);
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

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
        window.location.href = "/";
      }, IDLE_MS);
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
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
      if (r.ok) setUsers((await r.json()) || []);
    } catch (err) {
      console.error("AppContext: users fetch failed", err);
    }
  }, []);

  const refreshCustomers = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/customers`);
      if (r.ok) setCustomers((await r.json()) || []);
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
      if (r.ok) setAssets((await r.json()) || []);
    } catch (err) {
      console.error("AppContext: assets fetch failed", err);
    }
  }, []);

  const refreshRoles = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/config/roles`);
      if (r.ok) {
        const data = await r.json();
        // Server is source of truth; only accept if shape looks right.
        if (data && Array.isArray(data.all) && Array.isArray(data.allowedForEmployee)) {
          setRoles(data);
        }
      }
    } catch (err) {
      console.error("AppContext: roles fetch failed (using fallback)", err);
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
    Promise.all([refreshSettings(), refreshUsers(), refreshCustomers(), refreshQbItems(), refreshAssets(), refreshRoles()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser, refreshSettings, refreshUsers, refreshCustomers, refreshQbItems, refreshAssets, refreshRoles]);

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
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentUser?.id, currentUser?.name]);

  // ── Activity logging ──
  const logActivity = useCallback(
    (action, entityType, entityId, details) => {
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
    },
    [currentUser],
  );

  // ── Auth mutations ──
  const setCurrentUser = useCallback((user) => {
    if (user) {
      sessionStorage.setItem("fti_user", JSON.stringify(user));
      // v28.47 — Tier 2: capture GPS at login if the browser permits.
      // Forensic value: "where was this user when they signed in?" — answers
      // the after-hours / unusual-IP follow-up question. Geolocation is
      // async and can be denied; we post the login row immediately with
      // whatever GPS data we have, then update with coordinates if the
      // permission resolves quickly. Two writes are noisier than one but
      // the alternative (delayed login row) costs more in observability.
      const postLogin = (geoDetails) => {
        fetch(`${API_URL}/activity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            user_name: user.name,
            action: "login",
            details: geoDetails || null,
          }),
        }).catch(() => {});
      };
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        // 6-second timeout — login row should land promptly even if the
        // user takes time to grant the permission. After timeout we post
        // without GPS; if permission resolves later we write a follow-up
        // row with the coordinates so the forensic trail still has them.
        let resolved = false;
        const fallback = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          postLogin(null);
        }, 6000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            if (resolved) {
              // Login row already posted without GPS — write a follow-up.
              fetch(`${API_URL}/activity`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: user.id,
                  user_name: user.name,
                  action: "login_gps",
                  details: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: Math.round(pos.coords.accuracy) },
                }),
              }).catch(() => {});
              return;
            }
            resolved = true;
            clearTimeout(fallback);
            postLogin({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy_m: Math.round(pos.coords.accuracy) });
          },
          (err) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(fallback);
            postLogin({ gps_error: err.code === 1 ? "denied" : err.code === 2 ? "unavailable" : "timeout" });
          },
          { enableHighAccuracy: false, timeout: 5500, maximumAge: 60000 },
        );
      } else {
        postLogin({ gps_error: "no_navigator" });
      }
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
    window.location.href = "/";
  }, [setCurrentUser, currentUser]);

  // ── Derived ──
  const { userNames, userIdByName } = useMemo(() => {
    const names = users.map((u) => u.name);
    const idByName = {};
    users.forEach((u) => {
      idByName[u.name] = u.id;
    });
    return { userNames: names, userIdByName: idByName };
  }, [users]);

  // v28.133 (permissions audit Phase 5.4) — single source of can() for the
  // whole app, consumed via useApp(). v28.167 — resolution lifted into
  // makeCan() in utils.js so it is unit-testable; behavior is unchanged.
  // No component should hardcode a role check — call can(key).
  const can = useMemo(() => makeCan(currentUser), [currentUser]);

  const value = useMemo(
    () => ({
      can,
      currentUser,
      setCurrentUser,
      logout,
      logActivity,
      settings,
      users,
      customers,
      qbItems,
      assets,
      roles,
      userNames,
      userIdByName,
      loading,
      refreshSettings,
      refreshUsers,
      refreshCustomers,
      refreshQbItems,
      refreshAssets,
      refreshRoles,
      showNotice,
      theme,
      setTheme,
      toggleTheme,
    }),
    [
      can,
      currentUser,
      setCurrentUser,
      logout,
      logActivity,
      settings,
      users,
      customers,
      qbItems,
      assets,
      roles,
      userNames,
      userIdByName,
      loading,
      refreshSettings,
      refreshUsers,
      refreshCustomers,
      refreshQbItems,
      refreshAssets,
      refreshRoles,
      showNotice,
      theme,
      setTheme,
      toggleTheme,
    ],
  );

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
