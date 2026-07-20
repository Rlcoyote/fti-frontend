import { tzLabel } from "./utils.js";
import { C } from "./config.js";
import { isLogType } from "./ticketFamilies.js";
import TimePicker from "./TimePicker.jsx";

// ─── AddTicketTimeMileage (v28.64 — extracted from AddTicketModal) ────────────
// "TIME & MILEAGE" section for non-Rental tickets. Five time pickers
// (LV YARD / ARRIVAL / JOB START / JOB END / RET YARD), the read-only
// TIME ZONE label, and two mileage inputs with a derived TOTAL MILES
// display.
//
// Per CAM XXV: controlled. Receives all five time-state pairs and both
// mileage-state pairs from the parent, plus the timeZone label.

const LBL_SM = { fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 3 };

export default function AddTicketTimeMileage({
  ticketType,
  lvYard,
  arrivalTime,
  jobStartTime,
  jobEndTime,
  retYard,
  setLvYard,
  setArrivalTime,
  setJobStartTime,
  setJobEndTime,
  setRetYard,
  timeZone,
  mileageBegin,
  mileageEnd,
  setMileageBegin,
  setMileageEnd,
}) {
  const lblSm = { ...LBL_SM, color: C.muted };
  // v28.276 — LOG family: the stamps are the two TRAVEL legs (billed drive):
  // out on week 1's ticket, back on the final week's. JOB START is gone;
  // JOB END wears its honest name, LEAVE LOCATION.
  const isLog = isLogType(ticketType);
  const times = [
    { label: "LV YARD", val: lvYard, set: setLvYard, startHour: 6, startPeriod: "AM" },
    { label: "ARRIVAL", val: arrivalTime, set: setArrivalTime, startHour: 6, startPeriod: "AM" },
    { label: "JOB START", val: jobStartTime, set: setJobStartTime, startHour: 6, startPeriod: "AM" },
    { label: "JOB END", val: jobEndTime, set: setJobEndTime, startHour: 12, startPeriod: "PM" },
    { label: "RET YARD", val: retYard, set: setRetYard, startHour: 12, startPeriod: "PM" },
  ];
  const shownTimes = isLog
    ? times
        .filter((t) => t.label !== "JOB START")
        .map((t) => (t.label === "JOB END" ? { ...t, label: "LEAVE LOCATION" } : t.label === "ARRIVAL" ? { ...t, label: "LOCATION ARRIVAL" } : t))
    : times;
  const mileages = [
    { label: "MILEAGE — BEGINNING", val: mileageBegin, set: setMileageBegin },
    { label: "MILEAGE — END", val: mileageEnd, set: setMileageEnd },
  ];

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>TIME &amp; MILEAGE</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end", marginBottom: 8 }}>
        {shownTimes.map(({ label, val, set, startHour, startPeriod }) => (
          <div key={label}>
            <div style={lblSm}>{label}</div>
            <TimePicker value={val} onChange={set} startHour={startHour} startPeriod={startPeriod} />
          </div>
        ))}
        <div>
          <div style={lblSm}>TIME ZONE</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: timeZone ? C.text : C.muted, paddingTop: 4 }}>{tzLabel(timeZone) || "—"}</div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", gap: "8px 14px", flexWrap: "wrap", alignItems: "flex-end" }}>
        {mileages.map(({ label, val, set }) => (
          <div key={label}>
            <div style={lblSm}>{label}</div>
            <input
              type="number"
              value={val}
              onChange={(e) => set(e.target.value)}
              min={0}
              placeholder="0"
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 12,
                color: C.text,
                background: C.cardBg,
                width: 98,
              }}
            />
          </div>
        ))}
        {mileageBegin !== "" && mileageEnd !== "" && (
          <div>
            <div style={lblSm}>TOTAL MILES</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
              {Math.max(0, parseFloat(mileageEnd) - parseFloat(mileageBegin)).toLocaleString()} mi
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
