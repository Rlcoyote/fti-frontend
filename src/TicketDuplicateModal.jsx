import { useState } from "react";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { C } from "./config.js";
import { Btn, Z_INDEX, ModalWrap } from "./SharedUI.jsx";
import { today } from "./utils.js";

// ─── TicketDuplicateModal (v27.72) ──────────────────────────────────────────
// Extracted from TicketDetail.jsx. Full duplicate-ticket flow with
// progressive-disclosure source picker (v27.52), type/date/target-WO pickers,
// and carry-over toggles (line items, notes, pin, wells).
//
// State is local — each modal open starts fresh (defaults derived from the
// `ticket` the modal was opened on). No parent state to reset; the parent
// just toggles `showDupModal` → mount/unmount takes care of the rest.
//
// Props:
//   ticket     — the ticket DUPLICATE was clicked on (default source + type)
//   jobs       — all jobs (for target WO dropdown)
//   tickets    — all tickets (for source picker — filters to same-WO)
//   onClose    — dismiss (cancel or after success)
//   onDuplicate(sourceTicket, options) — parent handler (see JobTicketsTab /
//     TicketPage for existing implementations)

const DUP_TYPES = ["Rig Up", "Tester", "Pumper", "Rental", "Rig Down"];

function TicketDuplicateModal({ ticket, jobs = [], tickets = [], onClose, onDuplicate }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  const [dupType, setDupType] = useState(ticket.type);
  const [dupDate, setDupDate] = useState(() => today());
  const [dupJobId, setDupJobId] = useState(ticket.jobId);
  const [dupSourceId, setDupSourceId] = useState(ticket.id);
  const [dupSourcePickerOpen, setDupSourcePickerOpen] = useState(false);
  const [incLineItems, setIncLineItems] = useState(true);
  const [incNotes, setIncNotes] = useState(false);
  const [incPin, setIncPin] = useState(true);
  const [incWells, setIncWells] = useState(true);
  const [dupSubmitting, setDupSubmitting] = useState(false);

  // Source defaults to the ticket this modal was opened on. User can change
  // via the "(change)" link for the ~10% case where a different source is wanted.
  const dupSource = (tickets || []).find((t) => t.id === dupSourceId) || ticket;
  const dupTargetJob = (jobs || []).find((j) => j.id === dupJobId);
  const dupSourceJob = (jobs || []).find((j) => j.id === dupSource.jobId);
  const dupCustChanged = dupTargetJob && dupSourceJob && dupTargetJob.customer !== dupSourceJob.customer;
  const dupActiveJobs = (jobs || []).filter((j) => j.status !== "Deleted");
  // Eligible sources: same-WO tickets that aren't deleted. Voided tickets
  // stay listed (copying FROM a voided original is legitimate for reissue flows)
  // but are badged so the user sees what they're picking.
  const sourceOptions = (tickets || []).filter((t) => t.jobId === ticket.jobId && !t.deletedAt).sort((a, b) => (b.ticketNumber || 0) - (a.ticketNumber || 0));

  const chk = { width: 16, height: 16, cursor: "pointer", accentColor: C.blue };
  const lbl = { fontSize: 13, cursor: "pointer", userSelect: "none" };

  const handleSubmit = async () => {
    setDupSubmitting(true);
    try {
      await onDuplicate(dupSource, {
        new_date: dupDate,
        new_job_id: dupJobId !== dupSource.jobId ? dupJobId : undefined,
        new_type: dupType !== dupSource.type ? dupType : undefined,
        assigned_wells: incWells ? dupSource.assignedWells : [],
        include_notes: incNotes,
        include_line_items: incLineItems,
        include_pin: dupCustChanged ? false : incPin,
        include_site_mgr: !dupCustChanged,
      });
      onClose();
    } finally {
      setDupSubmitting(false);
    }
  };

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.nested} width={500} accent={C.blue} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>Duplicate Ticket</div>

      {/* Source — progressive disclosure. Label shows the current source;
            "(change)" reveals an inline dropdown of eligible same-WO tickets. */}
      <div style={{ marginBottom: 20, padding: "10px 12px", background: C.steel, borderRadius: 6 }}>
        {!dupSourcePickerOpen ? (
          <div style={{ fontSize: 12, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>DUPLICATING FROM:</span>
            <span style={{ color: C.text, fontWeight: 600 }}>
              #{dupSource.jobId}
              {dupSource.ticketNumber ? `-${dupSource.ticketNumber}` : ""}
            </span>
            {dupSource.date && <span style={{ color: C.muted }}>· {String(dupSource.date).slice(0, 10)}</span>}
            <span style={{ color: C.muted }}>· {dupSource.type || "—"}</span>
            {dupSource.voidedAt && <span style={{ color: C.red, fontWeight: 700 }}>VOIDED</span>}
            {sourceOptions.length > 1 && (
              <button
                type="button"
                onClick={() => setDupSourcePickerOpen(true)}
                style={{
                  marginLeft: "auto",
                  background: "transparent",
                  border: "none",
                  color: C.blue,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
              >
                (change)
              </button>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>DUPLICATING FROM</div>
            <select
              value={dupSourceId}
              onChange={(e) => setDupSourceId(Number(e.target.value))}
              style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}
            >
              {sourceOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  #{t.jobId}
                  {t.ticketNumber ? `-${t.ticketNumber}` : ""} · {String(t.date || "").slice(0, 10)} · {t.type || "—"}
                  {t.voidedAt ? " · VOIDED" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setDupSourcePickerOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: C.blue,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                padding: "8px 0 0",
                textDecoration: "underline",
              }}
            >
              done
            </button>
          </div>
        )}
      </div>

      {/* Type */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TICKET TYPE</div>
        <select
          value={dupType}
          onChange={(e) => setDupType(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}
        >
          {DUP_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TICKET DATE</div>
        <input
          type="date"
          value={dupDate}
          onChange={(e) => setDupDate(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }}
        />
      </div>

      {/* Target Job */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>ASSIGN TO WORK ORDER</div>
        <select
          value={dupJobId}
          onChange={(e) => setDupJobId(Number(e.target.value))}
          style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}
        >
          {dupActiveJobs.map((j) => (
            <option key={j.id} value={j.id}>
              #{j.id} — {j.customer} ({j.location})
            </option>
          ))}
        </select>
        {dupJobId !== dupSource.jobId && dupTargetJob && <div style={{ fontSize: 11, color: C.blue, marginTop: 4 }}>Customer: {dupTargetJob.customer}</div>}
      </div>

      {/* Carry Over Options — all counts/flags reflect the chosen SOURCE */}
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>CARRY OVER</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "12px 14px", background: C.steel, borderRadius: 6 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
          <input type="checkbox" checked={incLineItems} onChange={(e) => setIncLineItems(e.target.checked)} style={chk} />
          Line Items ({dupSource.lineItems?.length || 0} items)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
          <input type="checkbox" checked={incNotes} onChange={(e) => setIncNotes(e.target.checked)} style={chk} />
          Notes
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl, opacity: dupCustChanged ? 0.5 : 1 }}>
          <input
            type="checkbox"
            checked={dupCustChanged ? false : incPin}
            onChange={(e) => setIncPin(e.target.checked)}
            disabled={dupCustChanged}
            style={{ ...chk, cursor: dupCustChanged ? "not-allowed" : "pointer" }}
          />
          Google Pin {dupCustChanged && <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>(different customer)</span>}
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
          <input type="checkbox" checked={incWells} onChange={(e) => setIncWells(e.target.checked)} style={chk} />
          Assigned Wells
        </label>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="blue" onClick={handleSubmit} disabled={dupSubmitting}>
          {dupSubmitting ? "DUPLICATING..." : "DUPLICATE"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default TicketDuplicateModal;
