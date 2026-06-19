import { C } from "./config.js";

// ─── AddTicketGpsReference (v28.62 — extracted from AddTicketModal) ───────────
// "GPS REFERENCE" section showing recommended yard-departure time
// (location-time minus drive-time) and the expected drive distance.
// Renders only when the parent has resolved a drive-distance result
// (driveLoading OR a non-error driveInfo).
//
// Per CAM XXV: presentational. Receives driveLoading + driveInfo +
// dueOnLoc as props. Internal computation of `recLeave` (the departure
// time string) is kept in this file because it's only used here — no
// reason to surface it to the parent.

export default function AddTicketGpsReference({ driveLoading, driveInfo, dueOnLoc }) {
  if (!driveLoading && (!driveInfo || driveInfo.error)) return null;

  if (driveLoading) {
    return (
      <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GPS REFERENCE</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Calculating drive distance...</div>
      </div>
    );
  }

  let recLeave = null;
  if (dueOnLoc && driveInfo.durationSeconds) {
    const dueMatch = dueOnLoc.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (dueMatch) {
      let h = parseInt(dueMatch[1]);
      const min = parseInt(dueMatch[2]);
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

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>GPS REFERENCE</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px" }}>
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
          {/* v28.227 — drive time promoted to its own evident, equally-sized
              field (was buried in the small sub-lines). */}
          <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>DRIVE TIME</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{driveInfo.duration}</div>
          <div style={{ fontSize: 10, color: C.muted }}>Yard → location</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>EXPECTED DISTANCE</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{driveInfo.distance}</div>
          <div style={{ fontSize: 10, color: C.muted }}>From yard</div>
        </div>
      </div>
    </div>
  );
}
