import { useState, useEffect, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import CopyCrewModal from "./CopyCrewModal.jsx";

// ─── CrewSelectionManager (v28.09, renamed from TicketCrewManager) ─────────
// Per-ticket crew selection + lead designation. Renders inside TicketDetail
// between Site Manager and Google Pin. Lists active crew, lets the lead
// (or manager+) add/remove members and change the lead.
//
// v28.09 UX overhaul:
//   - "TICKET CREW" → "CREW SELECTION" (matches the section's user-facing
//     intent — selecting WHO is on this ticket — and aligns the variable
//     names in AddTicketModal that mirror this surface)
//   - Drop the "+ ADD CREW" button + the secondary add-panel. The dropdown
//     lives at the top of the section permanently; selecting an employee
//     adds them immediately. One tap to add, not three.
//   - "— pick employee —" → "— select employee —" placeholder
//   - First-added is auto-designated as lead (matches pre-save staged UX in
//     AddTicketModal)
//   - 📋 COPY CREW FROM RIG UP button when a Rig Up exists on the job and
//     this isn't itself an RU ticket. Opens CopyCrewModal with progressive-
//     disclosure source picker mirroring TicketDuplicateModal.
//
// Backend contract (unchanged):
//   GET    /tickets/:id/crew                — list active crew
//   POST   /tickets/:id/crew                — body { user_id, is_lead? }
//   DELETE /tickets/:id/crew/:userId        — soft-remove
//   PUT    /tickets/:id/crew/lead           — body { user_id }

function CrewSelectionManager({ ticketId, ticketIsClosed, editable, ticketType = null, jobId = null }) {
  const { currentUser, users } = useApp();
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [hasRigUp, setHasRigUp] = useState(false);

  // Permission to mutate this ticket's crew. Client-side hint only — server
  // enforces. Owner/admin/manager always; lead of THIS ticket while open.
  const userIsTicketLead = crew.some(c => c.user_id === currentUser?.id && c.is_lead);
  const role = currentUser?.role || "";
  const canModify = !ticketIsClosed && editable && (
    ["owner", "admin", "manager"].includes(role) || userIsTicketLead
  );
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

  // Detect whether the parent job has a non-voided Rig Up (other than this
  // ticket if it happens to be one). Drives visibility of the COPY CREW
  // FROM RIG UP button. Pattern matches LineItemEditor.copyFromRigUp gate.
  useEffect(() => {
    if (!jobId || ticketType === "Rig Up") { setHasRigUp(false); return; }
    fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const rigUps = (data || []).filter(tk => tk.type === "Rig Up" && !tk.voided_at);
        setHasRigUp(rigUps.length > 0);
      })
      .catch(() => setHasRigUp(false));
  }, [jobId, ticketType]);

  // Add a crew member directly on dropdown change. First-added is auto-lead.
  const addMember = async (userId, isLead = false) => {
    if (!userId) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_lead: isLead }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || "Could not add crew member");
        return;
      }
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

  // Bulk-add from CopyCrewModal. Sequential POSTs preserve add-order; lead
  // designation is carried over from the source so the same person remains
  // the lead on the target ticket.
  const bulkAdd = async (members) => {
    if (!members?.length) { setShowCopy(false); return; }
    setBusy(true); setError("");
    try {
      for (const m of members) {
        await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: m.user_id, is_lead: !!m.is_lead }),
        });
      }
      await fetchCrew();
      setShowCopy(false);
    } catch {
      setError("Connection error during copy");
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={headerStyle}>Crew Selection{loading ? " — loading..." : ` (${crew.length})`}</div>
        {canMutate && hasRigUp && (
          <Btn small variant="ghost" onClick={() => setShowCopy(true)} disabled={busy}>
            📋 COPY CREW FROM RIG UP
          </Btn>
        )}
      </div>

      {/* Permanent select-to-add dropdown — no +ADD button. Selecting a name
          immediately POSTs the addition; first-added becomes lead. */}
      {canMutate && (
        <div style={{ marginBottom: 12 }}>
          <select
            style={inputStyle}
            value=""
            disabled={busy || addableUsers.length === 0}
            onChange={e => {
              const id = e.target.value;
              if (!id) return;
              addMember(id, crew.length === 0); // first-added = lead
            }}
          >
            <option value="">
              {addableUsers.length === 0 ? "— all employees on crew —" : "— select employee —"}
            </option>
            {addableUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}{u.role ? ` (${u.role})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Crew list */}
      {!loading && crew.length === 0 && (
        <div style={{
          fontSize: 12, color: C.muted, fontStyle: "italic",
          padding: "10px 12px", background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
        }}>
          No crew assigned yet. {canMutate ? "Select an employee above to add them — the first becomes lead." : ""}
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

      {error && (
        <div style={{ marginTop: 10, color: C.red, fontSize: 12, fontWeight: 700 }}>
          {error}
        </div>
      )}

      {showCopy && (
        <CopyCrewModal
          jobId={jobId}
          excludeTicketId={ticketId}
          existingCrewUserIds={activeCrewIds}
          onClose={() => setShowCopy(false)}
          onCopy={bulkAdd}
        />
      )}
    </div>
  );
}

export default CrewSelectionManager;
