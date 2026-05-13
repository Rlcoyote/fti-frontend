import { useState, useEffect } from "react";
import { C } from "./config.js";

// v28.40 — JOB_STATUS_REPORT replaces the deleted STATUS_ORDER/STATUS_CONFIG
// for the Operations tab "Work Orders by Status" card. Reflects the raw
// job.status column rather than the old computed 3-tier badges.
const JOB_STATUS_REPORT = [
  { value: "Scheduled", label: "ACTIVE", color: "#1a5fa8" },
  { value: "Completed", label: "COMPLETED", color: "#1a7a3c" },
];
import { inputStyle, labelStyle, TICKET_TYPES, TICKET_STATUSES } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

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

  // Filter jobs for salesman — only jobs where they are the salesman
  const visibleJobs = isSalesman ? jobs.filter((j) => j.salesman === currentUser?.name && j.status !== "Deleted") : jobs.filter((j) => j.status !== "Deleted");
  const visibleJobIds = new Set(visibleJobs.map((j) => j.id));

  // Filter tickets by date range and visibility
  const filteredTickets = tickets.filter((t) => {
    if (!visibleJobIds.has(t.jobId)) return false;
    if (dateFrom && t.date && t.date < dateFrom) return false;
    if (dateTo && t.date && t.date > dateTo) return false;
    return true;
  });

  // Helper: parse time string to minutes since midnight
  const parseTime = (s) => {
    if (!s) return null;
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let h = parseInt(m[1]),
      min = parseInt(m[2]);
    const p = m[3].toUpperCase();
    if (p === "PM" && h !== 12) h += 12;
    if (p === "AM" && h === 12) h = 0;
    return h * 60 + min;
  };
  const diffMinutes = (start, end) => {
    const s = parseTime(start),
      e = parseTime(end);
    if (s === null || e === null) return null;
    let d = e - s;
    if (d < 0) d += 1440; // overnight
    return d;
  };
  const fmtHrs = (mins) => {
    if (mins === null || mins === undefined) return "—";
    const h = Math.floor(mins / 60),
      m = mins % 60;
    return `${h}h ${m}m`;
  };
  const fmtMoney = (n) => "$" + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calcLineTotal = (li) => (li.rate || 0) * (li.qty || 0) * (li.days || 1);
  const ticketTotal = (t) => (t.lineItems || []).reduce((s, li) => s + calcLineTotal(li), 0);
  const getField = (t, camel, snake) => t[camel] || t[snake] || "";

  // ─── Shared data ───
  const totalRevenue = filteredTickets.reduce((s, t) => s + ticketTotal(t), 0);

  const cardStyle = { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "20px 24px", marginBottom: 16 };
  const headerStyle = {
    fontSize: 13,
    fontWeight: 800,
    color: C.text,
    letterSpacing: "0.06em",
    marginBottom: 12,
    borderBottom: `2px solid ${C.red}`,
    paddingBottom: 8,
  };
  const rowStyle = { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}22`, fontSize: 13 };
  const tabs = [
    { key: "revenue", label: "Revenue" },
    { key: "operations", label: "Operations" },
    { key: "crew", label: "Crew & Hours" },
    { key: "efficiency", label: "Efficiency" },
    { key: "inventory", label: "Inventory" },
  ];

  // ─── REVENUE TAB ───
  const renderRevenue = () => {
    // By customer
    const revByCustomer = {};
    filteredTickets.forEach((t) => {
      const job = visibleJobs.find((j) => j.id === t.jobId);
      const cust = job?.customer || "Unknown";
      revByCustomer[cust] = (revByCustomer[cust] || 0) + ticketTotal(t);
    });
    const revCustSorted = Object.entries(revByCustomer).sort((a, b) => b[1] - a[1]);

    // By salesman
    const revBySalesman = {};
    filteredTickets.forEach((t) => {
      const job = visibleJobs.find((j) => j.id === t.jobId);
      const sm = job?.salesman || "Unassigned";
      revBySalesman[sm] = (revBySalesman[sm] || 0) + ticketTotal(t);
    });
    const revSmSorted = Object.entries(revBySalesman).sort((a, b) => b[1] - a[1]);

    // By state/county
    const revByRegion = {};
    filteredTickets.forEach((t) => {
      const job = visibleJobs.find((j) => j.id === t.jobId);
      const region = [job?.jobState || job?.job_state, job?.county].filter(Boolean).join(" — ") || "Unknown";
      revByRegion[region] = (revByRegion[region] || 0) + ticketTotal(t);
    });
    const revRegionSorted = Object.entries(revByRegion).sort((a, b) => b[1] - a[1]);

    // By ticket type
    const revByType = {};
    filteredTickets.forEach((t) => {
      revByType[t.type] = (revByType[t.type] || 0) + ticketTotal(t);
    });
    const revTypeSorted = Object.entries(revByType).sort((a, b) => b[1] - a[1]);

    // By month
    const revByMonth = {};
    filteredTickets.forEach((t) => {
      const mo = t.date ? t.date.slice(0, 7) : "Unknown";
      revByMonth[mo] = (revByMonth[mo] || 0) + ticketTotal(t);
    });
    const revMonthSorted = Object.entries(revByMonth).sort((a, b) => a[0].localeCompare(b[0]));

    // Customer concentration
    const topCustPct = revCustSorted.length > 0 && totalRevenue > 0 ? ((revCustSorted[0][1] / totalRevenue) * 100).toFixed(1) : 0;

    // Average ticket value
    const avgTicket = filteredTickets.length > 0 ? totalRevenue / filteredTickets.length : 0;

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        {/* Summary Cards */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1", display: "flex", gap: 32, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>TOTAL REVENUE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.green }}>{fmtMoney(totalRevenue)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>TICKETS</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>{filteredTickets.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>AVG TICKET VALUE</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.blue }}>{fmtMoney(avgTicket)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>TOP CUSTOMER %</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: parseFloat(topCustPct) > 50 ? C.red : C.text }}>{topCustPct}%</div>
          </div>
        </div>

        {/* By Customer */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY CUSTOMER</div>
          {revCustSorted.map(([c, r]) => (
            <div key={c} style={rowStyle}>
              <span
                style={{
                  fontWeight: 600,
                  color: C.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                  marginRight: 8,
                }}
              >
                {c}
              </span>
              <span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(r)}</span>
            </div>
          ))}
          {revCustSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>

        {/* By Salesman */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY SALESMAN</div>
          {revSmSorted.map(([s, r]) => (
            <div key={s} style={rowStyle}>
              <span
                style={{
                  fontWeight: 600,
                  color: C.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                  marginRight: 8,
                }}
              >
                {s}
              </span>
              <span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(r)}</span>
            </div>
          ))}
          {revSmSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>

        {/* By Region */}
        <div style={cardStyle}>
          <div style={headerStyle}>BY STATE / COUNTY</div>
          {revRegionSorted.map(([r, v]) => (
            <div key={r} style={rowStyle}>
              <span
                style={{
                  fontWeight: 600,
                  color: C.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  flex: 1,
                  marginRight: 8,
                }}
              >
                {r}
              </span>
              <span style={{ fontWeight: 800, color: C.green, whiteSpace: "nowrap" }}>{fmtMoney(v)}</span>
            </div>
          ))}
          {revRegionSorted.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No data</div>}
        </div>

        {/* By Ticket Type */}
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

        {/* Monthly Trend */}
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
  };

  // ─── OPERATIONS TAB ───
  const renderOperations = () => {
    // Jobs by status (v28.40 — raw status, not computed 3-tier)
    const jobsByStatus = {};
    JOB_STATUS_REPORT.forEach((s) => {
      jobsByStatus[s.value] = visibleJobs.filter((j) => j.status === s.value).length;
    });
    const flagged = visibleJobs.filter((j) => j.status === "flaggedCancel").length;

    // Tickets by type & status
    const ticketsByType = {};
    filteredTickets.forEach((t) => {
      if (!ticketsByType[t.type]) ticketsByType[t.type] = {};
      ticketsByType[t.type][t.status] = (ticketsByType[t.type][t.status] || 0) + 1;
    });

    // Aging: signed but not sent to QB
    const agingTickets = filteredTickets.filter((t) => ["signed", "sigNotReq", "approved"].includes(t.status));
    const agingByAge = agingTickets
      .map((t) => {
        const job = visibleJobs.find((j) => j.id === t.jobId);
        const daysSigned = t.signedAt ? Math.floor((Date.now() - new Date(t.signedAt).getTime()) / 86400000) : null;
        const daysCreated = t.date ? Math.floor((Date.now() - new Date(t.date).getTime()) / 86400000) : null;
        return { ...t, customer: job?.customer || "Unknown", age: daysSigned ?? daysCreated ?? 0 };
      })
      .sort((a, b) => b.age - a.age);

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        {/* Jobs by Status */}
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
              <span style={{ color: "#b85c00" }}>FLAGGED FOR CANCEL</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#b85c00" }}>{flagged}</span>
            </div>
          )}
        </div>

        {/* Tickets by Type */}
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

        {/* Outstanding / Aging */}
        <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
          <div style={headerStyle}>OUTSTANDING — SIGNED BUT NOT SENT TO ACCOUNTING ({agingByAge.length})</div>
          {agingByAge.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>All caught up</div>}
          {agingByAge.slice(0, 20).map((t) => (
            <div key={t.id} style={{ ...rowStyle, alignItems: "center" }}>
              <span style={{ fontWeight: 600 }}>#{t.ticketNumber || t.id}</span>
              <span style={{ color: C.muted }}>{t.customer}</span>
              <span style={{ color: C.muted }}>{t.type}</span>
              <span style={{ fontWeight: 700, color: t.age > 14 ? C.red : t.age > 7 ? "#b85c00" : C.text }}>{t.age} days</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── CREW & HOURS TAB ───
  const renderCrew = () => {
    // Build crew hours from tickets
    const crewHours = {};

    filteredTickets.forEach((t) => {
      const job = visibleJobs.find((j) => j.id === t.jobId);
      if (!job?.crew) return;
      const lv = getField(t, "lvYard", "lv_yard");
      const ret = getField(t, "retYard", "ret_yard");
      const arr = getField(t, "arrivalTime", "arrival_time");
      const jEnd = getField(t, "jobEndTime", "job_end_time");
      const overall = diffMinutes(lv, ret);
      const onLoc = diffMinutes(arr, jEnd);
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

    // Utilization: days worked / business days in range
    const startD = dateFrom ? new Date(dateFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
    const endD = dateTo ? new Date(dateTo + "T00:00:00") : now;
    let bizDays = 0;
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) bizDays++;
    }
    if (bizDays === 0) bizDays = 1;

    return (
      <div>
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <div style={headerStyle}>CREW HOURS &amp; MILEAGE</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>
            Based on ticket time fields (LV Yard → Ret Yard). Business days in range: {bizDays}
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.darkBlue }}>
                {["CREW MEMBER", "TICKETS", "TOTAL HOURS", "ON LOCATION", "DRIVE TIME", "MILES", "DAYS WORKED", "UTILIZATION"].map((h) => (
                  <th key={h} style={{ padding: "8px 10px", fontSize: 10, fontWeight: 800, color: C.white, letterSpacing: "0.06em", textAlign: "left" }}>
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
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: C.text }}>{name}</td>
                    <td style={{ padding: "8px 10px", color: C.muted }}>{d.tickets}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: C.text }}>{fmtHrs(d.totalMins)}</td>
                    <td style={{ padding: "8px 10px", color: C.blue }}>{fmtHrs(d.onLocMins)}</td>
                    <td style={{ padding: "8px 10px", color: C.muted }}>{fmtHrs(driveMins > 0 ? driveMins : null)}</td>
                    <td style={{ padding: "8px 10px", color: C.text }}>{d.miles > 0 ? `${d.miles.toFixed(0)} mi` : "—"}</td>
                    <td style={{ padding: "8px 10px", color: C.text }}>{daysWorked}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 700, color: parseInt(util) > 80 ? C.green : parseInt(util) < 40 ? C.red : C.text }}>
                      {util}%
                    </td>
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
  };

  // ─── EFFICIENCY TAB ───
  const renderEfficiency = () => {
    // On-time arrival: Arrival vs Location Time
    let onTimeCount = 0,
      lateCount = 0,
      earlyCount = 0,
      noDataCount = 0;
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

    // Average times by ticket type
    const avgByType = {};
    filteredTickets.forEach((t) => {
      const overall = diffMinutes(getField(t, "lvYard", "lv_yard"), getField(t, "retYard", "ret_yard"));
      const onLoc = diffMinutes(getField(t, "arrivalTime", "arrival_time"), getField(t, "jobEndTime", "job_end_time"));
      if (!avgByType[t.type]) avgByType[t.type] = { overallTotal: 0, onLocTotal: 0, count: 0 };
      if (overall !== null) {
        avgByType[t.type].overallTotal += overall;
        avgByType[t.type].count++;
      }
      if (onLoc !== null) {
        avgByType[t.type].onLocTotal += onLoc;
      }
    });

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        {/* On-Time Arrival */}
        <div style={cardStyle}>
          <div style={headerStyle}>ON-TIME ARRIVAL</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 12 }}>Arrival vs Location Time. Within 15 min = on time.</div>
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>ON TIME</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: parseFloat(onTimePct) >= 90 ? C.green : parseFloat(onTimePct) >= 70 ? "#b85c00" : C.red }}>
                {onTimePct}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>EARLY/ON TIME</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{earlyCount + onTimeCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>LATE</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.red }}>{lateCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>NO DATA</div>
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

        {/* Average Times by Type */}
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
  };

  // ─── INVENTORY TAB ───
  const renderInventory = () => {
    const invOut = inventory.filter((i) => i.inYard < i.qtyOwned).sort((a, b) => b.qtyOwned - b.inYard - (a.qtyOwned - a.inYard));
    const totalOut = invOut.reduce((s, i) => s + (i.qtyOwned - i.inYard), 0);
    const lowStock = inventory.filter((i) => i.inYard < 4 && i.inYard > 0);

    return (
      <div style={{ display: "grid", gridTemplateColumns: rptGrid, gap: 16 }}>
        <div style={cardStyle}>
          <div style={headerStyle}>IN FIELD ({totalOut} items out)</div>
          {invOut.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>All inventory in yard</div>}
          {invOut.map((i) => {
            const out = i.qtyOwned - i.inYard;
            return (
              <div key={i.id} style={rowStyle}>
                <span style={{ fontSize: 12, color: C.text }}>
                  {i.size} {i.item}
                </span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 11, color: C.muted }}>{i.customer || "—"}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.red }}>{out} out</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={cardStyle}>
          <div style={headerStyle}>LOW STOCK WARNING ({lowStock.length})</div>
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>Items with fewer than 4 in yard</div>
          {lowStock.length === 0 && <div style={{ fontSize: 12, color: C.muted }}>No low stock items</div>}
          {lowStock.map((i) => (
            <div key={i.id} style={{ ...rowStyle, background: "#fdf5d8", borderRadius: 3, padding: "6px 8px", marginBottom: 2 }}>
              <span style={{ fontSize: 12, color: C.text }}>
                {i.size} {i.item}
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#8a6500" }}>{i.inYard} in yard</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
          {tabs.map((t) => (
            <button
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
      {tab === "revenue" && renderRevenue()}
      {tab === "operations" && renderOperations()}
      {tab === "crew" && renderCrew()}
      {tab === "efficiency" && renderEfficiency()}
      {tab === "inventory" && renderInventory()}
    </div>
  );
}

export default ReportsPage;
