import { C } from "./config.js";
import { TICKET_TYPES, TICKET_STATUSES } from "./SharedUI.jsx";
import { JOB_STATUS_REPORT, cardStyle, headerStyle, rowStyle } from "./reportHelpers.js";

// ─── Operations tab (extracted from ReportsPage v28.237) ─────────────────────

export default function ReportOperationsTab({ filteredTickets, visibleJobs, rptGrid }) {
  const jobsByStatus = {};
  JOB_STATUS_REPORT.forEach((s) => {
    jobsByStatus[s.value] = visibleJobs.filter((j) => j.status === s.value).length;
  });
  const flagged = visibleJobs.filter((j) => j.status === "flaggedCancel").length;

  const ticketsByType = {};
  filteredTickets.forEach((t) => {
    if (!ticketsByType[t.type]) ticketsByType[t.type] = {};
    ticketsByType[t.type][t.status] = (ticketsByType[t.type][t.status] || 0) + 1;
  });

  const agingByAge = filteredTickets
    .filter((t) => ["signed", "sigNotReq", "approved"].includes(t.status))
    .map((t) => {
      const job = visibleJobs.find((j) => j.id === t.jobId);
      const daysSigned = t.signedAt ? Math.floor((Date.now() - new Date(t.signedAt).getTime()) / 86400000) : null;
      const daysCreated = t.date ? Math.floor((Date.now() - new Date(t.date).getTime()) / 86400000) : null;
      return { ...t, customer: job?.customer || "Unknown", age: daysSigned ?? daysCreated ?? 0 };
    })
    .sort((a, b) => b.age - a.age);

  return (
    <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
      <div style={cardStyle}>
        <div style={headerStyle}>WORK ORDERS BY STATUS</div>
        {JOB_STATUS_REPORT.map((s) => {
          const count = jobsByStatus[s.value] || 0;
          if (count === 0) return null;
          return (
            <div key={s.value} style={rowStyle}>
              <span style={{ color: C.text }}>{s.label}</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{count}</span>
            </div>
          );
        })}
        {flagged > 0 && (
          <div style={rowStyle}>
            <span style={{ color: C.orange }}>FLAGGED FOR CANCEL</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.orange }}>{flagged}</span>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={headerStyle}>TICKETS BY TYPE &amp; STATUS</div>
        {Object.entries(ticketsByType).map(([type, statuses]) => {
          const cfg = TICKET_TYPES[type] || { color: C.muted, label: type };
          const total = Object.values(statuses).reduce((s, v) => s + v, 0);
          return (
            <div key={type} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: cfg.color }}>{cfg.label || type}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{total}</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(statuses).map(([status, count]) => {
                  const scfg = TICKET_STATUSES[status] || { color: C.muted, bg: C.steel, label: status };
                  return (
                    <span key={status} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: scfg.bg, color: scfg.color }}>
                      {scfg.label} ({count})
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
        <div style={headerStyle}>OUTSTANDING — SIGNED BUT NOT SENT TO ACCOUNTING ({agingByAge.length})</div>
        {agingByAge.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>All caught up</div>}
        {agingByAge.slice(0, 20).map((t) => (
          <div key={t.id} style={{ ...rowStyle, alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>#{t.ticketNumber || t.id}</span>
            <span style={{ color: C.muted }}>{t.customer}</span>
            <span style={{ color: C.muted }}>{t.type}</span>
            <span style={{ fontWeight: 700, color: t.age > 14 ? C.red : t.age > 7 ? C.orange : C.text }}>{t.age} days</span>
          </div>
        ))}
      </div>
    </div>
  );
}
