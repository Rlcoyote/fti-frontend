import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── useTicketModalRouting (v28.89 — ship 8 of WorkOrderTicketsTab split) ────────
// Owns the "open a ticket" flow used by the Tickets tab on the Job
// Detail page. The flow forks on viewport:
//
//   Mobile  — push /ticket/:id as a real page (full-screen experience
//             on small viewports; back-button works naturally).
//   Desktop — open as a modal overlay over the tab via viewTicket /
//             viewTicketMode state.
//
// Before navigating/opening, the ticket is "enriched" with revision-
// lineage display labels so the detail view can show "Replaced by
// 12345-007" / "Revision of 12345-005" without the parent needing
// another fetch.
//
// Returns:
//   viewTicket          — currently-displayed ticket on desktop, null
//                         when closed
//   viewTicketMode      — "edit" | "sign" — controls openToSign on
//                         the TicketDetail mount
//   openTicket(t, mode) — enrich + fork (mobile navigate vs desktop modal)
//   setViewTicket       — exposed for onUpdate's inline merge in the
//                         <TicketDetail> mount, and for the duplicate/
//                         revise flows that reopen with a new ticket
//   setViewTicketMode   — exposed for the duplicate/revise reopen paths
//   closeViewTicket()   — convenience setter (() => setViewTicket(null))

export default function useTicketModalRouting({ tickets, isMobile }) {
  const navigate = useNavigate();
  const [viewTicket, setViewTicket] = useState(null);
  const [viewTicketMode, setViewTicketMode] = useState("edit");

  const openTicket = (t, mode = "edit") => {
    // Compute revision display labels
    const enriched = { ...t };
    if (t.replacedBy) {
      const replacement = tickets.find((tk) => tk.id === t.replacedBy);
      enriched._replacedByLabel = replacement ? `${t.jobId}-${replacement.ticketNumber}` : null;
    }
    if (t.revisionOf) {
      const original = tickets.find((tk) => tk.id === t.revisionOf);
      enriched._revisionOfLabel = original ? `${t.jobId}-${original.ticketNumber}` : null;
    }
    // Mobile: navigate to /ticket/:id as a real page
    if (isMobile) {
      navigate(`/ticket/${t.id}`, { state: { ticket: enriched, openToSign: mode === "sign" } });
      return;
    }
    // Desktop: open as modal overlay
    setViewTicketMode(mode);
    setViewTicket(enriched);
  };

  const closeViewTicket = () => setViewTicket(null);

  return {
    viewTicket,
    viewTicketMode,
    setViewTicket,
    setViewTicketMode,
    openTicket,
    closeViewTicket,
  };
}
