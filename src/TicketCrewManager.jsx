import { useState, useEffect, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { Btn, labelStyle, inputStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

// ─── TicketCrewManager (v28.06) ─────────────────────────────────────────────
// Per-ticket crew assignment + lead designation. Renders inside TicketDetail
// between Site Manager and Time & Mileage. Lists active crew, lets the lead
// (or manager+) add/remove members and change the lead.
//
// Backend contract:
//   GET    /tickets/:id/crew                — list active crew
//   POST   /tickets/:id/crew                — body { user_id, is_lead? }
//   DELETE /tickets/:id/crew/:userId        — soft-remove
//   PUT    /tickets/:id/crew/lead           — body { user_id }
//
// Authorization is enforced server-side. Client just hides controls when the
// caller's role + ticket-state combo doesn't permit modification (avoids
// surfacing buttons that would 403).
//
// Why a separate component instead of inlining: this is the prerequisite
// plumbing for the v28.07 JSA biometric flow — JSA auto-pop reads the crew
// list this component manages. Keeping it isolated makes the JSA integration
// in v28.07 a clean dependency, not a refactor.

function TicketCrewManager({ ticketId, ticketIsClosed, editable }) {
  const { currentUser, users } = useApp();
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [pendingUserId, setPendingUserId] = useState("");
  const [pendingIsLead, setPendingIsLead] = useState(false);
  const [busy, setBusy] = useState(false);

  // Permission to mutate this ticket's crew. Client-side hint only — server
  // enforces. Owner/admin/manager always; lead of THIS ticket while open.
  const userIsTicketLead = crew.some(c => c.user_id === currentUser?.id && c.is_lead);
  const role = currentUser?.role || "";
  const canModify = !ticketIsClosed && editable && (
    ["owner", "admin", "manager"].includes(role) || userIsTicketLead
  );
  // Closed-ticket modification: owner/admin only (server enforces; UI hides)
  const canModifyClosed = ticketIsClosed && ["owner", "admin"].includes(role);
  const canMutate = canModify || canModifyClosed;

  const fetchCrew = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew`);
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || `Could not load crew (${r.status})`);
        return;
      }
      setCrew(await r.json());
    } catch {
      setError("Connection error loading crew");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (ticketId) fetchCrew();
  }, [ticketId, fetchCrew]);

  const addMember = async () => {
    if (!pendingUserId) { setError("Pick a crew member first"); return; }
    setBusy(true); setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: pendingUserId, is_lead: pendingIsLead }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Could not add crew member");
        return;
      }
      setShowAdd(false);
      setPendingUserId("");
      setPendingIsLead(false);
      await fetchCrew();
    } catch {
      setError("Connection error adding crew member");
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this ticket's crew? Their JSA signature (if any) stays in the audit trail.`)) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew/${userId}`, {
        method: "DELETE",
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Could not remove crew member");
        return;
      }
      await fetchCrew();
    } catch {
      setError("Connection error removing crew member");
    } finally {
      setBusy(false);
    }
  };

  const setLead = async (userId) => {
    setBusy(true); setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew/lead`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Could not change lead");
        return;
      }
      await fetchCrew();
    } catch {
      setError("Connection error changing lead");
    } finally {
      setBusy(false);
    }
  };

  // Available users to add — active users not already on the crew.
  const activeCrewIds = new Set(crew.map(c => c.user_id));
  const addableUsers = (users || [])
    .filter(u => u.is_active !== false)
    .filter(u => !activeCrewIds.has(u.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const sectionStyle = {
    background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
    padding: 14, marginBottom: 14,
  };
  const headerStyle = {
    fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.1em",
    marginBottom: 10, textTransform: "uppercase",
  };

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={headerStyle}>Ticket Crew{loading ? " — loading..." : ` (${crew.length})`}</div>
        {canMutate && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: "transparent", border: `1px solid ${C.blue}`, color: C.blue,
              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 3,
              cursor: "pointer", letterSpacing: "0.06em",
            }}
          >+ ADD CREW</button>
        )}
      </div>

      {/* Crew list */}
      {!loading && crew.length === 0 && (
        <div style={{
          fontSize: 12, color: C.muted, fontStyle: "italic",
          padding: "10px 12px", background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
        }}>
          No crew assigned to this ticket yet. {canMutate ? "Add at least the lead before opening the JSA." : ""}
        </div>
      )}

      {crew.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
          {crew.map((c, i) => (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                background: c.is_lead ? "#fdf5d8" : C.cardBg,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {c.user_name}
                  {c.is_lead && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#8a6500",
                      background: "#ffffffaa", border: `1px solid #8a650044`,
                      padding: "1px 6px", borderRadius: 3, letterSpacing: "0.08em",
                    }}>LEAD</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {c.user_role}{c.user_job_title ? ` · ${c.user_job_title}` : ""}
                </div>
              </div>
              {canMutate && (
                <div style={{ display: "flex", gap: 6 }}>
                  {!c.is_lead && (
                    <button
                      onClick={() => setLead(c.user_id)}
                      disabled={busy}
                      title="Designate as lead"
                      style={{
                        background: "transparent", border: `1px solid ${C.muted}55`,
                        color: C.muted, fontSize: 10, fontWeight: 700,
                        padding: "3px 8px", borderRadius: 3, cursor: busy ? "default" : "pointer",
                        letterSpacing: "0.06em",
                      }}
                    >MAKE LEAD</button>
                  )}
                  <button
                    onClick={() => removeMember(c.user_id, c.user_name)}
                    disabled={busy}
                    title="Remove from ticket"
                    style={{
                      background: "transparent", border: `1px solid ${C.red}33`,
                      color: C.red, fontSize: 10, fontWeight: 700,
                      padding: "3px 8px", borderRadius: 3, cursor: busy ? "default" : "pointer",
                      letterSpacing: "0.06em",
                    }}
                  >REMOVE</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add panel */}
      {showAdd && (
        <div style={{
          marginTop: 12, padding: 12, background: C.steel,
          border: `1px solid ${C.border}`, borderRadius: 4,
        }}>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>EMPLOYEE</label>
            <select
              style={inputStyle}
              value={pendingUserId}
              onChange={e => setPendingUserId(e.target.value)}
            >
              <option value="">— pick employee —</option>
              {addableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.role ? ` (${u.role})` : ""}
                </option>
              ))}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 12, color: C.text, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={pendingIsLead}
              onChange={e => setPendingIsLead(e.target.checked)}
            />
            Designate as lead (replaces any current lead)
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={addMember} disabled={busy || !pendingUserId}>
              {busy ? "ADDING..." : "ADD TO CREW"}
            </Btn>
            <Btn onClick={() => { setShowAdd(false); setPendingUserId(""); setPendingIsLead(false); setError(""); }} variant="ghost">
              CANCEL
            </Btn>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: 10, color: C.red, fontSize: 12, fontWeight: 700,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default TicketCrewManager;
