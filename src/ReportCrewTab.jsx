import { C } from "./config.js";
import { getField, diffMinutes, fmtHrs, cardStyle, headerStyle } from "./reportHelpers.js";

// ─── Crew & Hours tab (extracted from ReportsPage v28.237) ───────────────────

export default function ReportCrewTab({ filteredTickets, visibleJobs, dateFrom, dateTo }) {
  const now = new Date();
  const crewHours = {};

  filteredTickets.forEach((t) => {
    const job = visibleJobs.find((j) => j.id === t.jobId);
    if (!job?.crew) return;
    const overall = diffMinutes(getField(t, "lvYard", "lv_yard"), getField(t, "retYard", "ret_yard"));
    const onLoc = diffMinutes(getField(t, "arrivalTime", "arrival_time"), getField(t, "jobEndTime", "job_end_time"));
    const mBegin = parseFloat(t.mileageBegin ?? t.mileage_begin) || 0;
    const mEnd = parseFloat(t.mileageEnd ?? t.mileage_end) || 0;
    const miles = mEnd > mBegin ? mEnd - mBegin : 0;

    job.crew.forEach((c) => {
      if (!crewHours[c.name]) crewHours[c.name] = { totalMins: 0, onLocMins: 0, miles: 0, tickets: 0, days: new Set() };
      if (overall !== null) crewHours[c.name].totalMins += overall;
      if (onLoc !== null) crewHours[c.name].onLocMins += onLoc;
      crewHours[c.name].miles += miles;
      crewHours[c.name].tickets += 1;
      if (t.date) crewHours[c.name].days.add(t.date);
    });
  });

  const crewSorted = Object.entries(crewHours).sort((a, b) => b[1].totalMins - a[1].totalMins);

  const startD = dateFrom ? new Date(dateFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const endD = dateTo ? new Date(dateTo + "T00:00:00") : now;
  let bizDays = 0;
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) bizDays++;
  }
  if (bizDays === 0) bizDays = 1;

  const th = { padding: "8px 10px", fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.06em", textAlign: "left" };
  const td = { padding: "8px 10px" };

  return (
    <div>
      <div style={{ ...cardStyle, overflowX: "auto" }}>
        <div style={headerStyle}>CREW HOURS &amp; MILEAGE</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
          Based on ticket time fields (LV Yard → Ret Yard). Business days in range: {bizDays}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.navy }}>
              {["CREW MEMBER", "TICKETS", "TOTAL HOURS", "ON LOCATION", "DRIVE TIME", "MILES", "DAYS WORKED", "UTILIZATION"].map((h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crewSorted.map(([name, d]) => {
              const driveMins = d.totalMins - d.onLocMins;
              const daysWorked = d.days.size;
              const util = ((daysWorked / bizDays) * 100).toFixed(0);
              return (
                <tr key={name} style={{ borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ ...td, fontWeight: 700, color: C.text }}>{name}</td>
                  <td style={{ ...td, color: C.muted }}>{d.tickets}</td>
                  <td style={{ ...td, fontWeight: 700, color: C.text }}>{fmtHrs(d.totalMins)}</td>
                  <td style={{ ...td, color: C.blue }}>{fmtHrs(d.onLocMins)}</td>
                  <td style={{ ...td, color: C.muted }}>{fmtHrs(driveMins > 0 ? driveMins : null)}</td>
                  <td style={{ ...td, color: C.text }}>{d.miles > 0 ? `${d.miles.toFixed(0)} mi` : "—"}</td>
                  <td style={{ ...td, color: C.text }}>{daysWorked}</td>
                  <td style={{ ...td, fontWeight: 700, color: parseInt(util) > 80 ? C.green : parseInt(util) < 40 ? C.red : C.text }}>{util}%</td>
                </tr>
              );
            })}
            {crewSorted.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 16, textAlign: "center", color: C.muted }}>
                  No time data recorded for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
