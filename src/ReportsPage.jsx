import { useState, useEffect } from "react";
import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { fmtMoney, ticketTotal, REPORT_TABS } from "./reportHelpers.js";
import ReportRevenueTab from "./ReportRevenueTab.jsx";
import ReportOperationsTab from "./ReportOperationsTab.jsx";
import ReportCrewTab from "./ReportCrewTab.jsx";
import ReportEfficiencyTab from "./ReportEfficiencyTab.jsx";
import ReportInventoryTab from "./ReportInventoryTab.jsx";

// ─── Reports orchestrator (v28.237 split per Article XXIV + Compression clause) ─
// Owns the date-range + tab state and the shared visibleJobs/filteredTickets
// derivation; each tab's report lives in its own ReportXTab file; shared helpers
// + styles in reportHelpers.js.

function ReportsPage({ jobs, tickets, inventory }) {
  const { currentUser } = useApp();
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState("revenue");
  const [winW, setWinW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setWinW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  const rptGrid = winW < 900 ? "1fr" : "1fr 1fr";

  const isSalesman = currentUser?.role === "salesman";
  const visibleJobs = isSalesman ? jobs.filter((j) => j.salesman === currentUser?.name && j.status !== "Deleted") : jobs.filter((j) => j.status !== "Deleted");
  const visibleJobIds = new Set(visibleJobs.map((j) => j.id));

  const filteredTickets = tickets.filter((t) => {
    if (!visibleJobIds.has(t.workOrderId)) return false;
    if (dateFrom && t.date && t.date < dateFrom) return false;
    if (dateTo && t.date && t.date > dateTo) return false;
    return true;
  });

  const totalRevenue = filteredTickets.reduce((s, t) => s + ticketTotal(t), 0);

  return (
    <div style={{ padding: "16px 16px 24px", maxWidth: 1200 }}>
      {/* Header — stacks on mobile */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Reports</h1>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            {visibleJobs.length} jobs · {filteredTickets.length} tickets · {fmtMoney(totalRevenue)} revenue
            {isSalesman && <span style={{ color: C.blue, fontWeight: 600, marginLeft: 8 }}>(Filtered to your jobs)</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={labelStyle}>FROM</label>
            <input type="date" style={{ ...inputStyle, width: 140 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>TO</label>
            <input type="date" style={{ ...inputStyle, width: 140 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {(dateFrom || dateTo) && (
            <button
              className="fti-btn"
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                color: C.muted,
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 0, minWidth: "max-content" }}>
          {REPORT_TABS.map((t) => (
            <button
              className="fti-btn"
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: tab === t.key ? `3px solid ${C.red}` : "3px solid transparent",
                padding: "10px 14px",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: tab === t.key ? C.text : C.muted,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "revenue" && <ReportRevenueTab filteredTickets={filteredTickets} visibleJobs={visibleJobs} totalRevenue={totalRevenue} rptGrid={rptGrid} />}
      {tab === "operations" && <ReportOperationsTab filteredTickets={filteredTickets} visibleJobs={visibleJobs} rptGrid={rptGrid} />}
      {tab === "crew" && <ReportCrewTab filteredTickets={filteredTickets} visibleJobs={visibleJobs} dateFrom={dateFrom} dateTo={dateTo} />}
      {tab === "efficiency" && <ReportEfficiencyTab filteredTickets={filteredTickets} visibleJobs={visibleJobs} rptGrid={rptGrid} />}
      {tab === "inventory" && <ReportInventoryTab inventory={inventory} rptGrid={rptGrid} />}
    </div>
  );
}

export default ReportsPage;
