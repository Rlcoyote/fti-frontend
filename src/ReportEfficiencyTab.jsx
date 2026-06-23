import { C } from "./config.js";
import { TICKET_TYPES } from "./SharedUI.jsx";
import { parseTime, getField, diffMinutes, fmtHrs, cardStyle, headerStyle, rowStyle } from "./reportHelpers.js";

// ─── Efficiency tab (extracted from ReportsPage v28.237) ─────────────────────

export default function ReportEfficiencyTab({ filteredTickets, visibleJobs, rptGrid }) {
  let onTimeCount = 0;
  let lateCount = 0;
  let earlyCount = 0;
  let noDataCount = 0;
  const lateTix = [];
  filteredTickets.forEach((t) => {
    const arr = parseTime(getField(t, "arrivalTime", "arrival_time"));
    const due = parseTime(getField(t, "dueOnLoc", "due_on_loc"));
    if (arr === null || due === null) {
      noDataCount++;
      return;
    }
    const diff = arr - due;
    if (diff <= 0) {
      earlyCount++;
    } else if (diff <= 15) {
      onTimeCount++;
    } else {
      lateCount++;
      const job = visibleJobs.find((j) => j.id === t.jobId);
      lateTix.push({ ticket: t.ticketNumber || t.id, customer: job?.customer || "Unknown", late: diff, date: t.date });
    }
  });
  const totalWithData = onTimeCount + earlyCount + lateCount;
  const onTimePct = totalWithData > 0 ? (((onTimeCount + earlyCount) / totalWithData) * 100).toFixed(1) : "—";

  const avgByType = {};
  filteredTickets.forEach((t) => {
    const overall = diffMinutes(getField(t, "lvYard", "lv_yard"), getField(t, "retYard", "ret_yard"));
    const onLoc = diffMinutes(getField(t, "arrivalTime", "arrival_time"), getField(t, "jobEndTime", "job_end_time"));
    if (!avgByType[t.type]) avgByType[t.type] = { overallTotal: 0, onLocTotal: 0, count: 0 };
    if (overall !== null) {
      avgByType[t.type].overallTotal += overall;
      avgByType[t.type].count++;
    }
    if (onLoc !== null) avgByType[t.type].onLocTotal += onLoc;
  });

  const pctColor = parseFloat(onTimePct) >= 90 ? C.green : parseFloat(onTimePct) >= 70 ? "#b85c00" : C.red;
  const stat = { fontSize: 10, fontWeight: 700, color: C.muted };

  return (
    <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
      <div style={cardStyle}>
        <div style={headerStyle}>ON-TIME ARRIVAL</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Arrival vs Location Time. Within 15 min = on time.</div>
        <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={stat}>ON TIME</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: pctColor }}>{onTimePct}%</div>
          </div>
          <div>
            <div style={stat}>EARLY/ON TIME</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{earlyCount + onTimeCount}</div>
          </div>
          <div>
            <div style={stat}>LATE</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{lateCount}</div>
          </div>
          <div>
            <div style={stat}>NO DATA</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.muted }}>{noDataCount}</div>
          </div>
        </div>
        {lateTix.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginBottom: 6 }}>LATE ARRIVALS</div>
            {lateTix.slice(0, 10).map((l) => (
              <div key={l.ticket} style={{ ...rowStyle, fontSize: 11 }}>
                <span>#{l.ticket}</span>
                <span style={{ color: C.muted }}>{l.customer}</span>
                <span style={{ color: C.muted }}>{l.date}</span>
                <span style={{ fontWeight: 700, color: C.red }}>+{l.late} min</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={headerStyle}>AVERAGE TIMES BY TICKET TYPE</div>
        {Object.entries(avgByType).map(([type, d]) => {
          const cfg = TICKET_TYPES[type] || { color: C.muted, label: type };
          const avgOverall = d.count > 0 ? Math.round(d.overallTotal / d.count) : null;
          const avgOnLoc = d.count > 0 ? Math.round(d.onLocTotal / d.count) : null;
          return (
            <div key={type} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}22` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: cfg.color, marginBottom: 4 }}>
                {cfg.label || type} ({d.count} tickets)
              </div>
              <div style={{ display: "flex", gap: 20, fontSize: 11 }}>
                <span>
                  <span style={{ color: C.muted }}>Avg Total: </span>
                  <strong>{fmtHrs(avgOverall)}</strong>
                </span>
                <span>
                  <span style={{ color: C.muted }}>Avg On Loc: </span>
                  <strong style={{ color: C.blue }}>{fmtHrs(avgOnLoc)}</strong>
                </span>
              </div>
            </div>
          );
        })}
        {Object.keys(avgByType).length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No time data</div>}
      </div>
    </div>
  );
}
