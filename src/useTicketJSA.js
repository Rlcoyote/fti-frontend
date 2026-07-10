import { useState, useEffect } from "react";
import { API_URL } from "./config.js";
import { useApp } from "./AppContext.jsx";

// ─── useTicketJSA (v27.88) ───────────────────────────────────────────────────
// Owns the JSA lifecycle for a ticket: loading, modal-open state, and the
// save handler. Extracted from TicketDetail.jsx as part of the Option-3
// Article XXV pass — the inline onSave handler was hiding 25 lines of fetch
// logic inside JSX props, which is exactly the kind of sneaky complexity
// Article XXV exists to surface.
//
// Returns:
//   existingJSA — loaded JSA object with fields normalized from snake_case
//     DB columns to camelCase UI shape (wellName, designatedDriver, etc.)
//   jsaLoaded — true once the load attempt has completed (success OR error);
//     used by TicketJsaBar to show READY vs LOADING state
//   showJSA / setShowJSA — modal open flag
//   handleJsaSave(jsaData) — PUT to the correct endpoint (ticket-scoped if
//     ticket.id, job-scoped otherwise), then refresh local state and tell
//     the parent to flip hasJSA so the ticket row badge updates
//
// Dependencies:
//   ticket — needs .id
//   job — needs .id (for job-scoped fallback endpoint)
//   onUpdate(ticketId, partial) — parent callback to reflect hasJSA:true
//     on the ticket row without a full refetch

// v28.313 — ONE home for raw-jsa-row → JSAModal shape. The modal reads
// camelCase (ppe.frClothing, presenterReview, signatures as name strings);
// the API returns the raw row (ppe_fr_clothing, presenter_review, signature
// objects). The per-day open path (TicketDetail.openDayJsa) previously
// passed the RAW row straight in — every per-day JSA opened with ALL PPE
// boxes false regardless of what was saved ("the checkmarks are different
// for each user", field report 2026-07-10, same jsa row: the lead saw his
// in-memory checked state; everyone else saw the un-normalized defaults).
export const normalizeJsaRow = (data) => ({
  ...data,
  wellName: data.well_name,
  designatedDriver: data.designated_driver,
  presenterReview: data.presenter_review,
  lat: data.latitude,
  lng: data.longitude,
  ppe: {
    frClothing: data.ppe_fr_clothing,
    toolsTrained: data.ppe_tools_trained,
    confinedSpace: data.ppe_confined_space,
  },
  signatures: (data.signatures || []).map((s) => s.name || s),
  additionalSteps: (data.additional_steps || []).map((s) => ({
    step: s.step,
    hazard: s.hazard,
    procedure: s.procedure,
  })),
});

export default function useTicketJSA(ticket, job, onUpdate) {
  const { showNotice } = useApp();
  const [existingJSA, setExistingJSA] = useState(null);
  const [jsaLoaded, setJsaLoaded] = useState(false);
  const [showJSA, setShowJSA] = useState(false);

  // v28.313 — loadJsa is callable, not just a mount effect: the JSA MODAL
  // refetches at open. The mount-only fetch left each phone holding the
  // snapshot from when the TICKET was opened — the lead edits PPE/weather,
  // and every phone with the ticket already open seeds the modal from its
  // own stale copy ("the checkmarks are different for each user", field
  // report 2026-07-10, SAME jsa row). Worse, a stale save would write the
  // old flags back over the lead's edits.
  const loadJsa = () => {
    if (!ticket.id) return Promise.resolve(null);
    return fetch(`${API_URL}/jsas/ticket/${ticket.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setExistingJSA(normalizeJsaRow(data));
        setJsaLoaded(true);
        return data;
      })
      .catch(() => {
        setJsaLoaded(true);
        return null;
      });
  };

  // Load on mount (badge state needs it before any modal opens).
  useEffect(() => {
    loadJsa();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  // Open the JSA modal AFTER a fresh fetch, so the form's initializers seed
  // from the server's current row — never the mount-time snapshot.
  const openJSA = async () => {
    await loadJsa();
    setShowJSA(true);
  };

  // Save handler. Endpoint picks itself based on whether the ticket has an
  // ID yet (ticket-scoped) or we're saving pre-creation (job-scoped).
  //
  // v28.07.2 — capture the JSA id from the backend response and merge it
  // into local state. Earlier code did `setExistingJSA(jsaData)` which
  // dropped the new id (form values had no id field), so subsequent
  // re-opens of the modal saw existingJSA without an id and the v28.07
  // FTI CREW BIOMETRIC SIGNATURES section couldn't activate. Now the
  // returned jsaId is preserved, plus the form fields are kept so the
  // modal can stay open after save and immediately surface the live
  // signers section.
  const handleJsaSave = async (jsaData) => {
    if (!job) return null;
    try {
      const endpoint = ticket.id ? `${API_URL}/jsas/ticket/${ticket.id}` : `${API_URL}/jsas/${job.id}`;
      const r = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          date: jsaData.date,
          time: jsaData.time,
          operator: jsaData.operator,
          well_name: jsaData.wellName,
          designated_driver: jsaData.designatedDriver,
          latitude: jsaData.lat,
          longitude: jsaData.lng,
          weather: jsaData.weather,
          ppe_fr_clothing: jsaData.ppe?.frClothing || false,
          ppe_tools_trained: jsaData.ppe?.toolsTrained || false,
          ppe_confined_space: jsaData.ppe?.confinedSpace || false,
          presenter_review: jsaData.presenterReview,
          signatures: jsaData.signatures,
          additional_steps: jsaData.additionalSteps,
        }),
      });
      // v28.231 — fetch doesn't throw on 4xx/5xx. A failed JSA save must NOT
      // flip hasJSA / set existingJSA as if it saved — this is safety paperwork.
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        showNotice("JSA didn't save", errBody.error || "The Job Safety Analysis could not be saved. Try again.", "error");
        return null;
      }
      const responseData = await r.json().catch(() => null);
      // v28.20 — JSA ids are UUIDs (jsas.id is UUID per schema.sql), not
      // integers. The v28.09 numeric-only check was wrong: it coerced UUIDs
      // to NaN and stored `id: null`, which broke JSACrewSigners (it sees
      // !jsaId and never fetches required-signers, hanging on the loading
      // state forever). Accept any non-empty string from the response.
      const candidate = responseData?.jsaId ?? existingJSA?.id;
      const newId =
        typeof candidate === "string" && candidate.trim() ? candidate.trim() : typeof candidate === "number" && candidate > 0 ? String(candidate) : null;
      const merged = { ...jsaData, id: newId };
      setExistingJSA(merged);
      // v28.41 — flip hasJSA but NOT jsaCompleted. Saving creates a draft;
      // the badge stays in DRAFT state until MARK COMPLETE fires.
      if (onUpdate) onUpdate(ticket.id, { hasJSA: true, has_jsa: true });
      return merged;
    } catch (err) {
      console.error("JSA save failed:", err);
      return null;
    }
  };

  // v28.41 — called by JSAModal after a successful POST /jsas/:id/complete.
  // Flips jsaCompleted on the parent ticket row so the badge turns green
  // immediately, without waiting for a full ticket refetch.
  const handleJsaCompleted = () => {
    setExistingJSA((prev) => (prev ? { ...prev, completed_at: new Date().toISOString() } : prev));
    if (onUpdate) onUpdate(ticket.id, { jsaCompleted: true, jsa_completed: true });
  };

  return {
    existingJSA,
    jsaLoaded,
    showJSA,
    setShowJSA,
    openJSA,
    handleJsaSave,
    handleJsaCompleted,
  };
}
