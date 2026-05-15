import { useState } from "react";
import { C, API_URL } from "./config.js";
import { today, mapTicketFromApi, updateTicketApi, reviseTicketRequest } from "./utils.js";
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

function JobTicketsTab({ jobId, tickets, setTickets, jobs, onTicketDeleted }) {
  const { currentUser, showNotice } = useApp();
  const { showAdd, openAdd, closeAdd, handleAdd } = useAddTicket({ setTickets });
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const emailRequest = useTicketEmailRequest({ setTickets });
  const isMobile = useIsMobile();
  const { viewTicket, viewTicketMode, setViewTicket, setViewTicketMode, openTicket, closeViewTicket } = useTicketModalRouting({ tickets, isMobile });

  // v28.40 — WO surface shows only tickets in the lead's domain. Approved
  // tickets ship to Final Review; sentToQB / qbVerified / voided tickets
  // ship to Archive. Derivation extracted to useJobTicketsView in v28.83.
  const { jobTickets, movedToFinalReview } = useJobTicketsView(tickets, jobId);

  // v28.90 — lifted from inside the .map (was recomputed N times per
  // render). Same value for every row of this tab.
  const job = jobs.find((j) => j.id === jobId);
  const custEmail = job?.pocEmail || job?.poc_email || null;

  const handleUpdate = (id, updates) => updateTicketApi(id, updates, setTickets);

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
            approve: () => handleUpdate(t.id, { status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() }),
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
          onUpdate={(id, updates) => {
            handleUpdate(id, updates);
            setViewTicket((prev) => (prev ? { ...prev, ...updates } : null));
          }}
          onClose={closeViewTicket}
          onDelete={(id) => {
            handleDelete(id);
          }}
          onDuplicate={async (t, opts = {}) => {
            try {
              const targetJobId = opts.new_job_id || t.jobId;
              const r = await fetch(`${API_URL}/tickets/${t.id}/duplicate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  new_date: opts.new_date || (t.date ? t.date.slice(0, 10) : today()),
                  new_job_id: opts.new_job_id || undefined,
                  new_type: opts.new_type || undefined,
                  assigned_wells: opts.assigned_wells ?? t.assignedWells,
                  include_notes: opts.include_notes ?? true,
                  include_line_items: opts.include_line_items ?? true,
                  include_pin: opts.include_pin ?? true,
                  include_site_mgr: opts.include_site_mgr ?? true,
                  created_by: currentUser?.id || null,
                }),
              });
              if (!r.ok) {
                const d = await r.json();
                showNotice("Duplicate Failed", d.error || "Could not duplicate the ticket.", "error");
                return;
              }
              const saved = await r.json();
              // Reload tickets for the target job
              const tr = await fetch(`${API_URL}/tickets?job_id=${targetJobId}&include_voided=true`);
              if (tr.ok) {
                const data = await tr.json();
                const mapped = data.map(mapTicketFromApi);
                setTickets((prev) => {
                  // Remove old tickets for target job, add refreshed ones
                  const otherJobs = prev.filter((tk) => tk.jobId !== targetJobId);
                  // If duplicating to a different job, also keep source job tickets
                  if (targetJobId !== t.jobId) {
                    const sourceJobTickets = prev.filter((tk) => tk.jobId === t.jobId);
                    return [...otherJobs.filter((tk) => tk.jobId !== t.jobId), ...sourceJobTickets, ...mapped];
                  }
                  return [...otherJobs, ...mapped];
                });
                if (targetJobId === t.jobId) {
                  // Same job — open the new ticket inline
                  const newTicket = mapped.find((tk) => tk.id === saved.id);
                  if (newTicket) {
                    setViewTicketMode("edit");
                    setViewTicket({ ...newTicket, _duplicateReminder: true });
                  }
                } else {
                  // Different job — close modal, navigate to target job
                  setViewTicket(null);
                }
              }
            } catch (err) {
              showNotice("Duplicate Failed", err.message, "error");
            }
          }}
          onRevise={async (t, reason, opts = {}) => {
            const result = await reviseTicketRequest({
              ticket: t,
              reason,
              alsoCreateNew: !!opts.alsoCreateNew,
              setTickets,
              showNotice,
            });
            if (result.newTicket) {
              setViewTicketMode("edit");
              setViewTicket(result.newTicket);
            } else {
              setViewTicket(null);
            }
          }}
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
