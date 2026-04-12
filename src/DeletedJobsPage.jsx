import { useState } from "react";
import { C } from "./config.js";
import { formatDate } from "./utils.js";
import { Btn, TICKET_TYPES } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── Deleted Items page ──────────────────────────────────────────────────────
// Two clearly distinct sections: Deleted Jobs (red accent) and Deleted Tickets
// (blue accent, typed left-border per ticket type). Per-item RESTORE/ARCHIVE
// buttons always visible. A top-right SELECT button enters batch-select mode,
// which surfaces per-row checkboxes and a scoped action bar:
//   [SELECT ALL JOBS]  [SELECT ALL TICKETS]  [ARCHIVE (N)]  [CANCEL]
// Per-item buttons remain functional during select mode so single actions
// don't require exiting.

function DeletedJobsPage({ deletedJobs, deletedTickets = [], jobs, handleRestoreJob, handleArchiveJob, handleRestoreTicket, handleArchiveTicket }) {
  const { currentUser } = useApp();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState(() => new Set());
  const [selectedTickets, setSelectedTickets] = useState(() => new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canArchive = ["owner", "admin"].includes(currentUser.role);
  const totalDeleted = deletedJobs.length + deletedTickets.length;
  const selectedCount = selectedJobs.size + selectedTickets.size;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedJobs(new Set());
    setSelectedTickets(new Set());
  };

  const toggleJob = (id) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTicket = (id) => {
    setSelectedTickets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllJobs = () => {
    if (selectedJobs.size === deletedJobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(deletedJobs.map(j => j.id)));
    }
  };

  const selectAllTickets = () => {
    if (selectedTickets.size === deletedTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(deletedTickets.map(t => t.id)));
    }
  };

  const archiveSelected = async () => {
    const jobIds = [...selectedJobs];
    const ticketIds = [...selectedTickets];
    for (const id of jobIds) {
      // eslint-disable-next-line no-await-in-loop
      await handleArchiveJob(id);
    }
    for (const id of ticketIds) {
      // eslint-disable-next-line no-await-in-loop
      await handleArchiveTicket(id);
    }
    setConfirmOpen(false);
    exitSelectMode();
  };

  // ─── Row styles ──
  const jobRowStyle = {
    background: "#fdf0f0", border: `1px solid ${C.red}33`, borderLeft: `3px solid ${C.red}`,
    borderRadius: 6, padding: "16px 20px", marginBottom: 8,
    display: "flex", alignItems: "center", gap: 12,
  };
  const ticketRowStyle = (tcfg) => ({
    background: "#e8f0fb", border: `1px solid ${C.blue}33`, borderLeft: `3px solid ${tcfg.color}`,
    borderRadius: 6, padding: "16px 20px", marginBottom: 8,
    display: "flex", alignItems: "center", gap: 12,
  });

  // Section header style — bigger, chip-like, with section-accent color
  const sectionHeaderStyle = (accent, count, label) => ({
    display: "inline-flex", alignItems: "center", gap: 10,
    background: accent.bg, color: accent.color,
    border: `1px solid ${accent.color}44`,
    borderRadius: 6, padding: "8px 14px",
    fontSize: 12, fontWeight: 800, letterSpacing: "0.08em",
    marginBottom: 12, marginTop: 24,
  });

  const checkboxStyle = {
    width: 17, height: 17, accentColor: C.blue, cursor: "pointer", flexShrink: 0,
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Deleted Items</h1>
        {canArchive && totalDeleted > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {!selectMode ? (
              <Btn variant="ghost" onClick={() => setSelectMode(true)}>SELECT</Btn>
            ) : (
              <>
                {deletedJobs.length > 0 && (
                  <Btn variant="ghost" small onClick={selectAllJobs}>
                    {selectedJobs.size === deletedJobs.length ? "DESELECT ALL WORK ORDERS" : "SELECT ALL WORK ORDERS"}
                  </Btn>
                )}
                {deletedTickets.length > 0 && (
                  <Btn variant="ghost" small onClick={selectAllTickets}>
                    {selectedTickets.size === deletedTickets.length ? "DESELECT ALL TICKETS" : "SELECT ALL TICKETS"}
                  </Btn>
                )}
                <button
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() => setConfirmOpen(true)}
                  style={{
                    background: selectedCount === 0 ? C.steel : C.red,
                    color: selectedCount === 0 ? C.muted : C.white,
                    border: "none", borderRadius: 4, padding: "8px 16px",
                    fontSize: 12, fontWeight: 800, letterSpacing: "0.04em",
                    cursor: selectedCount === 0 ? "not-allowed" : "pointer",
                    opacity: selectedCount === 0 ? 0.6 : 1,
                  }}
                >ARCHIVE ({selectedCount})</button>
                <Btn variant="ghost" small onClick={exitSelectMode}>CANCEL</Btn>
              </>
            )}
          </div>
        )}
      </div>

      {totalDeleted === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>Nothing in the trash.</div>
      )}

      {/* ── DELETED JOBS ── */}
      {deletedJobs.length > 0 && (
        <>
          <div style={sectionHeaderStyle({ color: C.red, bg: "#fdf0f0" })}>
            <span style={{ fontSize: 14 }}>●</span>
            DELETED WORK ORDERS ({deletedJobs.length})
          </div>
          {deletedJobs.map(job => (
            <div key={job.id} style={jobRowStyle}>
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selectedJobs.has(job.id)}
                  onChange={() => toggleJob(job.id)}
                  style={checkboxStyle}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Work Order #{job.id}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{job.customer} — {job.location}</div>
                {job.wells?.length > 0 && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{job.wells.map(w => w.well_name || w).join(", ")}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Btn small variant="blue" onClick={() => handleRestoreJob(job.id)}>RESTORE</Btn>
                {canArchive && (
                  <Btn small onClick={() => handleArchiveJob(job.id)}>ARCHIVE</Btn>
                )}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── DELETED TICKETS ── */}
      {deletedTickets.length > 0 && (
        <>
          <div style={sectionHeaderStyle({ color: C.blue, bg: "#e8f0fb" })}>
            <span style={{ fontSize: 14 }}>●</span>
            DELETED TICKETS ({deletedTickets.length})
          </div>
          {deletedTickets.map(t => {
            const job = jobs.find(j => j.id === t.jobId);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            const total = (t.lineItems || []).reduce((s, li) => s + ((li.rate || 0) * (li.qty || 0) * (li.days || 1)), 0);
            return (
              <div key={t.id} style={ticketRowStyle(tcfg)}>
                {selectMode && (
                  <input
                    type="checkbox"
                    checked={selectedTickets.has(t.id)}
                    onChange={() => toggleTicket(t.id)}
                    style={checkboxStyle}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
                      Ticket #{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
                      color: tcfg.color, background: tcfg.bg || "#fff",
                      border: `1px solid ${tcfg.color}44`,
                      borderRadius: 3, padding: "2px 8px",
                    }}>{tcfg.label || t.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{job?.customer || "Unknown"} — {formatDate(t.date)}</div>
                  {t.lineItems?.length > 0 && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      {t.lineItems.length} line item{t.lineItems.length !== 1 ? "s" : ""} — ${total.toFixed(2)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <Btn small variant="blue" onClick={() => handleRestoreTicket(t.id)}>RESTORE</Btn>
                  {canArchive && (
                    <Btn small onClick={() => handleArchiveTicket(t.id)}>ARCHIVE</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Confirm batch archive ── */}
      {confirmOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>
              Archive {selectedCount} Selected Item{selectedCount !== 1 ? "s" : ""}?
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 8, lineHeight: 1.6 }}>
              You are about to archive:
            </div>
            <ul style={{ fontSize: 13, color: C.text, marginTop: 0, marginBottom: 16, paddingLeft: 20, lineHeight: 1.6 }}>
              {selectedJobs.size > 0 && (
                <li><strong>{selectedJobs.size}</strong> work order{selectedJobs.size !== 1 ? "s" : ""}</li>
              )}
              {selectedTickets.size > 0 && (
                <li><strong>{selectedTickets.size}</strong> ticket{selectedTickets.size !== 1 ? "s" : ""}</li>
              )}
            </ul>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              Archived items move to the Archive page and cannot be restored.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={archiveSelected}>CONFIRM — ARCHIVE {selectedCount}</Btn>
              <Btn variant="ghost" onClick={() => setConfirmOpen(false)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default DeletedJobsPage;
