import { useState, useEffect, useMemo, useRef } from "react";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import { useApp } from "./AppContext.jsx";
import EmergencyContactsModal from "./EmergencyContactsModal.jsx";
import JSACrewSigners from "./JSACrewSigners.jsx";

function JSAModal({ job, ticket, onClose, onSave, onComplete, existingJSA }) {
  const { settings, currentUser } = useApp();
  const [showEmergencyEdit, setShowEmergencyEdit] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [isMobile] = useState(() => window.innerWidth <= 900);

  // Ref to latest handleClose — lets mobile popstate listener always see current dirty state
  const handleCloseRef = useRef();

  useEffect(() => {
    if (!isMobile) return;
    window.history.pushState({ jsaOpen: true }, "");
    const handlePop = () => { handleCloseRef.current?.(); };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile]);
  const emergencyContacts = useMemo(() => {
    try { const c = JSON.parse(settings?.emergency_contacts || "[]"); return Array.isArray(c) ? c : []; }
    catch { return []; }
  }, [settings]);
  const jsa = existingJSA;
  const ticketNum = ticket ? `${job.id}${ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}` : job.id;
  const wellsList = ticket?.assignedWells?.length > 0
    ? ticket.assignedWells
    : (job.wells || []).map(w => typeof w === "string" ? w : w.well_name || w);
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
      .then(r => r.ok ? r.json() : [])
      .then(rows => setTicketCrewForDD(Array.isArray(rows) ? rows : []))
      .catch(() => setTicketCrewForDD([]));
  }, [ticket?.id]);

  // v28.07.2 — Save state for non-blocking save flow. Modal stays open
  // after save (so the FTI CREW BIOMETRIC SIGNATURES section becomes
  // immediately usable on a fresh JSA). lastSavedAt powers the "Saved
  // HH:MM" indicator next to the Save button.
  const [saving, setSaving] = useState(false);
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
  const [mapLink, setMapLink] = useState(() => {
    const la = jsa?.lat || jsa?.latitude || ticket?.pinLat || ticket?.pin_lat || job?.pinLat || job?.pin_lat;
    const ln = jsa?.lng || jsa?.longitude || ticket?.pinLng || ticket?.pin_lng || job?.pinLng || job?.pin_lng;
    return (la && ln) ? `${la}, ${ln}` : "";
  });
  const [mapResolving, setMapResolving] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState([]);

  // Auto-fetch nearest hospitals when coordinates are available
  useEffect(() => {
    if (!lat || !lng) { setNearbyHospitals([]); return; }
    fetch(`${API_URL}/safety/nearest-hospital?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : { hospitals: [] })
      .then(d => setNearbyHospitals(d.hospitals || []))
      .catch(() => setNearbyHospitals([]));
  }, [lat, lng]);

  const [weather, setWeather] = useState(jsa?.weather || []);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherAutoTags, setWeatherAutoTags] = useState([]);

  // Auto-fetch weather conditions when coordinates are available (new JSAs only)
  useEffect(() => {
    if (!lat || !lng || jsa?.weather?.length > 0) return; // don't overwrite existing JSA weather
    fetch(`${API_URL}/safety/weather?lat=${lat}&lng=${lng}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
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
  const [presenterReview, setPresenterReview] = useState(jsa?.presenterReview ||
    "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!"
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

  const weatherOpts = ["clear", "cloudy", "calm", "rain", "mud", "hot", "windy", "freezing", "ice", "snow"];

  const PRE_FILLED_STEPS = [
    { step: "Driving to/from or in and around location", hazard: "Driving too fast. Backing without a spotter. Being unaware of surroundings. Using a cell phone while operating a vehicle.", procedure: "Communicate with those around you using signals/lights/horn. Do not use cell phone while driving. Eliminate distractions." },
    { step: "SDS", hazard: "Chemical Exposure", procedure: "SDS electronically or physically available on site." },
    { step: "Worksite & PPE inspection of all equipment", hazard: "Slips, trips, falls, pinch points, enclosed areas, poor lighting, H2S. Defective, absent, or dirty PPE.", procedure: "Repair, replace or clean necessary items. Remove debris. Identify PPE needed & safe handling procedures." },
    { step: "Receive authorization to begin work", hazard: "Onsite Operations Supervisor not aware of work being performed or permits not completed.", procedure: "Receive authorization from the person in charge. Complete all applicable Permits to Work." },
    { step: "Conduct Safety Meeting with all onsite workers", hazard: "Jobsite workers not knowing what activity is about to take place. Hazardous conditions not observed by personnel.", procedure: "Review with all personnel & sign off on safety meeting sheet. Allow others to voice concerns, comments, questions." },
    { step: "Begin job slowly. Watch for personnel not paying attention.", hazard: "Quick movements can result in poor awareness of surrounding personnel and can easily cause unintentional reactions.", procedure: "Work slow and steady. If situations require quick movements, alert everyone before moving." },
  ];

  const toggleWeather = (w) => setWeather(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);

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
    presenterReview: jsa?.presenterReview || "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!",
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
    jobId: job.id, ticketId: ticket?.id || null, date, time, operator, wellName, designatedDriver,
    lat, lng, weather, ppe, signatures: (signatures || []).filter(Boolean),
    presenterReview, additionalSteps: additionalSteps.filter(s => s.step || s.hazard || s.procedure),
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
        date, operator, time, designatedDriver,
        lat: String(lat || ""), lng: String(lng || ""),
        weather: [...weather], ppe: { ...ppe },
        signatures: [...signatures], presenterReview,
        additionalSteps: additionalSteps.map(s => ({ ...s })),
      };
    } finally {
      setEnabling(false);
    }
  };

  // v28.51 — auto-complete when JSACrewSigners reports all required signed.
  // Replaces the manual MARK COMPLETE button. The fetch is idempotent on
  // the backend (returns already_complete: true if completed_at is already
  // set), so re-firing on subsequent re-renders / re-fetches is safe but
  // the `completing` flag still guards against piling up requests.
  const handleAllSigned = async () => {
    if (!existingJSA?.id) return;
    if (existingJSA?.completed_at) return;
    if (completing) return;
    setCompleting(true);
    setCompleteError("");
    try {
      const r = await fetch(`${API_URL}/jsas/${existingJSA.id}/complete`, {
        method: "POST", headers: { "Content-Type": "application/json" },
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) {
        if (j?.unsigned?.length > 0) {
          const names = j.unsigned.map(u => u.name).join(', ');
          setCompleteError(`Cannot complete — these crew members have not signed yet: ${names}`);
        } else {
          setCompleteError(j?.error || `Could not auto-complete the JSA (${r.status})`);
        }
        return;
      }
      // Mirror the v28.42 origRef refresh on MARK COMPLETE success — keeps
      // the dirty baseline aligned so handleClose doesn't fire a false
      // "Unsaved Changes" warning after auto-completion.
      origRef.current = {
        date, operator, time, designatedDriver,
        lat: String(lat || ""), lng: String(lng || ""),
        weather: [...weather], ppe: { ...ppe },
        signatures: [...signatures], presenterReview,
        additionalSteps: additionalSteps.map(s => ({ ...s })),
      };
      if (onComplete) onComplete();
      // Don't auto-close — let the user see the "ALL CREW SIGNED" green
      // banner from JSACrewSigners + the JSA-completed lock-down. They
      // close manually when ready.
    } catch {
      setCompleteError("Connection error while auto-completing");
    } finally {
      setCompleting(false);
    }
  };

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
      } catch { /* swallow — don't block close on save failure */ }
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
  handleCloseRef.current = handleClose;

  return (
    <div style={isMobile
      ? { position: "fixed", inset: 0, background: C.cardBg, zIndex: 100, overflowY: "auto", WebkitOverflowScrolling: "touch" }
      : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
    } onClick={isMobile ? undefined : handleClose}>
      <div style={isMobile
        ? { background: C.cardBg, borderTop: `4px solid ${C.text}`, minHeight: "100%" }
        : { background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.text}`, borderRadius: 8, padding: 0, width: 900, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }
      } onClick={isMobile ? undefined : e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em" }}>FLO-TEST, INC. — JSA</div>
            <div style={{ fontSize: 11, color: C.muted }}>#{ticketNum} — Tailgate Safety Meeting · {job.customer}{ticket ? ` · ${ticket.type}` : ""}</div>
          </div>
          <div style={{ fontSize: 11, textAlign: "right" }}>
            {/* Emergency contacts deliberately bold red for immediate-recognition
                visibility — these are safety-critical phone numbers. Per Art X:
                dummy-proof in field conditions (2 AM windstorm). */}
            {emergencyContacts.length > 0
              ? emergencyContacts.map((c, i) => (
                  <div key={i} style={{ fontWeight: 800, color: C.red }}>{c.label}: {c.phone}</div>
                ))
              : <div style={{ fontWeight: 800, color: C.red }}>AIRLIFE: 800-627-2376</div>
            }
            {currentUser?.role === "owner" && (
              <div onClick={(e) => { e.stopPropagation(); setShowEmergencyEdit(true); }}
                style={{ fontSize: 10, color: C.blue, cursor: "pointer", marginTop: 4, fontWeight: 600 }}>
                Edit Emergency Info
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 24px" }}>
          {/* Top fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DATE</label><input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={labelStyle}>TIME</label><TimePicker value={time} onChange={setTime} startHour={6} startPeriod="AM" /></div>
            <div><label style={labelStyle}>OPERATOR</label><input style={inputStyle} value={operator} onChange={e => setOperator(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>WELLS</label>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{wellName}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>DESIGNATED DRIVER</label>
              {ticketCrewForDD.length > 0 ? (
                <select
                  style={inputStyle}
                  value={designatedDriver}
                  onChange={e => setDesignatedDriver(e.target.value)}
                >
                  <option value="">— pick driver —</option>
                  {ticketCrewForDD.map(c => (
                    <option key={c.user_id} value={c.user_name}>
                      {c.user_name}{c.is_lead ? " (Lead)" : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  style={inputStyle}
                  value={designatedDriver}
                  onChange={e => setDesignatedDriver(e.target.value)}
                  placeholder="Add ticket crew first to populate dropdown"
                />
              )}
            </div>
            <div>
              <label style={labelStyle}>LOCATION PIN (Paste Google Maps link or coordinates)</label>
              <input style={inputStyle} value={mapLink} onChange={e => {
                const val = e.target.value;
                setMapLink(val);
                // Try local parsing first
                let matched = false;
                const patterns = [
                  /[?&@]q?=?([-\d.]+)[,\s]+([-\d.]+)/,
                  /@([-\d.]+),([-\d.]+)/,
                  /\/([-]?\d{1,3}\.\d+),([-]?\d{1,3}\.\d+)/,
                ];
                for (const p of patterns) {
                  const m = val.match(p);
                  if (m) { setLat(m[1]); setLng(m[2]); matched = true; break; }
                }
                const rawMatch = val.trim().match(/^([-]?\d{1,3}\.\d+)[,\s]+([-]?\d{1,3}\.\d+)$/);
                if (!matched && rawMatch) { setLat(rawMatch[1]); setLng(rawMatch[2]); matched = true; }
                // If it's a URL but no coords found, call backend resolver
                if (!matched && (val.includes("maps.app.goo.gl") || val.includes("goo.gl/maps") || val.includes("google.com/maps"))) {
                  setMapResolving(true);
                  fetch(`${API_URL}/jobs/resolve-map-pin`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: val }),
                  })
                    .then(r => r.json())
                    .then(data => {
                      if (data.lat && data.lng) { setLat(data.lat); setLng(data.lng); }
                      setMapResolving(false);
                    })
                    .catch(() => setMapResolving(false));
                }
              }} placeholder="Paste Google Maps link or lat, lon" />
              {mapResolving && <div style={{ fontSize: 11, color: C.blue, marginTop: 4, fontWeight: 600 }}>Resolving location...</div>}
              {!mapResolving && lat && lng && (
                <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓ Lat: {lat} &nbsp; Lon: {lng}</span>
                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.blue, fontWeight: 600, textDecoration: "none" }}>
                    View on Google Maps ↗
                  </a>
                </div>
              )}
              {nearbyHospitals.length > 0 && (
                <div style={{ marginTop: 8, background: "#fdf0f0", border: `1px solid ${C.red}22`, borderRadius: 4, padding: "6px 10px" }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: C.red, letterSpacing: "0.08em", marginBottom: 4 }}>NEAREST HOSPITALS</div>
                  {nearbyHospitals.map((h, i) => (
                    <div key={i} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", padding: "2px 0", borderBottom: i < nearbyHospitals.length - 1 ? `1px solid ${C.red}10` : "none" }}>
                      <span style={{ fontWeight: 700, color: C.text }}>{h.name}</span>
                      {h.phone && <span style={{ color: C.muted }}>{h.phone}</span>}
                      {h.miles != null && <span style={{ color: C.red, fontWeight: 700 }}>{h.miles} mi</span>}
                      <a href={`https://www.google.com/maps/dir/${lat},${lng}/${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer"
                        style={{ color: C.blue, fontWeight: 600, textDecoration: "none", fontSize: 10 }}>Directions ↗</a>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <div style={{ marginBottom: 14, padding: "12px 14px", background: "#e8f0fb", border: `1px solid ${C.blue}33`, borderRadius: 6, fontSize: 12, color: C.blue, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 auto", minWidth: 220 }}>
                <strong>Crew biometric signing</strong> activates when you enable it. The JSA finalizes automatically when the last required crew member signs — no separate MARK COMPLETE step.
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
                <input style={{ ...inputStyle, flex: 1 }} value={s} onChange={e => { const ns = [...signatures]; ns[i] = e.target.value; setSignatures(ns); }} placeholder={`External signer ${i + 1} — typed name`} />
                {signatures.length > 1 && <button onClick={() => setSignatures(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>}
              </div>
            ))}
            <Btn small variant="ghost" onClick={() => setSignatures(prev => [...prev, ""])}>+ ADD EXTERNAL SIGNATURE</Btn>
          </div>

          {/* Presenter Review */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PRESENTER REVIEW</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontSize: 11 }} value={presenterReview} onChange={e => setPresenterReview(e.target.value)} />
          </div>

          {/* PPE & Weather */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>PPE CHECK</label>
              {[["frClothing", "FR Clothing, H2S Monitor, Hard Hat, Safety Glasses, Steel Toed Footwear"], ["toolsTrained", "Trained in use of tools / equipment"], ["confinedSpace", "Confined space permit completed?"]].map(([k, lbl]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }} onClick={() => setPpe(p => ({ ...p, [k]: !p[k] }))}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${ppe[k] ? C.green : C.muted}`, background: ppe[k] ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ppe[k] && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 11, color: C.text }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>WEATHER CONDITIONS</label>
              {weatherData && (
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
                  {weatherData.temperature != null && <span style={{ fontWeight: 700, color: C.text }}>{Math.round(weatherData.temperature)}°F</span>}
                  {weatherData.wind_speed > 0 && <span style={{ marginLeft: 10 }}>Wind: {Math.round(weatherData.wind_speed)} mph</span>}
                  {weatherData.wind_gusts > 0 && <span style={{ marginLeft: 6 }}>Gusts: {Math.round(weatherData.wind_gusts)} mph</span>}
                  <span style={{ marginLeft: 10, fontSize: 9, color: C.blue, fontWeight: 700 }}>auto-detected from pin — tap to override</span>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {weatherOpts.map(w => {
                  const isSelected = weather.includes(w);
                  const isAuto = isSelected && weatherAutoTags.includes(w);
                  return (
                  <button key={w} onClick={() => toggleWeather(w)} style={{
                    background: isSelected ? C.blue : "transparent",
                    color: isSelected ? C.white : C.muted,
                    border: `1px solid ${isSelected ? C.blue : C.border}`,
                    borderStyle: isAuto ? "dashed" : "solid",
                    borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>{w}</button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Pre-filled Job Steps */}
          <label style={labelStyle}>BASIC JOB STEPS / POTENTIAL HAZARDS / SAFE PROCEDURES</label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", background: C.darkBlue, padding: "8px 10px" }}>
              {["#", "Basic Job Step", "Potential Hazards", "Recommended Safe Procedures"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>
            {PRE_FILLED_STEPS.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "6px 10px", borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{i + 1}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.step}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.hazard}</div>
                <div style={{ fontSize: 10, color: C.text }}>{s.procedure}</div>
              </div>
            ))}
            {/* Additional blank steps */}
            {additionalSteps.map((s, i) => (
              <div key={`a${i}`} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "4px 10px", borderBottom: `1px solid ${C.border}22`, gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{PRE_FILLED_STEPS.length + i + 1}</div>
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.step} onChange={e => { const ns = [...additionalSteps]; ns[i].step = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.hazard} onChange={e => { const ns = [...additionalSteps]; ns[i].hazard = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.procedure} onChange={e => { const ns = [...additionalSteps]; ns[i].procedure = e.target.value; setAdditionalSteps(ns); }} />
              </div>
            ))}
          </div>
          <Btn small variant="ghost" onClick={() => setAdditionalSteps(prev => [...prev, { step: "", hazard: "", procedure: "" }])}>+ ADD STEP</Btn>
        </div>

        {/* Footer — incomplete-fields HINT (v28.07.2):
            Save is no longer gated on missing fields. Reggie's call: JSA
            should save freely as a draft, and surface what's still needed
            for COMPLETION (not for saving). External signatures are
            optional (most JSAs have none). The hint banner shows what's
            outstanding for the JSA to be considered "complete." */}
        {(() => {
          const validSigs = (signatures || []).filter(Boolean);
          const missing = [];
          if (!date) missing.push('Date');
          if (!String(designatedDriver || '').trim()) missing.push('Designated Driver');
          if (!lat || !lng) missing.push('Location Pin');
          // Note: external signatures are NOT required (per Reggie's spec —
          // most JSAs don't have non-FTI signers). Biometric crew sigs are
          // tracked separately via the FTI CREW BIOMETRIC SIGNATURES section.
          return missing.length > 0 ? (
            <div style={{ margin: "0 24px", padding: "10px 14px", background: "#fdf5d8", border: `1px solid #8a650044`, borderRadius: 6, fontSize: 12, color: "#8a6500" }}>
              <strong>Incomplete:</strong> {missing.join(' · ')} — JSA can still be saved as a draft.
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
          <Btn onClick={handleClose} variant="ghost">CLOSE</Btn>
          {existingJSA?.completed_at && (
            <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>
              ✓ JSA Complete
            </span>
          )}
          {completing && (
            <span style={{ fontSize: 11, color: C.blue, fontWeight: 600 }}>
              ⌛ Auto-completing…
            </span>
          )}
          {lastSavedAt && !existingJSA?.completed_at && (
            <span style={{ fontSize: 11, color: C.green, fontWeight: 600, marginLeft: 6 }}>
              ✓ Saved {lastSavedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          {completeError && (
            <div style={{ flexBasis: "100%", marginTop: 8, color: C.red, fontSize: 12, fontWeight: 700 }}>
              {completeError}
            </div>
          )}
        </div>
      </div>
      {showEmergencyEdit && (
        <EmergencyContactsModal onClose={() => setShowEmergencyEdit(false)} />
      )}
      {showUnsaved && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsaved(false)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This JSA has unsaved changes. Are you sure you want to close?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setShowUnsaved(false); onClose(); }}>YES, DISCARD</Btn>
              <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>KEEP EDITING</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default JSAModal;
