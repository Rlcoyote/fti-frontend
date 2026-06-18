import { C } from "./config.js";

// ─── TicketClockInReadiness (v28.214, Labor Time Phase 4b) ──────────────────
// A compact, always-visible readiness strip near the top of a JOB ticket. It
// makes the three clock-in prerequisites legible to the lead at a glance, so
// the crew (and the lead) aren't surprised by a "can't clock in yet" block:
//
//   1. Location Time  (due_on_loc)  — when the crew must be on location.
//   2. Originating Yard (yard_location_index) — where they leave from.
//   3. Location Pin   (pin_lat/lng) — the destination, for the drive leg.
//
// Location Time + Pin are HARD prerequisites (the backend gate refuses a job
// clock-in without them — by design). The yard defaults to the primary yard.
// The strip mirrors the same rule the backend enforces; it does not itself
// gate anything. Rental tickets don't track time, so the parent hides it.

function Row({ label, ok, value, optional }) {
  const mark = ok ? "✓" : optional ? "•" : "✗";
  const markColor = ok ? C.green : optional ? C.muted : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "3px 0" }}>
      <span style={{ color: markColor, fontWeight: 800, width: 14, textAlign: "center" }}>{mark}</span>
      <span style={{ color: C.muted, fontWeight: 600, minWidth: 120 }}>{label}</span>
      <span style={{ color: ok ? C.text : optional ? C.muted : C.red, fontWeight: ok ? 700 : 600 }}>{value}</span>
    </div>
  );
}

export default function TicketClockInReadiness({ dueOnLoc, yardName, pinLat, pinLng, driveInfo }) {
  const hasLoc = !!(dueOnLoc && String(dueOnLoc).trim());
  const hasPin = pinLat != null && pinLng != null && pinLat !== "" && pinLng !== "";
  const ready = hasLoc && hasPin;

  const driveText = driveInfo && driveInfo.duration && !driveInfo.error ? driveInfo.duration : null;

  return (
    <div
      style={{
        margin: "0 24px 12px",
        border: `1px solid ${ready ? C.green : C.yellow}66`,
        background: ready ? "#0f3d2214" : "#fff8e1",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: C.muted, marginBottom: 8 }}>CLOCK-IN READINESS</div>
      <Row label="Location Time" ok={hasLoc} value={hasLoc ? dueOnLoc : "Not set — required"} />
      <Row label="Originating Yard" ok={!!yardName} optional={!yardName} value={yardName || "Primary yard (default)"} />
      <Row label="Location Pin" ok={hasPin} value={hasPin ? (driveText ? `Set · drive ${driveText}` : "Set") : "Not set — required"} />
      <div
        style={{
          marginTop: 9,
          paddingTop: 9,
          borderTop: `1px solid ${C.border}`,
          fontSize: 12.5,
          fontWeight: 700,
          color: ready ? C.green : "#8a6500",
        }}
      >
        {ready
          ? "Crew can clock into this job."
          : "Crew can’t clock into the job until Location Time and Location Pin are set. (Yard/Shop time is always available.)"}
      </div>
    </div>
  );
}
