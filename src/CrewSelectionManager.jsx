import { useState, useEffect, useCallback } from "react";
import { API_URL } from "./config.js";
import { useApp } from "./AppContext.jsx";
import CrewSelectionView from "./CrewSelectionView.jsx";
import CopyCrewModal from "./CopyCrewModal.jsx";

// ─── CrewSelectionManager (v28.06; renamed in v28.09; refactored v28.13) ───
// Live (post-save) Crew Selection surface for an existing ticket. Owns the
// data lifecycle:
//   - Fetches /tickets/:id/crew on mount and after every mutation
//   - Translates user actions into POST/PUT/DELETE on the same endpoint
//   - Detects sibling Rig Up tickets to expose the COPY CREW button
// All visual rendering is delegated to <CrewSelectionView/>. The same
// view is rendered by AddTicketModal's pre-save staged surface — see
// CrewSelectionView header for the rationale.
//
// Backend contract (unchanged since v28.06):
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

  // Permission to mutate this ticket's crew. Client-side hint only —
  // server enforces. Owner/admin/manager always; lead of THIS ticket
  // while the ticket is open. Closed tickets: owner/admin only.
  // v28.139 (permissions audit Phase 5.5) — intentionally NOT a can()
  // matrix key: "lead of THIS ticket" is per-record context a flat
  // role->boolean key cannot express. Mirrors the backend
  // canModifyTicketCrew. Documented, intentional exception — keep.
  const userIsTicketLead = crew.some((c) => c.user_id === currentUser?.id && c.is_lead);
  const role = currentUser?.role || "";
  const canModify = !ticketIsClosed && editable && (["owner", "admin", "manager"].includes(role) || userIsTicketLead);
  const canModifyClosed = ticketIsClosed && ["owner", "admin"].includes(role);
  const canMutate = canModify || canModifyClosed;

  const fetchCrew = useCallback(async () => {
    setLoading(true);
    setError("");
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

  // Detect whether the parent job has a non-voided Rig Up so the COPY
  // CREW FROM RIG UP button can surface. Skipped if the current ticket
  // is itself a Rig Up — copying from sibling RUs onto a new RU isn't
  // a workflow we expose. Pattern matches LineItemEditor's hasRigUp gate.
  useEffect(() => {
    if (!jobId || ticketType === "Rig Up") {
      setHasRigUp(false);
      return;
    }
    fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rigUps = (data || []).filter((tk) => tk.type === "Rig Up" && !tk.voided_at);
        setHasRigUp(rigUps.length > 0);
      })
      .catch(() => setHasRigUp(false));
  }, [jobId, ticketType]);

  const handleAdd = async (userId, isLead) => {
    if (!userId) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, is_lead: !!isLead }),
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

  const handleRemove = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this ticket's crew? Their JSA signature (if any) stays in the audit trail.`)) return;
    setBusy(true);
    setError("");
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

  const handleSetLead = async (userId) => {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/tickets/${ticketId}/crew/lead`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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

  // Bulk-add from CopyCrewModal. v28.13 — preserve the destination's
  // existing lead. If dest already has a lead, override is_lead=false on
  // every incoming member so we don't accidentally demote the dest lead
  // via the atomic backend lead-promote behavior. Within the incoming
  // batch, only the first is_lead member is honored (defensive — should
  // be at most one anyway).
  const bulkAdd = async (members) => {
    if (!members?.length) {
      setShowCopy(false);
      return;
    }
    setBusy(true);
    setError("");
    let leadAssigned = crew.some((c) => c.is_lead);
    try {
      for (const m of members) {
        const isLead = !!m.is_lead && !leadAssigned;
        if (isLead) leadAssigned = true;
        await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: m.user_id, is_lead: isLead }),
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

  const activeCrewIds = new Set(crew.map((c) => c.user_id));
  const addableUsers = (users || [])
    .filter((u) => u.is_active !== false)
    .filter((u) => !activeCrewIds.has(u.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <>
      <CrewSelectionView
        crew={crew}
        loading={loading}
        error={error}
        busy={busy}
        canMutate={canMutate}
        addableUsers={addableUsers}
        hasCopySource={hasRigUp}
        onCopySource={() => setShowCopy(true)}
        onAdd={handleAdd}
        onSetLead={handleSetLead}
        onRemove={handleRemove}
        emptyMessage={canMutate ? "No crew assigned yet. Select an employee above to add — the first becomes lead." : "No crew assigned yet."}
        rowKeyFor={(c) => c.id}
      />

      {showCopy && (
        <CopyCrewModal jobId={jobId} excludeTicketId={ticketId} existingCrewUserIds={activeCrewIds} onClose={() => setShowCopy(false)} onCopy={bulkAdd} />
      )}
    </>
  );
}

export default CrewSelectionManager;
