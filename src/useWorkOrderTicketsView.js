import { useMemo } from "react";
import { TICKET_STATUS_ORDER, WO_TICKET_STATUSES } from "./config.js";

// ─── useWorkOrderTicketsView (v28.83 — ship 2 of WorkOrderTicketsTab split) ────────────
// Derives the view-model for the Tickets tab of a single work order. Pure
// — no I/O, no side effects, no React state of its own. Memoized so the
// sort/filter passes only re-run when `tickets` or `workOrderId` actually change.
//
// Returns:
//   jobTickets         — tickets for this job whose status is in
//                        WO_TICKET_STATUSES (the WO surface — incomplete,
//                        emailed, signed, sigNotReq), sorted by canonical
//                        lifecycle order with most-recent-date tiebreak
//                        within the same status.
//   movedToFinalReview — count of approved tickets for this job
//                        (displayed as "{N} approved → Final Review"
//                        in the header).
//
// Per CAM Article XXIV (File Split Protocol), this is one coherent unit:
// "everything you need to know about WHICH tickets to render and in what
// order, given the raw list and a job id."
//
// `byType` (grouped-by-type) is intentionally omitted — it was computed
// by the inline code in WorkOrderTicketsTab.jsx but never actually read. If a
// future feature wants it, add it back; in the meantime an unused field
// in the hook contract is clutter.

export default function useWorkOrderTicketsView(tickets, workOrderId) {
  return useMemo(() => {
    const allJobTickets = tickets.filter((t) => t.workOrderId === workOrderId);
    const jobTickets = allJobTickets
      .filter((t) => WO_TICKET_STATUSES.includes(t.status))
      .sort((a, b) => {
        const ai = TICKET_STATUS_ORDER.indexOf(a.status);
        const bi = TICKET_STATUS_ORDER.indexOf(b.status);
        if (ai !== bi) return ai - bi;
        // Tiebreak: most recent date first within the same status
        return (b.date || "").localeCompare(a.date || "");
      });
    const movedToFinalReview = allJobTickets.filter((t) => t.status === "approved").length;
    return { jobTickets, movedToFinalReview };
  }, [tickets, workOrderId]);
}
