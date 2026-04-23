import { C } from "./config.js";

// ─── TicketJobInfo (v27.86) ─────────────────────────────────────────────────
// Extracted from TicketDetail.jsx. Read-only Work Order context strip shown
// between the header and the Site Manager section. Pure display — all data
// comes from the parent job record + ticket.assignedWells. The "To update,
// go to Active Work Orders → Details → Edit Work Order" copy lives here to
// tell the user where WO edits happen (not on the ticket).
//
// Renders nothing if there's no job record (orphan ticket, shouldn't happen
// but the check is cheap).

function TicketJobInfo({ job, assignedWells }) {
  if (!job) return null;

  const wellsToShow = assignedWells?.length > 0
    ? assignedWells
    : (job.wells || []).map(w => w.well_name || w);
  const partialWells = assignedWells?.length > 0 && job.wells?.length && assignedWells.length < job.wells.length;

  return (
    <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>
        WORK ORDER INFO — <span style={{ color: C.muted, fontWeight: 400 }}>To update, go to Active Work Orders → Details → Edit Work Order</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", fontSize: 12 }}>
        <span><span style={{ color: C.muted }}>Customer: </span><strong>{job.customer}</strong></span>
        {job.jobState && <span><span style={{ color: C.muted }}>State: </span><strong>{job.jobState}</strong></span>}
        {job.county && <span><span style={{ color: C.muted }}>County: </span><strong>{job.county}</strong></span>}
        {wellsToShow.length > 0 && (
          <span>
            <span style={{ color: C.muted }}>Wells: </span>
            <strong>{wellsToShow.join(", ")}</strong>
            {partialWells && (
              <span style={{ color: C.muted, fontSize: 10 }}> ({assignedWells.length} of {job.wells.length})</span>
            )}
          </span>
        )}
        {job.afe && <span><span style={{ color: C.muted }}>AFE: </span><strong>{job.afe}</strong></span>}
        {job.companyCode && <span><span style={{ color: C.muted }}>Co. Code: </span><strong>{job.companyCode}</strong></span>}
        {job.costCenter && <span><span style={{ color: C.muted }}>Cost Center: </span><strong>{job.costCenter}</strong></span>}
        {job.po && <span><span style={{ color: C.muted }}>PO: </span><strong>{job.po}</strong></span>}
        {(job.contactFirst || job.contactLast) && (
          <span><span style={{ color: C.muted }}>Point of Contact: </span>
            <strong>{[job.contactFirst, job.contactLast].filter(Boolean).join(" ")}</strong>
          </span>
        )}
      </div>
    </div>
  );
}

export default TicketJobInfo;
