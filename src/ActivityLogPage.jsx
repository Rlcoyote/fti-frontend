import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function ActivityLogPage() {
  const { users, currentUser } = useApp();
  const isAdmin = ["owner", "admin"].includes(currentUser?.role);
  const [activity, setActivity] = useState([]);
  const [online, setOnline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => { const h = () => setWinW(window.innerWidth); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const isMob = winW < 900;

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      try {
        const [actR, onR] = await Promise.all([
          fetch(`${API_URL}/activity?limit=500`).then(r => r.ok ? r.json() : []),
          fetch(`${API_URL}/activity/online`).then(r => r.ok ? r.json() : []),
        ]);
        setActivity(actR);
        setOnline(onR);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
    // Poll online status every 30 seconds
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`${API_URL}/activity/online`);
        if (r.ok) setOnline(await r.json());
      } catch { /* ignore */ }
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const filtered = useMemo(() => {
    let list = [...activity];
    if (filterUser !== "All") list = list.filter(a => a.user_id === filterUser);
    if (filterAction !== "All") list = list.filter(a => a.action === filterAction);
    if (dateFrom) list = list.filter(a => a.created_at >= dateFrom);
    if (dateTo) list = list.filter(a => a.created_at <= dateTo + "T23:59:59");
    return list;
  }, [activity, filterUser, filterAction, dateFrom, dateTo]);

  const uniqueActions = [...new Set(activity.map(a => a.action))].sort();

  const actionColor = (action) => {
    if (action === "login") return { color: C.green, bg: "#e6f5ec" };
    if (action === "logout") return { color: C.muted, bg: C.steel };
    if (action.includes("delete") || action.includes("archive")) return { color: C.red, bg: "#fdecea" };
    if (action.includes("create") || action.includes("add")) return { color: C.blue, bg: "#e8f0fb" };
    if (action.includes("edit") || action.includes("update") || action.includes("save")) return { color: "#8a6500", bg: "#fdf5d8" };
    return { color: C.muted, bg: C.steel };
  };

  const formatTime = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-US", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  const formatIP = (ip) => {
    if (!ip) return "—";
    // Clean up IPv6 localhost
    if (ip === "::1" || ip === "::ffff:127.0.0.1") return "localhost";
    // Strip IPv6 prefix
    if (ip.startsWith("::ffff:")) return ip.slice(7);
    return ip;
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
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          User actions, login history, and session tracking. Owner/Admin only.
        </div>
      </div>

      {/* Online now */}
      <div style={{ background: "#e6f5ec", border: `1px solid ${C.green}44`, borderRadius: 6, padding: "12px 16px", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: "0.08em", marginBottom: 6 }}>
          ONLINE NOW ({online.length})
        </div>
        {online.length === 0 ? (
          <div style={{ fontSize: 12, color: C.muted }}>No active users in the last 15 minutes</div>
        ) : (
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {online.map(u => (
              <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{u.user_name}</span>
                <span style={{ fontSize: 10, color: C.muted }}>{formatIP(u.ip_address)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={labelStyle}>USER</label>
          <select style={{ ...inputStyle, width: 180 }} value={filterUser} onChange={e => setFilterUser(e.target.value)}>
            <option value="All">All Users</option>
            {(users || []).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>ACTION</label>
          <select style={{ ...inputStyle, width: 160 }} value={filterAction} onChange={e => setFilterAction(e.target.value)}>
            <option value="All">All Actions</option>
            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>FROM</label>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>TO</label>
          <input type="date" style={{ ...inputStyle, width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>No activity recorded yet.</div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ minWidth: 700 }}>
              <div style={{ display: "grid", gridTemplateColumns: "140px 100px 1fr 120px 120px", background: C.darkBlue, padding: "10px 14px" }}>
                {["TIME", "USER", "ACTION", "IP ADDRESS", "DETAILS"].map(h => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
                ))}
              </div>
              {filtered.slice(0, 200).map((a, i) => {
                const ac = actionColor(a.action);
                return (
                  <div key={a.id} style={{ display: "grid", gridTemplateColumns: "140px 100px 1fr 120px 120px", padding: "8px 14px", borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                    <div style={{ fontSize: 11, color: C.muted }}>{formatTime(a.created_at)}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.user_name || "—"}</div>
                    <div>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 3, background: ac.bg, color: ac.color, letterSpacing: "0.04em" }}>{a.action.toUpperCase()}</span>
                      {a.entity_type && <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>{a.entity_type} {a.entity_id ? `#${a.entity_id}` : ""}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{formatIP(a.ip_address)}</div>
                    <div style={{ fontSize: 10, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.details ? (typeof a.details === "string" ? a.details : JSON.stringify(a.details)).slice(0, 50) : "—"}
                    </div>
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
