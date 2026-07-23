import { tzLabel } from "./utils.js";
import { C } from "./config.js";
import { isLogType } from "./ticketFamilies.js";
import TimePicker from "./TimePicker.jsx";

// ─── TicketTimeAndMileage (v27.78) ──────────────────────────────────────────
// Extracted from TicketDetail.jsx. Time & Mileage band: 5 time pickers
// (LV YARD → ARRIVAL → JOB START → JOB END → RET YARD), computed totals
// (overall time, time-on-location, drive time), mileage inputs with computed
// total, and the GPS Reference panel (recommended leave time + expected
// distance) when drive info is available.
//
// Parent owns the state (needed for save payload). Pass values + onChange
// for editable fields; dueOnLoc + timeZone + driveInfo are READ-only (set
// elsewhere or computed server-side).
//
// Props:
//   editable — when false, renders all fields as read-only
//   values — { lvYard, arrivalTime, jobStartTime, jobEndTime, retYard,
//              timeZone, mileageBegin, mileageEnd, dueOnLoc }
//   onChange(partial) — only editable keys trigger this
//   driveInfo — parent-owned drive result from Google Pin section (shared)

const parseTime = (s) => {
  if (!s) return null;
  const match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1]),
    min = parseInt(match[2]);
  const p = match[3].toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return h * 60 + min;
};

const fmtDiff = (a, b) => {
  if (a === null || b === null) return null;
  let d = b - a;
  if (d < 0) d += 1440; // wrap overnight
  return `${Math.floor(d / 60)}h ${d % 60}m`;
};

