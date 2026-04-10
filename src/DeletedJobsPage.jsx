import { useState } from "react";
import { C } from "./config.js";
import { formatDate } from "./utils.js";
import { Btn, TICKET_TYPES } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function DeletedJobsPage({ deletedJobs, deletedTickets = [], jobs, handleRestoreJob, handleArchiveJob, handleRestoreTicket, handleArchiveTicket }) {
  const { currentUser } = useApp();
  const [showArchiveAllConfirm, setShowArchiveAllConfirm] = useState(false);
  const canArchive = ["owner", "admin"].includes(currentUser.role);
  const totalDeleted = deletedJobs.length + deletedTickets.length;
  return (
    <div style={{ padding: "24px 28px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Deleted Items</h1>
      </div>
      {totalDeleted === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted, fontSize: 14 }}>Nothing in the trash.</div>
      )}

      {/* ── DELETED JOBS ── */}
      {deletedJobs.length > 0 && (
        <>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 8, marginTop: 16 }}>DELETED JOBS ({deletedJobs.length})</div>
          {deletedJobs.map(job => (
            <div key={job.id} style={{
              background: "#fdf0f0", border: `1px solid ${C.red}33`, borderLeft: `3px solid ${C.red}`,
              borderRadius: 6, padding: "16px 20px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Job #{job.id}</div>
                <div style={{ fontSize: 13, color: C.muted }}>{job.customer} — {job.location}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{job.wells?.map(w => w.well_name || w).join(", ")}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small onClick={() => handleRestoreJob(job.id)} variant="blue">RESTORE</Btn>
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
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 8, marginTop: 24 }}>DELETED TICKETS ({deletedTickets.length})</div>
          {deletedTickets.map(t => {
            const job = jobs.find(j => j.id === t.jobId);
            const tcfg = TICKET_TYPES[t.type] || { color: C.muted, label: t.type };
            return (
              <div key={t.id} style={{
                background: "#fdf0f0", border: `1px solid ${C.red}33`, borderLeft: `3px solid ${tcfg.color}`,
                borderRadius: 6, padding: "16px 20px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
              }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Ticket #{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: tcfg.color }}>{tcfg.label || t.type}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.muted }}>{job?.customer || "Unknown"} — {formatDate(t.date)}</div>
                  {t.lineItems?.length > 0 && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{t.lineItems.length} line item{t.lineItems.length !== 1 ? "s" : ""} — ${t.lineItems.reduce((s, li) => s + ((li.rate || 0) * (li.qty || 0) * (li.days || 1)), 0).toFixed(2)}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small onClick={() => handleRestoreTicket(t.id)} variant="blue">RESTORE</Btn>
                  {canArchive && (
                    <Btn small onClick={() => handleArchiveTicket(t.id)}>ARCHIVE</Btn>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {canArchive && deletedJobs.length > 0 && (
        <>
          {showArchiveAllConfirm && (
            <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowArchiveAllConfirm(false)}>
              <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Archive All Deleted Jobs?</div>
                <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
                  This will archive all {deletedJobs.length} deleted job{deletedJobs.length !== 1 ? "s" : ""} and their associated data to the permanent archive. This cannot be undone.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn onClick={async () => { for (const job of deletedJobs) { await handleArchiveJob(job.id); } setShowArchiveAllConfirm(false); }}>CONFIRM — ARCHIVE ALL</Btn>
                  <Btn variant="ghost" onClick={() => setShowArchiveAllConfirm(false)}>CANCEL</Btn>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


export default DeletedJobsPage;
