import { API_URL } from "./config.js";
import JSAModal from "./JSAModal.jsx";
import { useApp } from "./AppContext.jsx";

// ─── AddTicketJsaPortal (v28.63 — extracted from AddTicketModal) ──────────────
// Conditional JSAModal portal mounted by AddTicketModal. Encapsulates the
// PUT-to-/jsas/ticket/:id wiring and the local existingJSA state updates
// that follow successful save / complete.
//
// Per CAM XXV: the save/complete callbacks live here because they're
// hyper-specific to this portal mounting (capture jsaId from response,
// stamp completed_at locally to reflect completion in subsequent re-opens).
// The portal receives the parent state (job, ticket fields, existingJSA,
// setExistingJSA, onClose) as props.

export default function AddTicketJsaPortal({
  open,
  savedTicketId,
  jobId,
  job,
  type,
  date,
  startDate,
  ticketPinLat,
  ticketPinLng,
  ticketPin,
  assignedWells,
  existingJSA,
  setExistingJSA,
  onClose,
}) {
  const { showNotice } = useApp();
  if (!(open && savedTicketId)) return null;

  return (
    <JSAModal
      job={job}
      ticket={{
        id: savedTicketId,
        date: type === "Rental" ? startDate : date,
        type,
        pinLat: ticketPinLat,
        pinLng: ticketPinLng,
        googlePin: ticketPin,
        assignedWells,
      }}
      existingJSA={existingJSA}
      onClose={onClose}
      onSave={async (jsaData) => {
        try {
          // v28.07.4 — capture jsaId from PUT response so existingJSA.id is
          // set; JSACrewSigners' parent gating depends on it.
          const r = await fetch(`${API_URL}/jsas/ticket/${savedTicketId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_id: jobId,
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
          // v28.232 — fetch doesn't throw on 4xx/5xx; a failed JSA save must
          // not set existingJSA as if it saved (safety paperwork).
          if (!r.ok) {
            const errBody = await r.json().catch(() => ({}));
            showNotice("JSA didn't save", errBody.error || "The Job Safety Analysis could not be saved. Try again.", "error");
            return;
          }
          const responseData = await r.json().catch(() => null);
          const newId = responseData?.jsaId || existingJSA?.id || null;
          setExistingJSA({ ...jsaData, id: newId });
        } catch (err) {
          console.error("JSA save failed:", err);
          showNotice("JSA didn't save", "A network error occurred saving the Job Safety Analysis.", "error");
        }
      }}
      onComplete={() => {
        // v28.41 — stamp completed_at locally so subsequent re-opens see
        // the JSA as complete.
        setExistingJSA((prev) => (prev ? { ...prev, completed_at: new Date().toISOString() } : prev));
      }}
    />
  );
}
