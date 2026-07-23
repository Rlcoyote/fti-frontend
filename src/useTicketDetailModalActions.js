import { API_URL } from "./config.js";
import { today, mapTicketFromApi, reviseTicketRequest } from "./utils.js";
import { useApp } from "./AppContext.jsx";

// ─── useTicketDetailModalActions (v28.91 — ship 10 of WorkOrderTicketsTab split) ─
// Owns the two non-trivial callbacks the TicketDetail modal asks the
// parent to satisfy: onDuplicate and onRevise. Both are I/O-heavy and
// reach into setTickets / setViewTicket / setViewTicketMode — perfect
// shape for a hook.
//
// Returns:
//   handleDuplicate(t, opts?)  — POST /tickets/:id/duplicate with the
//                                opts (new_date / new_job_id / new_type /
//                                assigned_wells / include flags), then
//                                refetch the target job's tickets and
//                                merge. If the duplicate stays in the
//                                same job, reopens with the new ticket
//                                in the modal (with _duplicateReminder
//                                set for the inline banner). If the
//                                duplicate goes to a different job,
//                                closes the modal (user navigates next).
//   handleRevise(t, reason, opts?)
//                              — defers to reviseTicketRequest which
//                                already encapsulates the API call +
//                                error handling + setTickets merge.
//                                Here we just handle the post-result
//                                branch (reopen with result.newTicket
//                                if present, else close).
//
// Dependencies passed in: setTickets, setViewTicket, setViewTicketMode.
// currentUser + showNotice come via useApp inside the hook.

export default function useTicketDetailModalActions({ setTickets, setViewTicket, setViewTicketMode }) {
  const { currentUser, showNotice } = useApp();

  const handleDuplicate = async (t, opts = {}) => {
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
  };

  const handleRevise = async (t, reason, opts = {}) => {
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
  };

  return { handleDuplicate, handleRevise };
}
