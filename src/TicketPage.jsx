import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C, API_URL } from "./config.js";
import { mapTicketFromApi, buildTicketPayload, reviseTicketRequest, ticketSaveErrorMessage } from "./utils.js";
import { useApp } from "./AppContext.jsx";
import TicketDetail from "./TicketDetail.jsx";
import BrandedSplash from "./BrandedSplash.jsx";

// Mobile-only route-based ticket view at /ticket/:id
// Renders TicketDetail as a full page instead of a modal overlay.
// Receives ticket data via router location.state when available,
// otherwise fetches fresh from the API.

function TicketPage({ jobs, tickets, setTickets }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotice } = useApp();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const openToSign = location.state?.openToSign || false;

  useEffect(() => {
    // Try router state first (passed from JobTicketsTab/AllTicketsPage)
    if (location.state?.ticket) {
      setTicket(location.state.ticket);
      setLoading(false);
      return;
    }
    // Fallback: fetch from API
    const fetchTicket = async () => {
      try {
        const r = await fetch(`${API_URL}/tickets?job_id=&include_voided=true`);
        if (r.ok) {
          const all = await r.json();
          const found = all.find((t) => t.id === parseInt(id));
          if (found) setTicket(mapTicketFromApi(found));
        }
      } catch (err) {
        console.error("Fetch ticket failed:", err);
      }
      setLoading(false);
    };
    fetchTicket();
  }, [id, location.state]);

  // v28.228 — persist FIRST, reflect locally only on success. Previously this
  // optimistically updated state before the PUT and ignored the response, so a
  // rejected save (time gate, future-date, lock, perms) looked saved until a
  // refresh reverted it. Now a rejection surfaces its reason and the UI stays
  // truthful.
  const handleUpdate = async (ticketId, updates) => {
    const payload = buildTicketPayload(updates);
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        showNotice("Couldn't save", await ticketSaveErrorMessage(r), "error");
        return;
      }
    } catch (err) {
      console.error("Ticket update failed:", err);
      showNotice("Couldn't save", "A network error occurred while saving the ticket.", "error");
      return;
    }
    setTicket((prev) => (prev ? { ...prev, ...updates } : null));
    if (setTickets) setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, ...updates } : t)));
  };

  const handleDelete = async (ticketId) => {
    // v28.230 — fetch doesn't throw on 4xx/5xx; check r.ok so a rejected
    // delete doesn't vanish from the UI (and navigate away) as if it worked.
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}`, { method: "DELETE" });
      if (!r.ok) {
        showNotice("Couldn't delete", await ticketSaveErrorMessage(r), "error");
        return;
      }
    } catch (err) {
      console.error("Delete failed:", err);
      showNotice("Couldn't delete", "A network error occurred while deleting the ticket.", "error");
      return;
    }
    if (setTickets) setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    navigate(-1);
  };

  if (loading) return <BrandedSplash tagline="Loading ticket..." />;
  if (!ticket)
    return (
      <div style={{ padding: "40px 20px", textAlign: "center", color: C.muted }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Ticket not found</div>
        <button
          className="fti-btn"
          onClick={() => navigate(-1)}
          style={{
            background: C.blue,
            color: C.white,
            border: "none",
            borderRadius: 4,
            padding: "10px 20px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          GO BACK
        </button>
      </div>
    );

  return (
    <TicketDetail
      ticket={ticket}
      jobs={jobs}
      tickets={tickets}
      openToSign={openToSign}
      asPage={true}
      onUpdate={handleUpdate}
      onClose={() => navigate(-1)}
      onDelete={handleDelete}
      onDuplicate={async (t, opts = {}) => {
        try {
          const r = await fetch(`${API_URL}/tickets/${t.id}/duplicate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_date: opts.new_date || (t.date ? t.date.slice(0, 10) : new Date().toLocaleDateString("en-CA")),
              new_job_id: opts.new_job_id || undefined,
              new_type: opts.new_type || undefined,
              assigned_wells: opts.assigned_wells ?? t.assignedWells,
            }),
          });
          if (r.ok) {
            const saved = await r.json();
            if (setTickets) {
              setTickets((prev) => [...prev, mapTicketFromApi(saved)]);
            }
          }
        } catch (err) {
          console.error("Duplicate failed:", err);
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
          navigate(`/ticket/${result.newTicket.id}`, { state: { ticket: result.newTicket } });
        } else {
          navigate(-1);
        }
      }}
    />
  );
}

export default TicketPage;
