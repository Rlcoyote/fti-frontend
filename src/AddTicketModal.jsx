import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { today, parseYards } from "./utils.js";
import { Btn, inputStyle, labelStyle, TICKET_TYPES, TicketTypeBadge } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import LineItemEditor from "./LineItemEditor.jsx";
import JSAModal from "./JSAModal.jsx";
import TicketCrewManager from "./TicketCrewManager.jsx";
import { useApp } from "./AppContext.jsx";

function AddTicketModal({ jobId, job, onSave, onClose, jobWells = [] }) {
  const [isMobile] = useState(() => window.innerWidth <= 900);
  const [savedTicketId, setSavedTicketId] = useState(null); // set after auto-save for JSA
  const [showJSA, setShowJSA] = useState(false);
  const [existingJSA, setExistingJSA] = useState(null);

  // On mobile, push history entry so back button closes instead of navigating away
  useEffect(() => {
    if (!isMobile) return;
    window.history.pushState({ addTicketOpen: true }, "");
    const handlePop = () => { onClose(); };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile, onClose]);
  const { qbItems, settings, currentUser, showNotice, users } = useApp();
  // v28.07.5 — stage crew assignments BEFORE the ticket is saved. Local
  // state holds the planned crew; on CREATE TICKET we POST the ticket,
  // then bulk-POST the crew to /tickets/:id/crew using the new id.
  // Lets users fill in everything (ticket details + crew + JSA) in one
  // continuous flow without modal-hopping.
  const [stagedCrew, setStagedCrew] = useState([]); // [{ user_id, user_name, user_role, is_lead }]
  const [stagedAddPick, setStagedAddPick] = useState("");
  const yardsList = useMemo(() => parseYards(settings), [settings]);
  const [yardLocationIndex, setYardLocationIndex] = useState(1);
  const [type, setType] = useState(null);
  const [assignedWells, setAssignedWells] = useState([]);
  const [wellsConfirmed, setWellsConfirmed] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => (job?.dateStarted ? String(job.dateStarted).slice(0, 10) : today()));
  const [startDate, setStartDate] = useState(today());
  const [cycleDays, setCycleDays] = useState(28);
  const [isRecurring, setIsRecurring] = useState(true);
  const [showUnsaved, setShowUnsaved] = useState(false);
  // Time & mileage
  const [lvYard, setLvYard] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [dueOnLoc, setDueOnLoc] = useState("");
  const [jobStartTime, setJobStartTime] = useState("");
  const [jobEndTime, setJobEndTime] = useState("");
  const [retYard, setRetYard] = useState("");
  const [timeZone, setTimeZone] = useState("");
  const [mileageBegin, setMileageBegin] = useState("");
  const [mileageEnd, setMileageEnd] = useState("");
  // Google Pin
  const jobGooglePin = job?.googlePin || job?.google_pin || "";
  const [ticketPin, setTicketPin] = useState(jobGooglePin);
  // Site Manager
  const [smFirst, setSmFirst] = useState("");
  const [smLast, setSmLast] = useState("");
  const [smPhone, setSmPhone] = useState("");
  const [smEmail, setSmEmail] = useState("");
  const [ticketPinLat, setTicketPinLat] = useState(job?.pinLat || job?.pin_lat || null);
  const [ticketPinLng, setTicketPinLng] = useState(job?.pinLng || job?.pin_lng || null);
  const [ticketPinResolving, setTicketPinResolving] = useState(false);
  const [ticketPinError, setTicketPinError] = useState("");
  const [driveInfo, setDriveInfo] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const pinMismatch = jobGooglePin && ticketPin && ticketPin.trim() !== jobGooglePin.trim();

  // Auto-fetch drive distance when coords become available or yard changes
  useEffect(() => {
    const lat = ticketPinLat;
    const lng = ticketPinLng;
    if (!lat || !lng) { setDriveInfo(null); return; }
    setDriveLoading(true);
    fetch(`${API_URL}/jobs/drive-distance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destLat: lat, destLng: lng, yard_index: yardLocationIndex }),
    })
      .then(r => r.ok ? r.json() : { error: "Could not calculate" })
      .then(d => setDriveInfo(d))
      .catch(() => setDriveInfo({ error: "Network error" }))
      .finally(() => setDriveLoading(false));
  }, [ticketPinLat, ticketPinLng, yardLocationIndex]);

  const endDate = useMemo(() => {
    if (!startDate || !cycleDays) return "";
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + (cycleDays - 1));
    return d.toLocaleDateString("en-CA");
  }, [startDate, cycleDays]);

  const isDirty = type || lineItems.length > 0 || notes;
  const handleClose = () => { if (isDirty) { setShowUnsaved(true); } else { onClose(); } };

  // v28.07.5 — Bulk-POST staged crew to /tickets/:id/crew after the ticket
  // exists. Called from autoSaveForJSA (when user opens JSA before explicit
  // save) AND from JobTicketsTab.handleAdd (after explicit CREATE TICKET).
  // Lead-promotion is atomic on the server side — POST with is_lead=true
  // demotes any existing lead in the same transaction.
  const commitStagedCrew = async (ticketId) => {
    if (!ticketId || stagedCrew.length === 0) return;
    for (const c of stagedCrew) {
      try {
        await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: c.user_id, is_lead: !!c.is_lead }),
        });
      } catch (err) {
        console.warn("Staged crew member failed to commit:", c.user_name, err);
      }
    }
    setStagedCrew([]); // clear local; the live TicketCrewManager will fetch the just-inserted rows
  };

  // Auto-save ticket silently (for JSA creation before explicit save)
  const autoSaveForJSA = async () => {
    if (savedTicketId) { setShowJSA(true); return; } // already saved
    if (!type) return;
    const isRental = type === "Rental";
    const jobGooglePin = job?.googlePin || job?.google_pin || null;
    const jobPinLat = job?.pinLat || job?.pin_lat || null;
    const jobPinLng = job?.pinLng || job?.pin_lng || null;
    const payload = {
      job_id: jobId, type, status: "incomplete",
      date: isRental ? startDate : date,
      notes, created_by: currentUser?.id || null,
      assigned_wells: assignedWells ?? jobWells,
      site_mgr_first: smFirst || null, site_mgr_last: smLast || null,
      site_mgr_phone: smPhone || null, site_mgr_email: smEmail || null,
      yard_location_index: yardLocationIndex,
      google_pin: ticketPin.trim() || jobGooglePin,
      pin_lat: ticketPinLat || jobPinLat, pin_lng: ticketPinLng || jobPinLng,
      lineItems: (lineItems || []).map(li => ({
        qb_code: li.qbCode, description: li.desc, rate: li.rate, qty: li.qty, unit_measure: li.um, days: li.days || 1,
      })),
      ...(isRental ? { start_date: startDate, end_date: endDate, cycle_days: parseInt(cycleDays) || 28, is_recurring: isRecurring } : {}),
      ...(!isRental ? { lv_yard: lvYard || null, arrival_time: arrivalTime || null, due_on_loc: dueOnLoc || null, job_start_time: jobStartTime || null, job_end_time: jobEndTime || null, ret_yard: retYard || null, time_zone: timeZone || null, mileage_begin: mileageBegin !== "" ? parseFloat(mileageBegin) : null, mileage_end: mileageEnd !== "" ? parseFloat(mileageEnd) : null } : {}),
    };
    try {
      const r = await fetch(`${API_URL}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setSavedTicketId(saved.id);
        // v28.07.5 — commit any staged crew to the new ticket so the JSA
        // can pull them in via /required-signers. Sequential awaits to
        // preserve add-order; fast on small crews (typical 1-6 members).
        await commitStagedCrew(saved.id);
        setShowJSA(true);
      } else { showNotice("Save Failed", "Could not save the ticket. Please try again.", "error"); }
    } catch { showNotice("Network Error", "A network error occurred while saving the ticket.", "error"); }
  };

  const handleSelectType = (t) => {
    setType(t);
    setAssignedWells([...jobWells]);
    if (jobWells.length <= 1) setWellsConfirmed(true);
    else setWellsConfirmed(false);
    if (t === "Rig Down") {
      fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const ru = data.filter(tk => tk.type === "Rig Up" && !tk.voided_at)
            .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
          if (ru) {
            const wells = ru.assigned_wells || [];
            if (wells.length) setAssignedWells([...wells]);
            if (ru.notes) setNotes(ru.notes);
          }
        })
        .catch(() => {});
    }
    if (t === "Rental") { setStartDate(today()); setCycleDays(28); setIsRecurring(true); }
  };

  const toggleWell = (well) => {
    setAssignedWells(prev => prev.includes(well) ? prev.filter(w => w !== well) : [...prev, well]);
  };
  const selectAllWells = () => setAssignedWells([...jobWells]);

  const handleSave = () => {
    if (!type) return;
    const isRental = type === "Rental";
    const jobGooglePin = job?.googlePin || job?.google_pin || null;
    const jobPinLat = job?.pinLat || job?.pin_lat || null;
    const jobPinLng = job?.pinLng || job?.pin_lng || null;
    const ticketData = {
      jobId, type, status: "incomplete", date: isRental ? startDate : date,
      signedBy: null, signedAt: null,
      lineItems, notes,
      assignedWells: assignedWells ?? jobWells,
      siteMgrFirst: smFirst, siteMgrLast: smLast, siteMgrPhone: smPhone, siteMgrEmail: smEmail,
      yardLocationIndex,
      hasJSA: !!existingJSA,
      ...(type === "Rig Down" ? { missingPieces: null } : {}),
      ...(isRental ? { startDate, endDate, cycleDays: parseInt(cycleDays) || 28, isRecurring, googlePin: ticketPin.trim() || jobGooglePin, pinLat: ticketPinLat || jobPinLat, pinLng: ticketPinLng || jobPinLng } : {}),
      ...(!isRental ? {
        lvYard, arrivalTime, dueOnLoc, jobStartTime, jobEndTime, retYard, timeZone,
        mileageBegin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
        mileageEnd: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
        googlePin: ticketPin.trim() || jobGooglePin,
        pinLat: ticketPinLat || jobPinLat,
        pinLng: ticketPinLng || jobPinLng,
      } : {}),
    };
    // If ticket was already auto-saved (for JSA), pass the ID so parent knows to update, not create
    if (savedTicketId) ticketData.id = savedTicketId;
    // v28.07.5 — pass staged crew along so the parent (JobTicketsTab.handleAdd)
    // can bulk-POST them to /tickets/:id/crew after the ticket POST succeeds.
    // If savedTicketId is already set (autoSaveForJSA path), commitStagedCrew
    // already ran and stagedCrew is empty — passing the empty array is a no-op.
    if (stagedCrew.length > 0) ticketData.stagedCrew = stagedCrew;
    onSave(ticketData);
  };

  const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 };
  const lblSm = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };

  return (
    <div style={isMobile
      ? { position: "fixed", inset: 0, background: (type && TICKET_TYPES[type]?.bg) || C.cardBg, zIndex: 100, overflowY: "auto", WebkitOverflowScrolling: "touch" }
      : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
    } onClick={isMobile ? undefined : handleClose}>
      <div style={isMobile
        ? { background: (type && TICKET_TYPES[type]?.bg) || C.cardBg, borderTop: `3px solid ${(type && TICKET_TYPES[type]?.color) || C.red}`, minHeight: "100%", padding: "0 0 40px" }
        : { background: (type && TICKET_TYPES[type]?.bg) || C.cardBg, border: `1px solid ${C.border}`, borderTop: `3px solid ${(type && TICKET_TYPES[type]?.color) || C.red}`, borderRadius: 8, width: type ? 820 : 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }
      } onClick={isMobile ? undefined : e => e.stopPropagation()}>
        {showUnsaved && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsaved(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This ticket has not been saved. Are you sure you want to close?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={onClose}>YES, DISCARD</Btn>
                <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>KEEP EDITING</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Job info banner — always visible once type selected */}
        {type && job && (
          <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 20px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>WORK ORDER INFO</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 12 }}>
              <span><span style={{ color: C.muted }}>Customer: </span><strong>{job.customer}</strong></span>
              {job.jobState && <span><span style={{ color: C.muted }}>State: </span><strong>{job.jobState}</strong></span>}
              {job.county && <span><span style={{ color: C.muted }}>County: </span><strong>{job.county}</strong></span>}
              {job.wells?.length > 0 && <span><span style={{ color: C.muted }}>Wells: </span><strong>{job.wells.map(w => w.well_name || w).join(", ")}</strong></span>}
              {(job.contactFirst || job.contactLast) && <span><span style={{ color: C.muted }}>Point of Contact: </span><strong>{[job.contactFirst, job.contactLast].filter(Boolean).join(" ")}</strong></span>}
            </div>
          </div>
        )}

        {/* JSA button — non-Rental only, after type selected */}
        {type && type !== "Rental" && (
          <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            {existingJSA ? (
              <button type="button" onClick={() => setShowJSA(true)}
                style={{ background: "#e6f5ec", color: C.green, border: `1px solid ${C.green}44`, borderRadius: 4, padding: "5px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" }}
                onMouseEnter={e => { e.currentTarget.style.background = "#d4edda"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#e6f5ec"; }}>
                ✓ VIEW / EDIT JSA
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" onClick={autoSaveForJSA}
                  style={{ background: "#fff", color: C.red, border: `2px solid ${C.red}`, borderRadius: 4, padding: "5px 14px", fontSize: 11, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#fdecea"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}>
                  CREATE JSA
                </button>
                <span style={{ fontSize: 10, color: C.red, fontWeight: 600, fontStyle: "italic" }}>Required before signing</span>
              </div>
            )}
          </div>
        )}

        {/* JSA Modal */}
        {showJSA && savedTicketId && (
          <JSAModal
            job={job}
            ticket={{ id: savedTicketId, date: type === "Rental" ? startDate : date, type, pinLat: ticketPinLat, pinLng: ticketPinLng, googlePin: ticketPin, assignedWells }}
            existingJSA={existingJSA}
            onClose={() => setShowJSA(false)}
            onSave={async (jsaData) => {
              try {
                // v28.07.4 — mirror v28.07.2 fix in useTicketJSA: capture
                // jsaId from response so existingJSA.id is set, which is
                // what JSACrewSigners' parent gating depends on. Earlier
                // code dropped the jsaId, leaving existingJSA without an id
                // and the biometric section either invisible or rendering
                // empty.
                const r = await fetch(`${API_URL}/jsas/ticket/${savedTicketId}`, {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    job_id: jobId,
                    date: jsaData.date, time: jsaData.time, operator: jsaData.operator,
                    well_name: jsaData.wellName, designated_driver: jsaData.designatedDriver,
                    latitude: jsaData.lat, longitude: jsaData.lng, weather: jsaData.weather,
                    ppe_fr_clothing: jsaData.ppe?.frClothing || false,
                    ppe_tools_trained: jsaData.ppe?.toolsTrained || false,
                    ppe_confined_space: jsaData.ppe?.confinedSpace || false,
                    presenter_review: jsaData.presenterReview,
                    signatures: jsaData.signatures,
                    additional_steps: jsaData.additionalSteps,
                  }),
                });
                const responseData = await r.json().catch(() => null);
                const newId = responseData?.jsaId || existingJSA?.id || null;
                setExistingJSA({ ...jsaData, id: newId });
              } catch (err) { console.error("JSA save failed:", err); }
            }}
          />
        )}

        <div style={{ padding: 24 }}>
          {!type ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Add Ticket — Select Type</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {Object.entries(TICKET_TYPES).map(([key, cfg]) => (
                  <button key={key} onClick={() => handleSelectType(key)} style={{
                    background: C.cardBg, border: `2px solid ${cfg.color}33`,
                    borderLeft: `4px solid ${cfg.color}`, borderRadius: 6,
                    padding: "16px 18px", cursor: "pointer", textAlign: "left",
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = cfg.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = cfg.color + "33"}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.label}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                      {key === "Rig Up" && "Crew mobilization, equipment, Day 1 rental"}
                      {key === "Rig Down" && "Teardown, equipment return, DLR check"}
                      {key === "Tester" && "Flo-back testing, hourly logging"}
                      {key === "Pumper" && "Field specialist, daily operations"}
                      {key === "Rental" && "Ongoing equipment rental (Day 2+)"}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                <Btn onClick={handleClose} variant="ghost">CANCEL</Btn>
              </div>
            </>
          ) : type && !wellsConfirmed && jobWells.length > 1 ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <TicketTypeBadge type={type} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>Assign Wells — New {type} Ticket</span>
                <button onClick={() => { setType(null); setWellsConfirmed(false); }} style={{
                  background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer", marginLeft: "auto",
                }}>← CHANGE TYPE</button>
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Select which wells apply to this ticket.</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>WELLS ON THIS WORK ORDER</label>
                  <button type="button" onClick={selectAllWells} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "2px 10px", fontSize: 11, fontWeight: 700, color: C.text, cursor: "pointer" }}>SELECT ALL</button>
                </div>
                {jobWells.map((well, idx) => {
                  const checked = assignedWells.includes(well);
                  return (
                    <div key={idx} onClick={() => toggleWell(well)} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 6,
                      background: checked ? "#e8f0fb" : C.steel, border: `1px solid ${checked ? C.blue + "44" : C.border}`,
                      borderRadius: 5, cursor: "pointer",
                    }}>
                      <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${checked ? C.blue : C.border}`, background: checked ? C.blue : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {checked && <span style={{ color: C.white, fontSize: 12, fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: checked ? 700 : 400, color: C.text }}>{well}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => { if (assignedWells.length === 0) return; setWellsConfirmed(true); }}>
                  {assignedWells.length === 0 ? "SELECT AT LEAST ONE WELL" : `CONFIRM — ${assignedWells.length} WELL${assignedWells.length !== 1 ? "S" : ""}`}
                </Btn>
                <Btn variant="ghost" onClick={handleClose}>CANCEL</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <TicketTypeBadge type={type} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>New {type} Ticket</span>
                <button onClick={() => { setType(null); setWellsConfirmed(false); }} style={{
                  background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4,
                  padding: "3px 10px", fontSize: 11, fontWeight: 700, color: C.muted, cursor: "pointer", marginLeft: "auto",
                }}>← CHANGE TYPE</button>
              </div>

              <div style={{ marginBottom: 14 }}>
                {type === "Rental" ? (
                  <>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div><label style={labelStyle}>START DATE</label><input type="date" style={{ ...inputStyle, width: 160 }} value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                      <div><label style={labelStyle}>CYCLE (DAYS)</label><input type="number" style={{ ...inputStyle, width: 80 }} value={cycleDays} onChange={e => setCycleDays(e.target.value)} min={1} /></div>
                      <div><label style={labelStyle}>END DATE</label><input type="date" style={{ ...inputStyle, width: 160, background: "#f0f3f8" }} value={endDate} readOnly /></div>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: C.text, cursor: "pointer" }}>
                      <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} style={{ width: 16, height: 16 }} />
                      Recurring (auto-create next cycle ticket)
                    </label>
                  </>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", alignItems: "flex-end" }}>
                    <div>
                      <label style={labelStyle}>DATE</label>
                      <input type="date" style={{ ...inputStyle, width: 180 }} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>LOCATION TIME</label>
                      <TimePicker value={dueOnLoc} onChange={setDueOnLoc} startHour={6} startPeriod="AM" />
                    </div>
                    <div>
                      <label style={labelStyle}>TIME ZONE</label>
                      <div style={{ display: "flex", gap: 10, paddingTop: 6 }}>
                        {["TX", "NM"].map(tz => (
                          <span key={tz} onClick={() => setTimeZone(tz)} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 12, fontWeight: 700, color: timeZone === tz ? C.red : C.muted }}>
                            <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${timeZone === tz ? C.red : C.border}`, background: timeZone === tz ? C.red : "transparent", display: "inline-block" }} />
                            {tz}
                          </span>
                        ))}
                      </div>
                    </div>
                    {yardsList.length > 1 && (
                      <div>
                        <label style={labelStyle}>YARD</label>
                        <select
                          value={yardLocationIndex}
                          onChange={e => setYardLocationIndex(parseInt(e.target.value, 10))}
                          style={{ ...inputStyle, width: 180 }}
                        >
                          {yardsList.map((y, i) => (
                            <option key={i} value={i + 1}>{y.name || `Yard #${i + 1}`}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Site Manager */}
              <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
                  {job && (job.contactFirst || job.contactLast) && (
                    <span onClick={() => {
                      setSmFirst(job.contactFirst || "");
                      setSmLast(job.contactLast || "");
                      setSmPhone(job.pocPhone || job.poc_phone || "");
                      setSmEmail(job.pocEmail || job.poc_email || "");
                    }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer", padding: "3px 10px", border: `1px solid ${C.blue}44`, borderRadius: 4, background: "transparent" }}>
                      <span style={{ fontSize: 13 }}>📋</span> Copy Point of Contact Info
                    </span>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div><label style={labelStyle}>FIRST NAME</label><input style={inputStyle} value={smFirst} onChange={e => setSmFirst(e.target.value)} placeholder="First" /></div>
                  <div><label style={labelStyle}>LAST NAME</label><input style={inputStyle} value={smLast} onChange={e => setSmLast(e.target.value)} placeholder="Last" /></div>
                  <div><label style={labelStyle}>PHONE</label><input style={inputStyle} value={smPhone} onChange={e => setSmPhone(e.target.value)} placeholder="555-555-5555" /></div>
                  <div><label style={labelStyle}>EMAIL</label><input style={inputStyle} value={smEmail} onChange={e => setSmEmail(e.target.value)} placeholder="email@company.com" /></div>
                </div>
              </div>

              {/* Google Pin — before Time & Mileage so drive info populates first */}
              {type && (
                <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GOOGLE PIN</div>
                    {pinMismatch && (
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#8a6500", background: "#fdf5d8", border: "1px solid #e6c20044", borderRadius: 3, padding: "2px 8px", letterSpacing: "0.04em" }}>
                        ALT PIN — differs from Work Order
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11, padding: "6px 8px" }}
                      placeholder={jobGooglePin ? "Override Work Order pin or leave blank to use Work Order pin" : "Paste Google Maps link..."}
                      value={ticketPin} onChange={e => { setTicketPin(e.target.value); setTicketPinLat(null); setTicketPinLng(null); setTicketPinError(""); }} />
                    {ticketPin && (
                      <button type="button" onClick={async () => {
                        if (!ticketPin.trim()) return;
                        setTicketPinResolving(true); setTicketPinError("");
                        try {
                          const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url: ticketPin.trim() }),
                          });
                          if (!r.ok) { setTicketPinError("Could not resolve pin."); setTicketPinResolving(false); return; }
                          const { lat, lng } = await r.json();
                          setTicketPinLat(lat); setTicketPinLng(lng);
                        } catch { setTicketPinError("Network error."); }
                        setTicketPinResolving(false);
                      }} disabled={ticketPinResolving}
                        style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {ticketPinResolving ? "..." : "RESOLVE"}
                      </button>
                    )}
                  </div>
                  {ticketPinError && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {ticketPinError}</div>}
                  {ticketPinLat && ticketPinLng && (
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 700, fontFamily: "monospace", marginTop: 4, display: "flex", gap: 12, alignItems: "center" }}>
                      <span>✓ {parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}</span>
                      <a href={`https://www.google.com/maps?q=${ticketPinLat},${ticketPinLng}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none", fontFamily: "'Arial', sans-serif" }}>
                        View on Google Maps ↗
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* GPS Reference — Recommended Leave Time & Expected Distance */}
              {(driveLoading || (driveInfo && !driveInfo.error)) && (() => {
                if (driveLoading) return (
                  <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GPS REFERENCE</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Calculating drive distance...</div>
                  </div>
                );
                let recLeave = null;
                if (dueOnLoc && driveInfo.durationSeconds) {
                  const dueMatch = dueOnLoc.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                  if (dueMatch) {
                    let h = parseInt(dueMatch[1]), min = parseInt(dueMatch[2]);
                    const p = dueMatch[3].toUpperCase();
                    if (p === "PM" && h !== 12) h += 12;
                    if (p === "AM" && h === 12) h = 0;
                    const dueMinutes = h * 60 + min;
                    const driveMinutes = Math.ceil(driveInfo.durationSeconds / 60);
                    let leaveMin = dueMinutes - driveMinutes;
                    if (leaveMin < 0) leaveMin += 1440;
                    const lh = Math.floor(leaveMin / 60);
                    const lm = leaveMin % 60;
                    const lh12 = lh === 0 ? 12 : lh > 12 ? lh - 12 : lh;
                    const lp = lh < 12 ? "AM" : "PM";
                    recLeave = `${lh12}:${String(lm).padStart(2, "0")} ${lp}`;
                  }
                }
                return (
                  <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>GPS REFERENCE</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px" }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>RECOMMENDED TIME TO LEAVE YARD</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: recLeave ? C.text : C.muted }}>{recLeave || (dueOnLoc ? "Calculating..." : "Set Location Time first")}</div>
                        {recLeave && <div style={{ fontSize: 10, color: C.muted }}>Location Time ({dueOnLoc}) − Drive Time ({driveInfo.duration})</div>}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, letterSpacing: "0.06em", marginBottom: 3 }}>EXPECTED DISTANCE</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{driveInfo.distance}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>From yard · Est. {driveInfo.duration}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Time & Mileage — non-Rental only */}
              {type !== "Rental" && (
                <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>TIME &amp; MILEAGE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end", marginBottom: 8 }}>
                    {[
                      { label: "LV YARD", val: lvYard, set: setLvYard, startHour: 6, startPeriod: "AM" },
                      { label: "ARRIVAL", val: arrivalTime, set: setArrivalTime, startHour: 6, startPeriod: "AM" },
                      { label: "JOB START", val: jobStartTime, set: setJobStartTime, startHour: 6, startPeriod: "AM" },
                      { label: "JOB END", val: jobEndTime, set: setJobEndTime, startHour: 12, startPeriod: "PM" },
                      { label: "RET YARD", val: retYard, set: setRetYard, startHour: 12, startPeriod: "PM" },
                    ].map(({ label, val, set, startHour, startPeriod }) => (
                      <div key={label}>
                        <div style={lblSm}>{label}</div>
                        <TimePicker value={val} onChange={set} startHour={startHour} startPeriod={startPeriod} />
                      </div>
                    ))}
                    <div>
                      <div style={lblSm}>TIME ZONE</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: timeZone ? C.text : C.muted, paddingTop: 4 }}>{timeZone || "—"}</div>
                    </div>
                  </div>
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "flex", gap: "8px 14px", flexWrap: "wrap", alignItems: "flex-end" }}>
                    {[
                      { label: "MILEAGE — BEGINNING", val: mileageBegin, set: setMileageBegin },
                      { label: "MILEAGE — END", val: mileageEnd, set: setMileageEnd },
                    ].map(({ label, val, set }) => (
                      <div key={label}>
                        <div style={lblSm}>{label}</div>
                        <input type="number" value={val} onChange={e => set(e.target.value)} min={0} placeholder="0"
                          style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 }} />
                      </div>
                    ))}
                    {mileageBegin !== "" && mileageEnd !== "" && (
                      <div>
                        <div style={lblSm}>TOTAL MILES</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{Math.max(0, parseFloat(mileageEnd) - parseFloat(mileageBegin)).toLocaleString()} mi</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
              <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={type} qbItems={qbItems} jobId={jobId} />
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <label style={labelStyle}>NOTES</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              {/* v28.07.5 — Ticket crew is now stageable BEFORE the ticket is
                  saved. Local state holds planned crew + lead designation;
                  on CREATE TICKET (or auto-save when opening JSA) the staged
                  crew is bulk-POSTed to /tickets/:id/crew via the new id.
                  Continuous workflow: fill ticket details + crew + JSA in
                  one pass without modal-hopping. After save, switches to
                  the live TicketCrewManager for further edits. */}
              {savedTicketId ? (
                <TicketCrewManager
                  ticketId={savedTicketId}
                  ticketIsClosed={false}
                  editable={true}
                />
              ) : (
                <div style={{
                  marginBottom: 14, padding: 14,
                  background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>
                      TICKET CREW ({stagedCrew.length})
                      <span style={{ marginLeft: 8, fontWeight: 400, fontStyle: "italic", color: C.muted, textTransform: "none", letterSpacing: 0 }}>
                        — saved when you create the ticket
                      </span>
                    </div>
                  </div>

                  {/* Add-row */}
                  <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <select
                      style={{ ...inputStyle, flex: 1 }}
                      value={stagedAddPick}
                      onChange={e => setStagedAddPick(e.target.value)}
                    >
                      <option value="">— pick employee —</option>
                      {(users || [])
                        .filter(u => u.is_active !== false)
                        .filter(u => !stagedCrew.some(s => s.user_id === u.id))
                        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name}{u.role ? ` (${u.role})` : ""}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (!stagedAddPick) return;
                        const u = (users || []).find(x => x.id === stagedAddPick);
                        if (!u) return;
                        setStagedCrew(prev => [
                          ...prev,
                          {
                            user_id: u.id,
                            user_name: u.name,
                            user_role: u.role,
                            is_lead: prev.length === 0, // first add becomes lead by default
                          },
                        ]);
                        setStagedAddPick("");
                      }}
                      disabled={!stagedAddPick}
                      style={{
                        background: "transparent", border: `1px solid ${C.blue}`, color: C.blue,
                        fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 3,
                        cursor: stagedAddPick ? "pointer" : "default", letterSpacing: "0.06em",
                        opacity: stagedAddPick ? 1 : 0.5,
                      }}
                    >+ ADD</button>
                  </div>

                  {/* Staged crew list */}
                  {stagedCrew.length === 0 ? (
                    <div style={{
                      fontSize: 12, color: C.muted, fontStyle: "italic",
                      padding: "10px 12px", background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
                    }}>
                      No crew added yet. Pick an employee above to stage them. The first
                      person added is auto-designated as lead — change with MAKE LEAD
                      below.
                    </div>
                  ) : (
                    <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
                      {stagedCrew.map((c, i) => (
                        <div
                          key={c.user_id}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px",
                            borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                            background: c.is_lead ? "#fdf5d8" : C.cardBg,
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                              {c.user_name}
                              {c.is_lead && (
                                <span style={{
                                  marginLeft: 8, fontSize: 9, fontWeight: 800, color: "#8a6500",
                                  background: "#ffffffaa", border: `1px solid #8a650044`,
                                  padding: "1px 6px", borderRadius: 3, letterSpacing: "0.08em",
                                }}>LEAD</span>
                              )}
                              {c.user_role && (
                                <span style={{ marginLeft: 6, fontSize: 10, color: C.muted, fontWeight: 400 }}>
                                  · {c.user_role}
                                </span>
                              )}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            {!c.is_lead && (
                              <button
                                type="button"
                                onClick={() => {
                                  // Atomic lead promote: set this one true, all others false.
                                  setStagedCrew(prev => prev.map(s => ({ ...s, is_lead: s.user_id === c.user_id })));
                                }}
                                style={{
                                  background: "transparent", border: `1px solid ${C.muted}55`,
                                  color: C.muted, fontSize: 10, fontWeight: 700,
                                  padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                                  letterSpacing: "0.06em",
                                }}
                              >MAKE LEAD</button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setStagedCrew(prev => {
                                  const next = prev.filter(s => s.user_id !== c.user_id);
                                  // If we just removed the lead and there's anyone left, promote the first remaining.
                                  if (c.is_lead && next.length > 0 && !next.some(s => s.is_lead)) {
                                    next[0] = { ...next[0], is_lead: true };
                                  }
                                  return next;
                                });
                              }}
                              style={{
                                background: "transparent", border: `1px solid ${C.red}33`,
                                color: C.red, fontSize: 10, fontWeight: 700,
                                padding: "3px 8px", borderRadius: 3, cursor: "pointer",
                                letterSpacing: "0.06em",
                              }}
                            >REMOVE</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={handleSave}>{savedTicketId ? "UPDATE TICKET" : "CREATE TICKET"}</Btn>
                <Btn onClick={handleClose} variant="ghost">{savedTicketId ? "DONE" : "CANCEL"}</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default AddTicketModal;
