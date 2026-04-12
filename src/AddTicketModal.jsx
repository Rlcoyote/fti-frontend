import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { today, parseYards } from "./utils.js";
import { Btn, inputStyle, labelStyle, TICKET_TYPES, TicketTypeBadge } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import LineItemEditor from "./LineItemEditor.jsx";
import { useApp } from "./AppContext.jsx";

function AddTicketModal({ jobId, job, onSave, onClose, jobWells = [] }) {
  const { qbItems, settings } = useApp();
  const yardsList = useMemo(() => parseYards(settings), [settings]);
  const [yardLocationIndex, setYardLocationIndex] = useState(1);
  const [type, setType] = useState(null);
  const [assignedWells, setAssignedWells] = useState([]);
  const [wellsConfirmed, setWellsConfirmed] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(today());
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
    onSave({
      jobId, type, status: "incomplete", date: isRental ? startDate : date,
      signedBy: null, signedAt: null,
      lineItems, notes,
      assignedWells: assignedWells ?? jobWells,
      siteMgrFirst: smFirst, siteMgrLast: smLast, siteMgrPhone: smPhone, siteMgrEmail: smEmail,
      yardLocationIndex,
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
    });
  };

  const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 };
  const lblSm = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#00000088",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }} onClick={handleClose}>
      <div style={{
        background: C.cardBg, border: `1px solid ${C.border}`,
        borderTop: `3px solid ${C.red}`, borderRadius: 8,
        width: type ? 820 : 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto",
      }} onClick={e => e.stopPropagation()}>
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
                    <div style={{ fontSize: 11, color: C.green, fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>✓ {parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}</div>
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
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={handleSave}>CREATE TICKET</Btn>
                <Btn onClick={handleClose} variant="ghost">CANCEL</Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default AddTicketModal;
