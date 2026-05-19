import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import useIsMobile from "./useIsMobile.js";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import { useApp } from "./AppContext.jsx";
import EmergencyContactsModal from "./EmergencyContactsModal.jsx";
import UnsavedChangesModal from "./UnsavedChangesModal.jsx";
import JSACrewSigners from "./JSACrewSigners.jsx";
import JSAModalHeader from "./JSAModalHeader.jsx";
import JSAJobSteps from "./JSAJobSteps.jsx";
import JSAPpeWeather from "./JSAPpeWeather.jsx";
import JSALocationPin from "./JSALocationPin.jsx";

function JSAModal({ job, ticket, onClose, onSave, onComplete, existingJSA }) {
  const { settings, currentUser } = useApp();
  const [showEmergencyEdit, setShowEmergencyEdit] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const isMobile = useIsMobile();

  // Ref to latest handleClose — lets mobile popstate listener always see current dirty state
  const handleCloseRef = useRef();

  useEffect(() => {
    if (!isMobile) return;
    window.history.pushState({ jsaOpen: true }, "");
    const handlePop = () => {
      handleCloseRef.current?.();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile]);
  const emergencyContacts = useMemo(() => {
    try {
      const c = JSON.parse(settings?.emergency_contacts || "[]");
      return Array.isArray(c) ? c : [];
    } catch {
      return [];
    }
  }, [settings]);
  const jsa = existingJSA;
  const ticketNum = ticket ? `${job.id}${ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}` : job.id;
  const wellsList = ticket?.assignedWells?.length > 0 ? ticket.assignedWells : (job.wells || []).map((w) => (typeof w === "string" ? w : w.well_name || w));
  // Postgres DATE columns can come back as full ISO timestamps (e.g.
  // "2026-04-25T00:00:00.000Z"); <input type="date"> only accepts YYYY-MM-DD
  // and silently drops anything longer, leaving the field blank. Slice both
  // sources before handing them to the input.
  const toDateInput = (d) => (d ? String(d).slice(0, 10) : "");
  const [date, setDate] = useState(toDateInput(jsa?.date) || toDateInput(ticket?.date) || today());
  const [operator, setOperator] = useState(jsa?.operator || job.customer);
  // Auto-populate all wells from the ticket's assigned wells (not editable — Article X).
  const wellName = jsa?.wellName || jsa?.well_name || wellsList.join(", ") || "—";
  const [time, setTime] = useState(jsa?.time || "");
  const [designatedDriver, setDesignatedDriver] = useState(jsa?.designatedDriver || "");

  // v28.07.1 — Designated Driver dropdown sourced from the ticket's active
  // crew (ticket_crew table). Fetched once on mount when ticket is present.
  // Free-text fallback shown if the ticket has no crew assigned yet.
  const [ticketCrewForDD, setTicketCrewForDD] = useState([]);
  useEffect(() => {
    if (!ticket?.id) return;
    fetch(`${API_URL}/tickets/${ticket.id}/crew`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setTicketCrewForDD(Array.isArray(rows) ? rows : []))
      .catch(() => setTicketCrewForDD([]));
  }, [ticket?.id]);

  // v28.07.2 — Save state for non-blocking save flow. Modal stays open
  // after save (so the FTI CREW BIOMETRIC SIGNATURES section becomes
  // immediately usable on a fresh JSA). lastSavedAt powers the "Saved
  // HH:MM" indicator next to the Save button.
  const [lastSavedAt, setLastSavedAt] = useState(null);
  // v28.10 — MARK COMPLETE state. v28.51 — repurposed for AUTO-complete:
  // when the last required crew member signs, JSACrewSigners.onAllSigned
  // fires the same /complete endpoint without a manual button. The
  // `completing` flag still gates the call so a flurry of fetchSigners
  // events doesn't fire /complete more than once.
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");
  // v28.51 — "ENABLE CREW SIGNING" lazy-create state. Pre-v28.51 the user
  // clicked SAVE JSA at the bottom of the modal to materialize the row;
  // now they click the button inline with the crew-signing section, which
  // is closer to where they're trying to act. The JSA is upserted on close
  // too (handleClose) so any field edits made AFTER the lazy create still
  // persist. SAVE JSA + MARK COMPLETE buttons are gone.
  const [enabling, setEnabling] = useState(false);
  const [lat, setLat] = useState(jsa?.lat || jsa?.latitude || ticket?.pinLat || ticket?.pin_lat || job?.pinLat || job?.pin_lat || "");
  const [lng, setLng] = useState(jsa?.lng || jsa?.longitude || ticket?.pinLng || ticket?.pin_lng || job?.pinLng || job?.pin_lng || "");
  // mapLink, mapResolving, nearbyHospitals + the hospital fetch moved into
  // JSALocationPin (v28.157) — they're pin-local, no payload meaning.

  const [weather, setWeather] = useState(jsa?.weather || []);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherAutoTags, setWeatherAutoTags] = useState([]);

  // Auto-fetch weather conditions when coordinates are available (new JSAs only)
  useEffect(() => {
    if (!lat || !lng || jsa?.weather?.length > 0) return; // don't overwrite existing JSA weather
    fetch(`${API_URL}/safety/weather?lat=${lat}&lng=${lng}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tags?.length > 0) {
          setWeather(d.tags);
          setWeatherAutoTags(d.tags);
          setWeatherData(d);
        }
      })
      .catch(() => {});
  }, [lat, lng]);
  const [ppe, setPpe] = useState(jsa?.ppe || { frClothing: false, toolsTrained: false, confinedSpace: false });
  const [signatures, setSignatures] = useState(jsa?.signatures || [""]);
  const [presenterReview, setPresenterReview] = useState(
    jsa?.presenterReview ||
      "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!",
  );
  const [additionalSteps, setAdditionalSteps] = useState(jsa?.additionalSteps || [{ step: "", hazard: "", procedure: "" }]);

  // v28.41 — auto-create-on-mount removed. The v28.10 implementation wrote
  // a draft JSA the moment the modal opened, even when the user closed
  // without input. That made the ticket-level "✓ JSA" badge show green
  // for any opened-but-not-actually-completed JSA. The badge now reads
  // jsa_completed (a real completion signal: jsas.completed_at IS NOT NULL),
  // and the JSA row is created by the explicit SAVE JSA click below. The
  // FTI CREW BIOMETRIC SIGNATURES section gates on existingJSA?.id (see
  // line ~483 below) — it just doesn't render until a save has happened,
  // and a hint guides the user to click SAVE first.

  const toggleWeather = (w) => setWeather((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));

  // Dirty-state detection for close confirmation. Captures the state the JSA opened with.
  // Weather is clean if it matches either the original OR the auto-populated tags (auto-pop fires after mount).
  const origRef = useRef({
    date: toDateInput(jsa?.date) || toDateInput(ticket?.date) || today(),
    operator: jsa?.operator || job.customer,
    time: jsa?.time || "",
    designatedDriver: jsa?.designatedDriver || "",
    lat: String(jsa?.lat || jsa?.latitude || ticket?.pinLat || ticket?.pin_lat || job?.pinLat || job?.pin_lat || ""),
    lng: String(jsa?.lng || jsa?.longitude || ticket?.pinLng || ticket?.pin_lng || job?.pinLng || job?.pin_lng || ""),
    weather: jsa?.weather || [],
    ppe: jsa?.ppe || { frClothing: false, toolsTrained: false, confinedSpace: false },
    signatures: jsa?.signatures || [""],
    presenterReview:
      jsa?.presenterReview ||
      "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!",
    additionalSteps: jsa?.additionalSteps || [{ step: "", hazard: "", procedure: "" }],
  });

  const isDirty = () => {
    const o = origRef.current;
    const weatherCurrent = JSON.stringify([...weather].sort());
    const weatherOrig = JSON.stringify([...o.weather].sort());
    const weatherAuto = JSON.stringify([...weatherAutoTags].sort());
    const weatherIsDirty = weatherCurrent !== weatherOrig && weatherCurrent !== weatherAuto;
    return (
      date !== o.date ||
      operator !== o.operator ||
      time !== o.time ||
      designatedDriver !== o.designatedDriver ||
      String(lat) !== o.lat ||
      String(lng) !== o.lng ||
      weatherIsDirty ||
      JSON.stringify(ppe) !== JSON.stringify(o.ppe) ||
      JSON.stringify(signatures) !== JSON.stringify(o.signatures) ||
      presenterReview !== o.presenterReview ||
      JSON.stringify(additionalSteps) !== JSON.stringify(o.additionalSteps)
    );
  };

  // v28.51 — build the current form's payload. Used by both ENABLE CREW
  // SIGNING (lazy-create) and the on-close upsert.
  const buildJsaPayload = () => ({
    jobId: job.id,
    ticketId: ticket?.id || null,
    date,
    time,
    operator,
    wellName,
    designatedDriver,
    lat,
    lng,
    weather,
    ppe,
    signatures: (signatures || []).filter(Boolean),
    presenterReview,
    additionalSteps: additionalSteps.filter((s) => s.step || s.hazard || s.procedure),
    savedAt: new Date().toISOString(),
  });

  // v28.51 — create the JSA on demand when the user clicks "ENABLE CREW
  // SIGNING" inside the crew-signing hint. Pre-v28.51 the user had to
  // scroll to a SAVE JSA button at the bottom of a long modal, which
  // Reggie called out as cumbersome. Now the action is right next to
  // where the section will appear.
  const handleEnableCrewSigning = async () => {
    if (enabling) return;
    setEnabling(true);
    try {
      await onSave(buildJsaPayload());
      setLastSavedAt(new Date());
      // Refresh the dirty baseline now that what's on disk matches what's
      // in the form, so handleClose's upsert pass doesn't double-write.
      origRef.current = {
        date,
        operator,
        time,
        designatedDriver,
        lat: String(lat || ""),
        lng: String(lng || ""),
        weather: [...weather],
        ppe: { ...ppe },
        signatures: [...signatures],
        presenterReview,
        additionalSteps: additionalSteps.map((s) => ({ ...s })),
      };
    } finally {
      setEnabling(false);
    }
  };

  // v28.51 — auto-complete when JSACrewSigners reports all required signed.
  // v28.52 — wrapped in useCallback. JSACrewSigners has fetchSigners as a
  // useCallback with `onAllSigned` in its deps; useEffect re-fires whenever
  // fetchSigners' identity changes. Pre-v28.52 handleAllSigned was a fresh
  // function reference on every JSAModal render, so each useEditLock 5-second
  // poll on TicketDetail (the parent) re-rendered JSAModal, gave a new
  // onAllSigned reference, invalidated fetchSigners, re-fired the useEffect,
  // re-fetched required-signers, set state — and the section visibly
  // flickered every ~5s. Stabilizing the closure with useCallback breaks
  // that chain. Deps: only the values the closure actually reads + the
  // setters (which are stable). onComplete is a parent-provided callback;
  // including it in deps would re-introduce the issue if the parent
  // doesn't memoize, so we read it via a ref.
  // v28.107 — ref-write moved from render body to useEffect. The previous
  // synchronous write was flagged by eslint-plugin-react-hooks/refs (v7.1.1
  // experimental rule) — and rightly so: writing to refs during render is
  // a side effect that breaks React Compiler's purity analysis. The
  // semantics are unchanged because the only consumer (handleAllSigned) is
  // invoked AFTER all effects have run, so it always sees the latest ref.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  const handleAllSigned = useCallback(async () => {
    if (!existingJSA?.id) return;
    if (existingJSA?.completed_at) return;
    if (completing) return;
    setCompleting(true);
    setCompleteError("");
    try {
      const r = await fetch(`${API_URL}/jsas/${existingJSA.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        if (j?.unsigned?.length > 0) {
          const names = j.unsigned.map((u) => u.name).join(", ");
          setCompleteError(`Cannot complete — these crew members have not signed yet: ${names}`);
        } else {
          setCompleteError(j?.error || `Could not auto-complete the JSA (${r.status})`);
        }
        return;
      }
      // v28.52 — origRef refresh on auto-complete dropped (was in v28.51).
      // It read all the form fields, which would have forced including
      // every form-field state in the useCallback deps — defeating the
      // stable-reference goal. handleClose's dirty-check + upsert path
      // covers this case anyway: any form edits made before auto-complete
      // get persisted on close via the v28.51 implicit upsert.
      if (onCompleteRef.current) onCompleteRef.current();
    } catch {
      setCompleteError("Connection error while auto-completing");
    } finally {
      setCompleting(false);
    }
  }, [existingJSA?.id, existingJSA?.completed_at, completing]);

  const handleClose = async () => {
    // v28.51 — three close paths:
    //   1. JSA exists + dirty → silent upsert + close (the lazy-create
    //      already established a real row; subsequent edits should
    //      persist without nagging the user — they have no SAVE button
    //      to click anymore).
    //   2. No JSA + dirty → warn the user before discarding their typed
    //      input. They have two real options: cancel and click ENABLE
    //      CREW SIGNING to persist, or accept the discard.
    //      Preserves the v28.41 invariant: no silent draft writes from
    //      a modal the user opened-and-closed without explicit intent.
    //   3. Clean (no changes since open) → just close.
    if (existingJSA?.id && isDirty()) {
      try {
        await onSave(buildJsaPayload());
      } catch {
        /* swallow — don't block close on save failure */
      }
      onClose();
      return;
    }
    if (!existingJSA?.id && isDirty()) {
      setShowUnsaved(true);
      return;
    }
    onClose();
  };
  // Keep ref fresh so mobile popstate always calls the latest closure.
  // v28.107 — ref-write moved from render body to useEffect (no deps array
  // because handleClose is a fresh closure every render; relying on
  // identity-change would re-fire trivially, so we just sync on every
  // render). Same semantics as the prior synchronous-in-render write
  // from the popstate listener's perspective — it reads .current after
  // its own commit phase, so timing is identical.
  useEffect(() => {
    handleCloseRef.current = handleClose;
  });

  return (
    <div
      style={
        isMobile
          ? { position: "fixed", inset: 0, background: C.cardBg, zIndex: 100, overflowY: "auto", WebkitOverflowScrolling: "touch" }
          : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isMobile ? undefined : handleClose}
    >
      <div
        style={
          isMobile
            ? { background: C.cardBg, borderTop: `4px solid ${C.text}`, minHeight: "100%" }
            : {
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderTop: `4px solid ${C.text}`,
                borderRadius: 8,
                padding: 0,
                width: 900,
                maxWidth: "95vw",
                maxHeight: "90vh",
                overflowY: "auto",
              }
        }
        onClick={isMobile ? undefined : (e) => e.stopPropagation()}
      >
        {/* Header — extracted to JSAModalHeader (v28.154) */}
        <JSAModalHeader
          ticketNum={ticketNum}
          customer={job.customer}
          ticket={ticket}
          emergencyContacts={emergencyContacts}
          currentUser={currentUser}
          onEditEmergency={() => setShowEmergencyEdit(true)}
        />

        <div style={{ padding: "16px 24px" }}>
          {/* Top fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>DATE</label>
              <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>TIME</label>
              <TimePicker value={time} onChange={setTime} startHour={6} startPeriod="AM" />
            </div>
            <div>
              <label style={labelStyle}>OPERATOR</label>
              <input style={inputStyle} value={operator} onChange={(e) => setOperator(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>WELLS</label>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{wellName}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>DESIGNATED DRIVER</label>
              {ticketCrewForDD.length > 0 ? (
                <select style={inputStyle} value={designatedDriver} onChange={(e) => setDesignatedDriver(e.target.value)}>
                  <option value="">— pick driver —</option>
                  {ticketCrewForDD.map((c) => (
                    <option key={c.user_id} value={c.user_name}>
                      {c.user_name}
                      {c.is_lead ? " (Lead)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  style={inputStyle}
                  value={designatedDriver}
                  onChange={(e) => setDesignatedDriver(e.target.value)}
                  placeholder="Add ticket crew first to populate dropdown"
                />
              )}
            </div>
            {/* Location pin — extracted to JSALocationPin (v28.157) */}
            <JSALocationPin lat={lat} setLat={setLat} lng={lng} setLng={setLng} />
          </div>

          {/* FTI Crew Biometric Signatures.
              v28.41 — gate on saved JSA; killed v28.10's auto-create-on-mount
                       because it lied about JSA completion in the badge.
              v28.51 — removed the SAVE JSA + MARK COMPLETE buttons at the
                       footer of the modal. Lazy-create now happens via the
                       inline ENABLE CREW SIGNING button right here, where
                       the user is trying to act. Auto-complete on the last
                       signature replaces the manual MARK COMPLETE step. */}
          {existingJSA?.id ? (
            <JSACrewSigners jsaId={existingJSA.id} onAllSigned={handleAllSigned} />
          ) : (
            <div
              style={{
                marginBottom: 14,
                padding: "12px 14px",
                background: "#e8f0fb",
                border: `1px solid ${C.blue}33`,
                borderRadius: 6,
                fontSize: 12,
                color: C.blue,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 auto", minWidth: 220 }}>
                <strong>Crew biometric signing</strong> activates when you enable it. The JSA finalizes automatically when the last required crew member signs —
                no separate MARK COMPLETE step.
              </div>
              <Btn variant="blue" disabled={enabling} onClick={handleEnableCrewSigning}>
                {enabling ? "ENABLING…" : "ENABLE CREW SIGNING"}
              </Btn>
            </div>
          )}

          {/* External / Non-FTI Crew Signatures (typed name) — for
              subcontractors and customer reps whose identity FTI cannot
              cryptographically verify. Records are kept for the legal
              file but flagged as external_unverified in the audit log. */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>EXTERNAL / NON-FTI SIGNATURES (subcontractors, customer reps — typed name only)</label>
            {signatures.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={s}
                  onChange={(e) => {
                    const ns = [...signatures];
                    ns[i] = e.target.value;
                    setSignatures(ns);
                  }}
                  placeholder={`External signer ${i + 1} — typed name`}
                />
                {signatures.length > 1 && (
                  <button
                    onClick={() => setSignatures((prev) => prev.filter((_, j) => j !== i))}
                    style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <Btn small variant="ghost" onClick={() => setSignatures((prev) => [...prev, ""])}>
              + ADD EXTERNAL SIGNATURE
            </Btn>
          </div>

          {/* Presenter Review */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PRESENTER REVIEW</label>
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontSize: 11 }}
              value={presenterReview}
              onChange={(e) => setPresenterReview(e.target.value)}
            />
          </div>

          {/* PPE & Weather — extracted to JSAPpeWeather (v28.156) */}
          <JSAPpeWeather
            ppe={ppe}
            setPpe={setPpe}
            weather={weather}
            weatherData={weatherData}
            weatherAutoTags={weatherAutoTags}
            toggleWeather={toggleWeather}
          />

          {/* Job steps table — extracted to JSAJobSteps (v28.155) */}
          <JSAJobSteps additionalSteps={additionalSteps} setAdditionalSteps={setAdditionalSteps} />
        </div>

        {/* Footer — incomplete-fields HINT (v28.07.2):
            Save is no longer gated on missing fields. Reggie's call: JSA
            should save freely as a draft, and surface what's still needed
            for COMPLETION (not for saving). External signatures are
            optional (most JSAs have none). The hint banner shows what's
            outstanding for the JSA to be considered "complete." */}
        {(() => {
          const missing = [];
          if (!date) missing.push("Date");
          if (!String(designatedDriver || "").trim()) missing.push("Designated Driver");
          if (!lat || !lng) missing.push("Location Pin");
          // Note: external signatures are NOT required (per Reggie's spec —
          // most JSAs don't have non-FTI signers). Biometric crew sigs are
          // tracked separately via the FTI CREW BIOMETRIC SIGNATURES section.
          return missing.length > 0 ? (
            <div
              style={{
                margin: "0 24px",
                padding: "10px 14px",
                background: "#fdf5d8",
                border: `1px solid #8a650044`,
                borderRadius: 6,
                fontSize: 12,
                color: "#8a6500",
              }}
            >
              <strong>Incomplete:</strong> {missing.join(" · ")} — JSA can still be saved as a draft.
            </div>
          ) : null;
        })()}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* v28.51 — SAVE JSA + MARK COMPLETE buttons removed.
              SAVE JSA was replaced by:
                · "ENABLE CREW SIGNING" inline next to the crew section
                  (lazy-create — see handleEnableCrewSigning)
                · Implicit upsert on close if existingJSA already exists
                  and the form has unsaved edits (handleClose).
              MARK COMPLETE was replaced by auto-complete: when the last
              required crew member signs, JSACrewSigners.onAllSigned fires
              handleAllSigned which POSTs /jsas/:id/complete idempotently.
              Net: one button (CLOSE) instead of three. The cumbersome
              scroll-to-bottom problem and the SAVE-vs-COMPLETE confusion
              both go away. */}
          <Btn onClick={handleClose} variant="ghost">
            CLOSE
          </Btn>
          {existingJSA?.completed_at && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ JSA Complete</span>}
          {completing && <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>⌛ Auto-completing…</span>}
          {lastSavedAt && !existingJSA?.completed_at && (
            <span style={{ fontSize: 11, color: C.green, fontWeight: 600, marginLeft: 6 }}>
              ✓ Saved {lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          {completeError && <div style={{ flexBasis: "100%", marginTop: 8, color: C.red, fontSize: 12, fontWeight: 700 }}>{completeError}</div>}
        </div>
      </div>
      {showEmergencyEdit && <EmergencyContactsModal onClose={() => setShowEmergencyEdit(false)} />}
      {showUnsaved && (
        <UnsavedChangesModal
          message="This JSA has unsaved changes. Are you sure you want to close?"
          onClose={() => setShowUnsaved(false)}
          onDiscard={() => {
            setShowUnsaved(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}

export default JSAModal;
