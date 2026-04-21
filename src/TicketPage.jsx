import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { C, API_URL } from "./config.js";
import { mapTicketFromApi, buildTicketPayload } from "./utils.js";
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
          const found = all.find(t => t.id === parseInt(id));
          if (found) setTicket(mapTicketFromApi(found));
        }
      } catch (err) { console.error("Fetch ticket failed:", err); }
      setLoading(false);
    };
    fetchTicket();
  }, [id, location.state]);

  const handleUpdate = (ticketId, updates) => {
    // Update local state
    setTicket(prev => prev ? { ...prev, ...updates } : null);
    // Also update the tickets array in FTIDashboard if available
    if (setTickets) {
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updates } : t));
    }
    // Persist to backend
    const payload = buildTicketPayload(updates);
    fetch(`${API_URL}/tickets/${ticketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(err => console.error("Ticket update failed:", err));
  };

  const handleDelete = async (ticketId) => {
    try {
      await fetch(`${API_URL}/tickets/${ticketId}`, { method: "DELETE" });
    } catch (err) { console.error("Delete failed:", err); }
    if (setTickets) setTickets(prev => prev.filter(t => t.id !== ticketId));
    navigate(-1);
  };

  if (loading) return <BrandedSplash tagline="Loading ticket..." />;
  if (!ticket) return (
    <div style={{ padding: "40px 20px", textAlign: "center", color: C.muted }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Ticket not found</div>
      <button onClick={() => navigate(-1)} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>GO BACK</button>
    </div>
  );

  return (
    <TicketDetail
      ticket={ticket}
      jobs={jobs}
      openToSign={openToSign}
      asPage={true}
      onUpdate={(ticketId, updates) => { handleUpdate(ticketId, updates); setTicket(prev => prev ? { ...prev, ...updates } : null); }}
      onClose={() => navigate(-1)}
      onDelete={handleDelete}
      onDuplicate={async (t, opts = {}) => {
        try {
          const r = await fetch(`${API_URL}/tickets/${t.id}/duplicate`, {
            method: "POST", headers: { "Content-Type": "application/json" },
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
              setTickets(prev => [...prev, mapTicketFromApi(saved)]);
            }
          }
        } catch (err) { console.error("Duplicate failed:", err); }
      }}
      onRevise={async (t, reason, opts = {}) => {
        const alsoCreateNew = !!opts.alsoCreateNew;
        try {
          const r = await fetch(`${API_URL}/tickets/${t.id}/revise`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voided_reason: reason || null, also_create_new: alsoCreateNew }),
          });
          if (!r.ok) { const d = await r.json().catch(() => ({})); alert(d.error || "Revise failed"); return; }
          const saved = await r.json();
          // Refresh the tickets array with real data from the backend (not the
          // minimal {id, ticket_number, voided_id} response — mapping that directly
          // produced a near-empty ticket object and caused the "Unknown" display bug).
          let newTicket = null;
          if (setTickets) {
            const tr = await fetch(`${API_URL}/tickets?job_id=${t.jobId}&include_voided=true`);
            if (tr.ok) {
              const data = await tr.json();
              const mapped = data.map(mapTicketFromApi);
              setTickets(prev => {
                const otherJobs = prev.filter(tk => tk.jobId !== t.jobId);
                return [...otherJobs, ...mapped];
              });
              if (alsoCreateNew && saved.id != null) {
                newTicket = mapped.find(tk => tk.id === saved.id) || null;
              }
            }
          }
          if (alsoCreateNew && newTicket) {
            navigate(`/ticket/${saved.id}`, { state: { ticket: newTicket } });
          } else if (alsoCreateNew && saved.id != null) {
            alert(`Ticket voided and revision #${saved.ticket_number} was created, but could not be loaded. Returning to the list.`);
            navigate(-1);
          } else {
            // Void only — return to source
            navigate(-1);
          }
        } catch (err) { alert("Revise failed: " + err.message); }
      }}
    />
  );
}

export default TicketPage;
