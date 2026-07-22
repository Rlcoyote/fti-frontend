import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function ActivityLogPage() {
  const { users, can } = useApp();
  const isAdmin = can("view_activity_log");
  const [activity, setActivity] = useState([]);
  const [online, setOnline] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("log"); // "log" | "sessions"
  // v28.391 — ?tab= deep link from the gear submenu.
  const location = useLocation();
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (["log", "sessions"].includes(t)) setTab(t);
  }, [location.search]);
  const [filterUser, setFilterUser] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const isMob = winW < 900;

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const [actR, onR, sesR] = await Promise.all([
          fetch(`${API_URL}/activity?limit=500`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/activity/online`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/activity/sessions?limit=200`).then((r) => (r.ok ? r.json() : [])),
        ]);
        setActivity(actR);
        setOnline(onR);
        setSessions(sesR);
      } catch {
        /* ignore */
      }
      setLoading(false);
    };
    load();
    // Live polling every 30s — log, online users, and paired sessions all refresh together.
    const interval = setInterval(async () => {
      try {
        const [actR, onR, sesR] = await Promise.all([
          fetch(`${API_URL}/activity?limit=500`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/activity/online`).then((r) => (r.ok ? r.json() : null)),
          fetch(`${API_URL}/activity/sessions?limit=200`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (actR) setActivity(actR);
        if (onR) setOnline(onR);
        if (sesR) setSessions(sesR);
      } catch {
        /* ignore */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const filtered = useMemo(() => {
    let list = [...activity];
    if (filterUser !== "All") list = list.filter((a) => a.user_id === filterUser);
    if (filterAction !== "All") list = list.filter((a) => a.action === filterAction);
    if (dateFrom) list = list.filter((a) => a.created_at >= dateFrom);
    if (dateTo) list = list.filter((a) => a.created_at <= dateTo + "T23:59:59");
    // v28.370 — free-text search over the whole row (user, action, details,
    // IP, ids). Matches anywhere, case-insensitive — "300178" finds every
    // event whose details mention that ticket. Searches the loaded window
    // (last 500 events), same as the dropdown filters.
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter((a) => JSON.stringify(a).toLowerCase().includes(q));
    }
    return list;
  }, [activity, filterUser, filterAction, dateFrom, dateTo, searchText]);

  const uniqueActions = [...new Set(activity.map((a) => a.action))].sort();

  const actionColor = (action) => {
    if (action === "login") return { color: C.green, bg: C.greenB };
    if (action === "logout") return { color: C.muted, bg: C.steel };
    if (action.includes("delete") || action.includes("archive")) return { color: C.red, bg: C.redB };
    if (action.includes("create") || action.includes("add")) return { color: C.blue, bg: C.blueB };
    if (action.includes("edit") || action.includes("update") || action.includes("save")) return { color: C.yellow, bg: C.yellowB };
    return { color: C.muted, bg: C.steel };
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  // v28.45 — after-hours flag. Activity outside the configured ops window
  // (default 5am–10pm local time) gets a small moon glyph. Useful forensic
  // signal: "why did Joe log in at 2am?" Owner/admin can adjust the window
  // later via settings if FTI's ops hours shift. Returns null when the
  // event is in-window (no chrome).
  const AFTER_HOURS_START = 22; // 10 PM
  const AFTER_HOURS_END = 5; // 5 AM
  const isAfterHours = (ts) => {
    if (!ts) return false;
    const h = new Date(ts).getHours();
    return h >= AFTER_HOURS_START || h < AFTER_HOURS_END;
  };

  const formatIP = (ip) => {
    if (!ip) return "—";
    // Clean up IPv6 localhost
    if (ip === "::1" || ip === "::ffff:127.0.0.1") return "localhost";
    // Strip IPv6 prefix
    if (ip.startsWith("::ffff:")) return ip.slice(7);
    return ip;
  };

  // v28.48 — Tier 3: render IP with city/region appended when available.
  // Backend services/geoIp.js fills `geo` on each row; null when the IP
  // is private/loopback or the resolver couldn't identify the range.
  const formatIPWithGeo = (ip, geo) => {
    const ipText = formatIP(ip);
    if (!geo) return ipText;
    const parts = [geo.city, geo.region].filter(Boolean);
    if (parts.length === 0) return ipText;
    return `${ipText} · ${parts.join(", ")}`;
  };

  // Human-friendly duration: "2h 15m", "35m", "1m 12s" — honest about minutes vs hours.
  const formatDuration = (ms) => {
    if (ms == null || ms < 0) return "—";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    if (m > 0) return s > 0 && m < 5 ? `${m}m ${s}s` : `${m}m`;
    return `${s}s`;
  };

  // Render audit-style details ({from, to, note}) into a compact inline summary for the log table.
  // Keeps the one-line row constraint but shows meaningful context instead of raw JSON.
  const renderDetails = (d) => {
    if (!d) return "—";
    let obj = d;
    if (typeof d === "string") {
      try {
        obj = JSON.parse(d);
      } catch {
        return d.slice(0, 80);
      }
    }
    if (typeof obj !== "object") return String(obj).slice(0, 80);
    const parts = [];
    if (obj.note || obj.notes) parts.push(String(obj.note || obj.notes));
    if (obj.from && obj.to) {
      const summarize = (v) => {
        if (v == null) return "∅";
        if (typeof v !== "object") return String(v);
        const keys = Object.keys(v);
        if (keys.length === 1) return `${keys[0]}: ${v[keys[0]]}`;
        return keys
          .slice(0, 2)
          .map((k) => `${k}:${v[k]}`)
          .join(", ");
      };
      parts.push(`${summarize(obj.from)} → ${summarize(obj.to)}`);
    } else if (obj.count != null) {
      parts.push(`count: ${obj.count}`);
    } else if (Object.keys(obj).length > 0 && parts.length === 0) {
      // Fallback: short key:value render
      parts.push(
        Object.entries(obj)
          .slice(0, 3)
          .map(([k, v]) => `${k}: ${typeof v === "object" ? "…" : v}`)
          .join(" · "),
      );
    }
    return parts.length > 0 ? parts.join(" · ") : "—";
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: "24px 28px", textAlign: "center", color: C.muted, fontSize: 14, paddingTop: 80 }}>
        Activity log is restricted to Owner and Admin roles.
      </div>
    );
  }

  return (
    <div style={{ padding: isMob ? "16px 12px" : "24px 28px" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Activity Log</h1>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>User actions, login history, and session tracking. Owner/Admin only.</div>
      </div>

      {/* Online now — v28.26: green tint background is hardcoded (doesn't
          flip with theme), so text colors inside it are also hardcoded to
          dark navy for legibility on the green. Reggie's call: "make the
          wording below it dark blue." */}
      <div style={{ background: C.greenB, border: `1px solid ${C.green}44`, borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: "0.08em", marginBottom: 6 }}>ONLINE NOW ({online.length})</div>
        {online.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted }}>No active users in the last 15 minutes</div>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {online.map((u) => (
              <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue }}>{u.user_name}</span>
                <span style={{ fontSize: 10, color: C.muted }}>{formatIP(u.ip_address)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab switcher — Log / Sessions */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
        {[
          { k: "log", label: "LOG", count: activity.filter((a) => a.action !== "heartbeat").length },
          { k: "sessions", label: "SESSIONS", count: sessions.length },
        ].map((t) => {
          const active = tab === t.k;
          return (
            <button
              className="fti-btn"
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                background: active ? C.cardBg : "transparent",
                border: active ? `1px solid ${C.border}` : "1px solid transparent",
                borderBottom: active ? `1px solid ${C.cardBg}` : "1px solid transparent",
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                marginBottom: active ? -1 : 0,
                color: active ? C.blue : C.muted,
                padding: "8px 18px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                letterSpacing: "0.08em",
                fontFamily: "'Arial', sans-serif",
              }}
            >
              {t.label} <span style={{ color: C.muted, fontWeight: 600 }}>({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Filters — only apply to the LOG tab. Sessions are pre-paired server-side. */}
      {tab === "log" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>SEARCH</label>
            <input
              type="text"
              style={{ ...inputStyle, width: 210 }}
              placeholder="Ticket #, name, anything…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>USER</label>
            <select style={{ ...inputStyle, width: 180 }} value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              <option value="All">All Users</option>
              {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ACTION</label>
            <select style={{ ...inputStyle, width: 160 }} value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option value="All">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>FROM</label>
            <input type="date" style={{ ...inputStyle, width: 150 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>TO</label>
            <input type="date" style={{ ...inputStyle, width: 150 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>
      ) : tab === "log" ? (
        filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>No activity recorded yet.</div>
        ) : (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 780 }}>
                <div style={{ display: "grid", gridTemplateColumns: "140px 120px 1fr 120px 1.5fr", background: C.navy, padding: "10px 14px" }}>
                  {["TIME", "USER", "ACTION", "IP ADDRESS", "DETAILS"].map((h) => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
                      {h}
                    </div>
                  ))}
                </div>
                {filtered.slice(0, 200).map((a, i) => {
                  const ac = actionColor(a.action);
                  const afterHrs = isAfterHours(a.created_at);
                  return (
                    <div
                      key={a.id}
                      title={a.details ? (typeof a.details === "string" ? a.details : JSON.stringify(a.details, null, 2)) : ""}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "140px 120px 1fr 120px 1.5fr",
                        padding: "8px 14px",
                        borderBottom: `1px solid ${C.border}22`,
                        background: i % 2 === 0 ? C.cardBg : C.steel,
                      }}
                    >
                      <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                        {/* v28.45 — after-hours glyph (event outside 5am–10pm local). */}
                        {afterHrs && (
                          <span title="After-hours activity (outside 5am–10pm)" style={{ color: C.orange, fontSize: 11 }}>
                            🌙
                          </span>
                        )}
                        {formatTime(a.created_at)}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.user_name || "—"}</div>
                      <div>
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 3,
                            background: ac.bg,
                            color: ac.color,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {a.action.toUpperCase()}
                        </span>
                        {a.entity_type && (
                          <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>
                            {a.entity_type} {a.entity_id ? `#${a.entity_id}` : ""}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{formatIPWithGeo(a.ip_address, a.geo)}</div>
                      <div style={{ fontSize: 10, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {renderDetails(a.details)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )
      ) : // SESSIONS tab — paired login→logout with duration and status
      sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>No sessions recorded yet.</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 760 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 140px 140px 100px 80px 120px", background: C.navy, padding: "10px 14px" }}>
                {["USER", "LOGIN", "LOGOUT", "DURATION", "STATUS", "IP"].map((h) => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
                    {h}
                  </div>
                ))}
              </div>
              {sessions.map((s, i) => {
                const loginMs = new Date(s.login_at).getTime();
                const endMs = s.logout_at ? new Date(s.logout_at).getTime() : s.last_seen_at ? new Date(s.last_seen_at).getTime() : loginMs;
                const duration = endMs - loginMs;
                const isOpen = s.status === "open";
                return (
                  <div
                    key={`${s.user_id}-${s.login_at}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 140px 140px 100px 80px 120px",
                      padding: "8px 14px",
                      borderBottom: `1px solid ${C.border}22`,
                      background: i % 2 === 0 ? C.cardBg : C.steel,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{s.user_name || "—"}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{formatTime(s.login_at)}</div>
                    <div style={{ fontSize: 11, color: isOpen ? C.muted : C.text }}>
                      {s.logout_at ? (
                        formatTime(s.logout_at)
                      ) : (
                        <span style={{ fontStyle: "italic" }}>(active — last seen {formatTime(s.last_seen_at || s.login_at)})</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{formatDuration(duration)}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {/* v28.49 — Three statuses now:
                              OPEN     (truly active in last 15 min)
                              ABANDONED (no logout but no recent activity;
                                        backend synthesized a logout at
                                        last_seen_at on the previous request)
                              CLOSED   (explicit logout, or older synthesized one) */}
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 3,
                          letterSpacing: "0.06em",
                          background: s.status === "open" ? C.greenB : s.status === "abandoned" ? C.yellowB : C.steel,
                          color: s.status === "open" ? C.green : s.status === "abandoned" ? C.orange : C.muted,
                          alignSelf: "flex-start",
                        }}
                      >
                        {s.status === "open" ? "OPEN" : s.status === "abandoned" ? "ABANDONED" : "CLOSED"}
                      </span>
                      {/* v28.48 — concurrent session flag fires only on
                            truly OPEN sessions (not abandoned). Counts
                            other OPEN sessions for the same user. */}
                      {s.status === "open" && s.concurrent_open_count > 1 && (
                        <span
                          title={`${s.concurrent_open_count} simultaneous open sessions for ${s.user_name}`}
                          style={{
                            fontSize: 8,
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: 3,
                            letterSpacing: "0.06em",
                            background: C.redB,
                            color: C.red,
                            border: `1px solid ${C.red}44`,
                            alignSelf: "flex-start",
                          }}
                        >
                          ⚠ {s.concurrent_open_count}× CONCURRENT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{formatIPWithGeo(s.ip_address, s.geo)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActivityLogPage;
