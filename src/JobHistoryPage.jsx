import { useState, useMemo } from "react";
import { C, STATUS_CONFIG, STATUS_ORDER } from "./config.js";
import { formatDate } from "./utils.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

function JobHistoryPage({ jobs, onNavigateJob }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const allJobs = jobs.filter(j => j.status !== "Deleted");

  const filtered = allJobs.filter(j => {
    if (statusFilter !== "All" && j.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      const match = String(j.id).includes(s) ||
        (j.customer || "").toLowerCase().includes(s) ||
        (j.location || "").toLowerCase().includes(s) ||
        (j.wells || []).some(w => w.toLowerCase().includes(s));
      if (!match) return false;
    }
    if (dateFrom && j.dateStarted && j.dateStarted < dateFrom) return false;
    if (dateTo && j.dateStarted && j.dateStarted > dateTo) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => (b.dateStarted || "").localeCompare(a.dateStarted || ""));

  return (
    <div style={{ padding: "24px 28px" }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Work Order History</h1>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{allJobs.length} total · {filtered.length} shown</div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>SEARCH</label>
          <input style={inputStyle} value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Work order #, customer, well, location..." />
        </div>
        <div>
          <label style={labelStyle}>STATUS</label>
          <select style={{ ...inputStyle, width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All Statuses</option>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            <option value="flaggedCancel">FLAGGED</option>
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
        {(search || statusFilter !== "All" || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(""); setStatusFilter("All"); setDateFrom(""); setDateTo(""); }}
            style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.muted, padding: "8px 14px", borderRadius: 4, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>CLEAR</button>
        )}
      </div>

      {/* Results table — horizontal-scrollable when narrower than the grid's minimum */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <div style={{ minWidth: 720 }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 120px 100px 90px", background: C.darkBlue, padding: "10px 16px" }}>
              {["WORK ORDER #", "CUSTOMER", "LOCATION", "DATE", "WELLS", "STATUS"].map(h => (
                <div key={h} style={{ fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.1em" }}>{h}</div>
              ))}
            </div>
            {sorted.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>No jobs match your search.</div>
            )}
            {sorted.map((j, i) => {
              const cfg = STATUS_CONFIG[j.status] || { color: C.muted, bg: C.steel, label: j.status?.toUpperCase() || "—" };
              return (
                <div key={j.id} onClick={() => onNavigateJob(j.id)}
                  style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 120px 100px 90px", padding: "10px 16px",
                    borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel,
                    cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#e8f0fb"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? C.cardBg : C.steel}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{j.id}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{j.customer}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{j.location}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{formatDate(j.dateStarted) || "—"}</div>
                  <div style={{ fontSize: 12, color: C.muted }}>{j.wells?.length || 0} well{(j.wells?.length || 0) !== 1 ? "s" : ""}</div>
                  <div><span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 3, background: cfg.bg, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</span></div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


export default JobHistoryPage;
