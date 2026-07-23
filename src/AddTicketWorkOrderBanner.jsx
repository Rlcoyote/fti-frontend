import { C } from "./config.js";

// ─── AddTicketWorkOrderBanner (v28.60 — extracted from AddTicketModal) ──────────────
// Compact "WORK ORDER INFO" banner shown across the top of AddTicketModal
// once a ticket type is selected. Carries the contextual job facts so the
// lead doesn't have to remember which WO they're adding a ticket to:
// customer, state, county, well list, point-of-contact name.
//
// Per CAM XXV: presentational, no state, no useEffect. Receives the full
// `job` object as one prop and pulls the fields it renders. Conditional
// rendering of each field is internal to this component — if a job is
// missing State or POC, those rows simply don't render.

export default function AddTicketWorkOrderBanner({ job }) {
  if (!job) return null;
  return (
    <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 20px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>WORK ORDER INFO</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 12 }}>
        <span>
          <span style={{ color: C.muted }}>Customer: </span>
          <strong>{job.customer}</strong>
        </span>
        {job.jobState && (
          <span>
            <span style={{ color: C.muted }}>State: </span>
            <strong>{job.jobState}</strong>
          </span>
        )}
        {job.county && (
          <span>
            <span style={{ color: C.muted }}>County: </span>
            <strong>{job.county}</strong>
          </span>
        )}
        {job.wells?.length > 0 && (
          <span>
            <span style={{ color: C.muted }}>Wells: </span>
            <strong>{job.wells.map((w) => w.well_name || w).join(", ")}</strong>
          </span>
        )}
        {(job.contactFirst || job.contactLast) && (
          <span>
            <span style={{ color: C.muted }}>Point of Contact: </span>
            <strong>{[job.contactFirst, job.contactLast].filter(Boolean).join(" ")}</strong>
          </span>
        )}
      </div>
    </div>
  );
}
