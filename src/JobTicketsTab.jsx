// ─── JobTicketsTab (v28.92 — final shell, 11 of 11 ships) ──────────────────
// Composition root for the Tickets tab on the Job Detail page.
//
// Was a 1008-line monolith pre-v28.82. The v28.82 → v28.92 file-split
// arc lifted seven coherent units into siblings:
//
//   Hooks                                    Components
//   ─────                                    ──────────
//   useIsMobile           (v28.82)           JobTicketsHeader      (v28.84)
//   useJobTicketsView     (v28.83)           EmailSignatureRequestModal (v28.86)
//   useTicketEmailRequest (v28.85)           JobTicketsDeleteConfirm    (v28.87)
//   useAddTicket          (v28.88)           JobTicketsRow         (v28.90)
//   useTicketModalRouting (v28.89)
//   useTicketDetailModalActions (v28.91)
//
// What's left here is pure orchestration: which hooks compose the page,
// which components render the parts, and the small glue (handleDelete,
// archiveVoidedTicket, handleUpdate) that ties parent-owned cross-cutting
// state to the leaves. Per CAM Article XXIV (File Split Protocol), a
// component this small can stop splitting — further extraction would
// fragment without simplifying.

import { useState } from "react";
import { C, API_URL } from "./config.js";
import { updateTicketApi, validateTicketForApproval } from "./utils.js";
import TicketDetail from "./TicketDetail.jsx";
import AddTicketModal from "./AddTicketModal.jsx";
import { useApp } from "./AppContext.jsx";
import useIsMobile from "./useIsMobile.js";
import useJobTicketsView from "./useJobTicketsView.js";
import JobTicketsHeader from "./JobTicketsHeader.jsx";
import useTicketEmailRequest from "./useTicketEmailRequest.js";
import EmailSignatureRequestModal from "./EmailSignatureRequestModal.jsx";
import JobTicketsDeleteConfirm from "./JobTicketsDeleteConfirm.jsx";
import useAddTicket from "./useAddTicket.js";
import useTicketModalRouting from "./useTicketModalRouting.js";
import JobTicketsRow from "./JobTicketsRow.jsx";
import useTicketDetailModalActions from "./useTicketDetailModalActions.js";

function JobTicketsTab({ jobId, tickets, setTickets, jobs, onTicketDeleted }) {
  const { currentUser, showNotice } = useApp();
  const { showAdd, openAdd, closeAdd, handleAdd } = useAddTicket({ setTickets });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const emailRequest = useTicketEmailRequest({ setTickets });
  const isMobile = useIsMobile();
  const { viewTicket, viewTicketMode, setViewTicket, setViewTicketMode, openTicket, closeViewTicket } = useTicketModalRouting({ tickets, isMobile });
  const { handleDuplicate, handleRevise } = useTicketDetailModalActions({ setTickets, setViewTicket, setViewTicketMode });

  // v28.40 — WO surface shows only tickets in the lead's domain. Approved
  // tickets ship to Final Review; sentToQB / qbVerified / voided tickets
  // ship to Archive. Derivation extracted to useJobTicketsView in v28.83.
  const { jobTickets, movedToFinalReview } = useJobTicketsView(tickets, jobId);

  // v28.90 — lifted from inside the .map (was recomputed N times per
  // render). Same value for every row of this tab.
  const job = jobs.find((j) => j.id === jobId);
  const custEmail = job?.pocEmail || job?.poc_email || null;

  const handleUpdate = (id, updates) => updateTicketApi(id, updates, setTickets, (msg) => showNotice("Couldn't save", msg, "error"));

  // v28.87 — unified delete path. Used by both the detail-modal onDelete
  // and the row-level delete-confirm modal. Returns true on success so
  // the caller can close its own UI; surfaces a user-facing notice on
  // failure (was a silent console.error in the v28.85 detail-modal path).
  const handleDelete = async (id) => {
    try {
      const r = await fetch(`${API_URL}/tickets/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        showNotice("Delete Failed", d.error || `Could not delete the ticket (HTTP ${r.status}).`, "error");
        return false;
      }
    } catch (err) {
      showNotice("Delete Failed", err.message, "error");
      return false;
    }
    const deleted = tickets.find((t) => t.id === id);
    if (deleted && onTicketDeleted) onTicketDeleted(deleted);
    setTickets((prev) => prev.filter((t) => t.id !== id));
    setViewTicket(null);
    return true;
  };

  // v28.90 — owner/admin "archive a voided ticket" action. Fire-and-forget
  // POST + optimistic state filter. The row renders the button; we own the
  // I/O so the row stays pure.
  const archiveVoidedTicket = async (ticketId) => {
    try {
      await fetch(`${API_URL}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity_type: "ticket", entity_id: ticketId, archived_by: currentUser.id, archive_reason: "voided" }),
      });
      setTickets((prev) => prev.filter((tk) => tk.id !== ticketId));
    } catch (err) {
      console.error("Archive failed:", err);
    }
  };

  return (
    <div style={{ padding: "16px 0" }}>
      <JobTicketsHeader ticketCount={jobTickets.length} approvedCount={movedToFinalReview} onAdd={openAdd} />

      {jobTickets.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>No tickets yet. Add one to get started.</div>
      )}

      {jobTickets.map((t) => (
        <JobTicketsRow
          key={t.id}
          ticket={t}
          job={job}
          custEmail={custEmail}
          isMobile={isMobile}
          isActiveTicket={viewTicket?.id === t.id}
          currentUser={currentUser}
          actions={{
            open: (mode) => openTicket(t, mode),
            // v28.189 — block approval when time-data is incomplete. Same
            // validation as TicketDetail.handleApprove. The ticket object `t`
            // already carries the camelCase fields off mapTicketFromApi, so
            // pass it directly to the helper.
            approve: () => {
              const check = validateTicketForApproval(t);
              if (!check.ok) {
                showNotice("Cannot approve yet", check.error, "error");
                return;
              }
              handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
            },
            archiveVoided: () => archiveVoidedTicket(t.id),
            requestEmail: () => emailRequest.openEmailRequest(t, custEmail),
            requestDelete: () => setDeleteConfirmId(t.id),
          }}
        />
      ))}

      {showAdd && <AddTicketModal jobId={jobId} job={job} onSave={handleAdd} onClose={closeAdd} jobWells={(job?.wells || []).map((w) => w.well_name || w)} />}
      {viewTicket && (
        <TicketDetail
          key={viewTicket.id}
          ticket={viewTicket}
          jobs={jobs}
          tickets={tickets}
          openToSign={viewTicketMode === "sign"}
          onUpdate={async (id, updates) => {
            const res = await handleUpdate(id, updates);
            if (res?.ok) setViewTicket((prev) => (prev ? { ...prev, ...updates } : null));
          }}
          onClose={closeViewTicket}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onRevise={handleRevise}
        />
      )}
      {/* Delete ticket confirmation — uses the unified handleDelete path */}
      <JobTicketsDeleteConfirm
        ticket={deleteConfirmId ? jobTickets.find((t) => t.id === deleteConfirmId) : null}
        onConfirm={async () => {
          const ok = await handleDelete(deleteConfirmId);
          if (ok) setDeleteConfirmId(null);
        }}
        onClose={() => setDeleteConfirmId(null)}
      />
      <EmailSignatureRequestModal emailRequest={emailRequest} />
    </div>
  );
}

export default JobTicketsTab;