function TicketTimeAndMileage({ editable, values, onChange, driveInfo, ticketType }) {
  // v28.276 — LOG family: travel legs only (out week 1, back the final week).
  const isLog = isLogType(ticketType);
  const {
    lvYard = "",
    arrivalTime = "",
    jobStartTime = "",
    jobEndTime = "",
    retYard = "",
    timeZone = "",
    mileageBegin = "",
    mileageEnd = "",
    dueOnLoc = "",
  } = values || {};

  const tLv = parseTime(lvYard);
  const tArr = parseTime(arrivalTime);
  const tJe = parseTime(jobEndTime);
  const tRy = parseTime(retYard);
  const overall = fmtDiff(tLv, tRy);
  const onLoc = fmtDiff(tArr, tJe);
  let driveTime = null;
  if (tLv !== null && tArr !== null && tJe !== null && tRy !== null) {
    let d1 = tArr - tLv;
    if (d1 < 0) d1 += 1440;
    let d2 = tRy - tJe;
    if (d2 < 0) d2 += 1440;
    const tot = d1 + d2;
    driveTime = `${Math.floor(tot / 60)}h ${tot % 60}m`;
  }
  const totalMiles =
    mileageBegin !== "" && mileageEnd !== "" && mileageBegin != null && mileageEnd != null
      ? Math.max(0, parseFloat(mileageEnd) - parseFloat(mileageBegin))
      : null;

  const roStyle = { fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" };
  const lblStyle = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };
  const totalStyle = { fontSize: 12, fontWeight: 700, color: C.text };
  const totalSubStyle = { fontSize: 10, color: C.muted, marginTop: 1 };

  // Recommended leave time = dueOnLoc − drive duration (from the live
  // Google Pin drive calculation). Wraps past midnight if needed.
  let recLeave = null;
  if (dueOnLoc && driveInfo?.durationSeconds && !driveInfo.error) {
    const dueMatch = dueOnLoc.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (dueMatch) {
      let h = parseInt(dueMatch[1]),
        min = parseInt(dueMatch[2]);
      const p = dueMatch[3].toUpperCase();
      if (p === "PM" && h !== 12) h += 12;
      if (p === "AM" && h === 12) h = 0;
      const dueMinutes = h * 60 + min;
      const driveMinutes = Math.ceil(driveInfo.durationSeconds / 60);
      let leaveMin = dueMinutes - driveMinutes;
      if (leaveMin < 0) leaveMin += 1440;
      const lh = Math.floor(leaveMin / 60);
      const lm = leaveMin % 60;
      const lh12 = lh === 0 ? 12 : lh > 12 ? lh - 12 : lh;
      const lp = lh < 12 ? "AM" : "PM";
      recLeave = `${lh12}:${String(lm).padStart(2, "0")} ${lp}`;
    }
  }

  const timeFields = [
    { label: "LV YARD", key: "lvYard", val: lvYard, startHour: 6, startPeriod: "AM" },
    { label: "ARRIVAL", key: "arrivalTime", val: arrivalTime, startHour: 6, startPeriod: "AM" },
    { label: "JOB START", key: "jobStartTime", val: jobStartTime, startHour: 6, startPeriod: "AM" },
    { label: "JOB END", key: "jobEndTime", val: jobEndTime, startHour: 12, startPeriod: "PM" },
    { label: "RET YARD", key: "retYard", val: retYard, startHour: 12, startPeriod: "PM" },
  ];
  const shownTimeFields = isLog
    ? timeFields
        .filter((t) => t.key !== "jobStartTime")
        .map((t) => (t.key === "jobEndTime" ? { ...t, label: "LEAVE LOCATION" } : t.key === "arrivalTime" ? { ...t, label: "LOCATION ARRIVAL" } : t))
    : timeFields;
  const mileageFields = [
    { label: "MILEAGE — BEGINNING", key: "mileageBegin", val: mileageBegin },
    { label: "MILEAGE — END", key: "mileageEnd", val: mileageEnd },
  ];

  return (
    <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>
        {isLog ? "TRAVEL & MILEAGE — once per ticket" : "TIME & MILEAGE"}
      </div>

      {/* Time fields */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end", marginBottom: 8 }}>
        {shownTimeFields.map(({ label, key, val, startHour, startPeriod }) => (
          <div key={key}>
            <div style={lblStyle}>{label}</div>
            {editable ? (
              <TimePicker value={val} onChange={(v) => onChange({ [key]: v })} startHour={startHour} startPeriod={startPeriod} />
            ) : (
              <div style={roStyle}>{val || "—"}</div>
            )}
          </div>
        ))}
        <div>
          <div style={lblStyle}>TIME ZONE</div>
          <div style={roStyle}>{tzLabel(timeZone) || "—"}</div>
        </div>
      </div>

      {/* Totals */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", borderTop: `1px solid ${C.border}`, paddingTop: 7, marginBottom: 8 }}>
        {[
          ...(isLog
            ? [{ label: "DRIVE TIME", val: driveTime, sub: "Out leg + return leg (billed)" }]
            : [
                { label: "OVERALL TIME", val: overall, sub: "LV Yard → Ret Yard" },
                { label: "TIME ON LOC", val: onLoc, sub: "Arrival → Job End" },
                { label: "DRIVE TIME", val: driveTime, sub: "LV Yard→Arrival + Job End→Ret Yard" },
              ]),
        ].map(({ label, val, sub }) => (
          <div key={label} style={{ marginRight: 8 }}>
            <div style={lblStyle}>{label}</div>
            <div style={totalStyle}>{val || "—"}</div>
            <div style={totalSubStyle}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Mileage */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end" }}>
        {mileageFields.map(({ label, key, val }) => (
          <div key={key}>
            <div style={lblStyle}>{label}</div>
            {editable ? (
              <input
                type="number"
                value={val}
                onChange={(e) => onChange({ [key]: e.target.value })}
                min={0}
                placeholder="0"
                style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 }}
              />
            ) : (
              <div style={roStyle}>{val !== "" && val != null ? val : "—"}</div>
            )}
          </div>
        ))}
        <div>
          <div style={lblStyle}>TOTAL MILES</div>
          <div style={totalStyle}>{totalMiles !== null ? `${totalMiles.toLocaleString()} mi` : "—"}</div>
        </div>
      </div>

      {/* GPS Reference — recommended leave time + expected distance (requires
          live drive info from the Google Pin section). */}
      {driveInfo && !driveInfo.error && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "6px 24px" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>RECOMMENDED TIME TO LEAVE YARD</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: recLeave ? C.text : C.muted }}>
              {recLeave || (dueOnLoc ? "Calculating..." : "Set Location Time first")}
            </div>
            {recLeave && (
              <div style={{ fontSize: 10, color: C.muted }}>
                Location Time ({dueOnLoc}) − Drive Time ({driveInfo.duration})
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>EXPECTED DISTANCE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{driveInfo.distance}</div>
            <div style={{ fontSize: 10, color: C.muted }}>From yard · Est. {driveInfo.duration}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketTimeAndMileage;
