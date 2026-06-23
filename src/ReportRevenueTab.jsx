import { C } from "./config.js";
import { TICKET_TYPES } from "./SharedUI.jsx";
import { fmtMoney, ticketTotal, cardStyle, headerStyle, rowStyle } from "./reportHelpers.js";

// ─── Revenue tab (extracted from ReportsPage v28.237) ────────────────────────

// Compression: the BY CUSTOMER / BY SALESMAN / BY STATE-COUNTY cards were three
// verbatim copies of the same truncated-label + money-row markup. One component.
function RankCard({ title, entries }) {
  return (
    <div style={cardStyle}>
      <div style={headerStyle}>{title}</div>
      {entries.map(([label, value]) => (
        <div key={label} style={rowStyle}>
          <span
            style={{ fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, marginRight: 8 }}
          >
            {label}
          </span>
          <span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(value)}</span>
        </div>
      ))}
      {entries.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
    </div>
  );
}

const rankBy = (tickets, keyOf) => {
  const acc = {};
  tickets.forEach((t) => {
    const k = keyOf(t);
    acc[k] = (acc[k] || 0) + ticketTotal(t);
  });
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
};

export default function ReportRevenueTab({ filteredTickets, visibleJobs, totalRevenue, rptGrid }) {
  const jobOf = (t) => visibleJobs.find((j) => j.id === t.jobId);

  const revByCustomer = rankBy(filteredTickets, (t) => jobOf(t)?.customer || "Unknown");
  const revBySalesman = rankBy(filteredTickets, (t) => jobOf(t)?.salesman || "Unassigned");
  const revByRegion = rankBy(filteredTickets, (t) => {
    const job = jobOf(t);
    return [job?.jobState || job?.job_state, job?.county].filter(Boolean).join(" — ") || "Unknown";
  });

  const revByType = {};
  filteredTickets.forEach((t) => {
    revByType[t.type] = (revByType[t.type] || 0) + ticketTotal(t);
  });
  const revTypeSorted = Object.entries(revByType).sort((a, b) => b[1] - a[1]);

  const revByMonth = {};
  filteredTickets.forEach((t) => {
    const mo = t.date ? t.date.slice(0, 7) : "Unknown";
    revByMonth[mo] = (revByMonth[mo] || 0) + ticketTotal(t);
  });
  const revMonthSorted = Object.entries(revByMonth).sort((a, b) => a[0].localeCompare(b[0]));

  const topCustPct = revByCustomer.length > 0 && totalRevenue > 0 ? ((revByCustomer[0][1] / totalRevenue) * 100).toFixed(1) : 0;
  const avgTicket = filteredTickets.length > 0 ? totalRevenue / filteredTickets.length : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
      <div style={{ ...cardStyle, gridColumn: "1 / -1", display: "flex", gap: 32, flexWrap: "wrap" }}>
        <Stat label="TOTAL REVENUE" value={fmtMoney(totalRevenue)} color={C.green} />
        <Stat label="TICKETS" value={filteredTickets.length} color={C.text} />
        <Stat label="AVG TICKET VALUE" value={fmtMoney(avgTicket)} color={C.blue} />
        <Stat label="TOP CUSTOMER %" value={`${topCustPct}%`} color={parseFloat(topCustPct) > 50 ? C.red : C.text} />
      </div>

      <RankCard title="BY CUSTOMER" entries={revByCustomer} />
      <RankCard title="BY SALESMAN" entries={revBySalesman} />
      <RankCard title="BY STATE / COUNTY" entries={revByRegion} />

      <div style={cardStyle}>
        <div style={headerStyle}>BY TICKET TYPE</div>
        {revTypeSorted.map(([t, r]) => {
          const cfg = TICKET_TYPES[t] || { color: C.muted, label: t };
          return (
            <div key={t} style={rowStyle}>
              <span style={{ fontWeight: 700, color: cfg.color }}>{cfg.label || t}</span>
              <span style={{ fontWeight: 800, color: C.green }}>{fmtMoney(r)}</span>
            </div>
          );
        })}
      </div>

      <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
        <div style={headerStyle}>MONTHLY TREND</div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 120 }}>
          {revMonthSorted.map(([mo, r]) => {
            const maxRev = Math.max(...revMonthSorted.map(([, v]) => v), 1);
            const pct = (r / maxRev) * 100;
            return (
              <div key={mo} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.green }}>{fmtMoney(r)}</div>
                <div style={{ width: "100%", maxWidth: 60, background: C.blue, borderRadius: "3px 3px 0 0", height: `${Math.max(pct, 3)}%`, minHeight: 4 }} />
                <div style={{ fontSize: 9, color: C.muted, fontWeight: 600 }}>{mo}</div>
              </div>
            );
          })}
        </div>
        {revMonthSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
