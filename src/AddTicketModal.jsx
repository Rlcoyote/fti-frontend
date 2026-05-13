import { useState, useEffect, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { today, parseYards } from "./utils.js";
import { Btn, inputStyle, labelStyle, TICKET_TYPES, TicketTypeBadge, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import LineItemEditor from "./LineItemEditor.jsx";
import AddTicketJsaPortal from "./AddTicketJsaPortal.jsx";
import AddTicketCrewSection from "./AddTicketCrewSection.jsx";
import AddTicketUnsavedConfirm from "./AddTicketUnsavedConfirm.jsx";
import AddTicketTypeSelector from "./AddTicketTypeSelector.jsx";
import AddTicketWellsConfirm from "./AddTicketWellsConfirm.jsx";
import AddTicketJobBanner from "./AddTicketJobBanner.jsx";
import AddTicketSiteManager from "./AddTicketSiteManager.jsx";
import AddTicketDateTimeFields from "./AddTicketDateTimeFields.jsx";
import AddTicketGooglePin from "./AddTicketGooglePin.jsx";
import AddTicketGpsReference from "./AddTicketGpsReference.jsx";
import AddTicketTimeMileage from "./AddTicketTimeMileage.jsx";
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
    const handlePop = () => {
      onClose();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile, onClose]);
  const { qbItems, settings, currentUser, showNotice, users } = useApp();
  // v28.07.5 / v28.09 — stage Crew Selection BEFORE the ticket is saved.
  // Local state holds the planned crew; on CREATE TICKET we POST the
  // ticket, then bulk-POST the selection to /tickets/:id/crew using the
  // new id. Lets users fill in everything (ticket details + crew + JSA)
  // in one continuous flow without modal-hopping.
  // v28.09 rename: stagedCrew → crewSelection (matches the on-screen
  // "CREW SELECTION" label per CAM Article XXIV consistency rule).
  const [crewSelection, setCrewSelection] = useState([]); // [{ user_id, user_name, user_role, is_lead }]
  const [showCopyCrew, setShowCopyCrew] = useState(false);
  const [hasRigUpForCopy, setHasRigUpForCopy] = useState(false);
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

  // v28.09 — detect whether the parent job has a non-voided Rig Up so the
  // COPY CREW FROM RIG UP button can surface in the Crew Selection section
  // pre-save (mirrors LineItemEditor.copyFromRigUp gate). Skipped if the
  // current ticket is itself a Rig Up — copying from sibling RUs onto a
  // new RU isn't a workflow we expose.
  useEffect(() => {
    if (!jobId || type === "Rig Up") {
      setHasRigUpForCopy(false);
      return;
    }
    fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rigUps = (data || []).filter((tk) => tk.type === "Rig Up" && !tk.voided_at);
        setHasRigUpForCopy(rigUps.length > 0);
      })
      .catch(() => setHasRigUpForCopy(false));
  }, [jobId, type]);
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
    if (!lat || !lng) {
      setDriveInfo(null);
      return;
    }
    setDriveLoading(true);
    fetch(`${API_URL}/jobs/drive-distance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destLat: lat, destLng: lng, yard_index: yardLocationIndex }),
    })
      .then((r) => (r.ok ? r.json() : { error: "Could not calculate" }))
      .then((d) => setDriveInfo(d))
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
  const handleClose = () => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  };

  // v28.07.5 / v28.09 — Bulk-POST the staged Crew Selection to
  // /tickets/:id/crew after the ticket exists. Called from autoSaveForJSA
  // (when user opens JSA before explicit save) AND from
  // JobTicketsTab.handleAdd (after explicit CREATE TICKET). Lead-promotion
  // is atomic on the server side — POST with is_lead=true demotes any
  // existing lead in the same transaction.
  const commitCrewSelection = async (ticketId) => {
    if (!ticketId || crewSelection.length === 0) return;
    for (const c of crewSelection) {
      try {
        await fetch(`${API_URL}/tickets/${ticketId}/crew`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: c.user_id, is_lead: !!c.is_lead }),
        });
      } catch (err) {
        console.warn("Crew selection member failed to commit:", c.user_name, err);
      }
    }
    setCrewSelection([]); // clear local; the live CrewSelectionManager will fetch the just-inserted rows
  };

  // v28.57 — autoSaveForJSA dormant. Initially marked for deletion under
  // CAM Article XII (Kill Stale Code), but removing it exposed half-wired
  // surrounding code: `savedTicketId` / `setSavedTicketId` / `showNotice`
  // and the `commitCrewSelection` helper are all still referenced by
  // defensive conditional branches throughout this file (e.g., line ~206
  // `if (savedTicketId) ticketData.id = savedTicketId`, line ~710 button
  // label `savedTicketId ? "UPDATE TICKET" : "CREATE TICKET"`).
  //
  // Those branches currently always take the "no saved ticket" path because
  // the only path that set savedTicketId was this function — and no caller
  // remains. Resolving the architectural drift here is beyond the v28.57
  // lint-enforcement scope. Function is renamed with `_` prefix to signal
  // intentional dormancy + queued for the post-v28.57 audit pass.
  const _autoSaveForJSA = async () => {
    if (savedTicketId) {
      setShowJSA(true);
      return;
    } // already saved
    if (!type) return;
    const isRental = type === "Rental";
    const jobGooglePin = job?.googlePin || job?.google_pin || null;
    const jobPinLat = job?.pinLat || job?.pin_lat || null;
    const jobPinLng = job?.pinLng || job?.pin_lng || null;
    const payload = {
      job_id: jobId,
      type,
      status: "incomplete",
      date: isRental ? startDate : date,
      notes,
      created_by: currentUser?.id || null,
      assigned_wells: assignedWells ?? jobWells,
      site_mgr_first: smFirst || null,
      site_mgr_last: smLast || null,
      site_mgr_phone: smPhone || null,
      site_mgr_email: smEmail || null,
      yard_location_index: yardLocationIndex,
      google_pin: ticketPin.trim() || jobGooglePin,
      pin_lat: ticketPinLat || jobPinLat,
      pin_lng: ticketPinLng || jobPinLng,
      lineItems: (lineItems || []).map((li) => ({
        qb_code: li.qbCode,
        description: li.desc,
        rate: li.rate,
        qty: li.qty,
        unit_measure: li.um,
        days: li.days || 1,
      })),
      ...(isRental ? { start_date: startDate, end_date: endDate, cycle_days: parseInt(cycleDays) || 28, is_recurring: isRecurring } : {}),
      ...(!isRental
        ? {
            lv_yard: lvYard || null,
            arrival_time: arrivalTime || null,
            due_on_loc: dueOnLoc || null,
            job_start_time: jobStartTime || null,
            job_end_time: jobEndTime || null,
            ret_yard: retYard || null,
            time_zone: timeZone || null,
            mileage_begin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
            mileage_end: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
          }
        : {}),
    };
    try {
      const r = await fetch(`${API_URL}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (r.ok) {
        const saved = await r.json();
        setSavedTicketId(saved.id);
        await commitCrewSelection(saved.id);
        setShowJSA(true);
      } else {
        showNotice("Save Failed", "Could not save the ticket. Please try again.", "error");
      }
    } catch {
      showNotice("Network Error", "A network error occurred while saving the ticket.", "error");
    }
  };

  const handleSelectType = (t) => {
    setType(t);
    setAssignedWells([...jobWells]);
    if (jobWells.length <= 1) setWellsConfirmed(true);
    else setWellsConfirmed(false);
    if (t === "Rig Down") {
      fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          const ru = data.filter((tk) => tk.type === "Rig Up" && !tk.voided_at).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
          if (ru) {
            const wells = ru.assigned_wells || [];
            if (wells.length) setAssignedWells([...wells]);
            if (ru.notes) setNotes(ru.notes);
          }
        })
        .catch(() => {});
    }
    if (t === "Rental") {
      setStartDate(today());
      setCycleDays(28);
      setIsRecurring(true);
    }
  };

  const toggleWell = (well) => {
    setAssignedWells((prev) => (prev.includes(well) ? prev.filter((w) => w !== well) : [...prev, well]));
  };
  const selectAllWells = () => setAssignedWells([...jobWells]);

  const handleSave = () => {
    if (!type) return;
    const isRental = type === "Rental";
    const jobGooglePin = job?.googlePin || job?.google_pin || null;
    const jobPinLat = job?.pinLat || job?.pin_lat || null;
    const jobPinLng = job?.pinLng || job?.pin_lng || null;
    const ticketData = {
      jobId,
      type,
      status: "incomplete",
      date: isRental ? startDate : date,
      signedBy: null,
      signedAt: null,
      lineItems,
      notes,
      assignedWells: assignedWells ?? jobWells,
      siteMgrFirst: smFirst,
      siteMgrLast: smLast,
      siteMgrPhone: smPhone,
      siteMgrEmail: smEmail,
      yardLocationIndex,
      hasJSA: !!existingJSA,
      ...(type === "Rig Down" ? { missingPieces: null } : {}),
      ...(isRental
        ? {
            startDate,
            endDate,
            cycleDays: parseInt(cycleDays) || 28,
            isRecurring,
            googlePin: ticketPin.trim() || jobGooglePin,
            pinLat: ticketPinLat || jobPinLat,
            pinLng: ticketPinLng || jobPinLng,
          }
        : {}),
      ...(!isRental
        ? {
            lvYard,
            arrivalTime,
            dueOnLoc,
            jobStartTime,
            jobEndTime,
            retYard,
            timeZone,
            mileageBegin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
            mileageEnd: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
            googlePin: ticketPin.trim() || jobGooglePin,
            pinLat: ticketPinLat || jobPinLat,
            pinLng: ticketPinLng || jobPinLng,
          }
        : {}),
    };
    // If ticket was already auto-saved (for JSA), pass the ID so parent knows to update, not create
    if (savedTicketId) ticketData.id = savedTicketId;
    // v28.07.5 / v28.09 — pass selected crew along so the parent
    // (JobTicketsTab.handleAdd) can bulk-POST them to /tickets/:id/crew
    // after the ticket POST succeeds. If savedTicketId is already set
    // (autoSaveForJSA path), commitCrewSelection already ran and
    // crewSelection is empty — passing the empty array is a no-op.
    if (crewSelection.length > 0) ticketData.crewSelection = crewSelection;
    onSave(ticketData);
  };

  return (
    <div
      style={
        isMobile
          ? {
              position: "fixed",
              inset: 0,
              background: (type && TICKET_TYPES[type]?.bg) || C.cardBg,
              zIndex: 100,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }
          : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isMobile ? undefined : handleClose}
    >
      <div
        style={
          isMobile
            ? {
                background: (type && TICKET_TYPES[type]?.bg) || C.cardBg,
                borderTop: `3px solid ${(type && TICKET_TYPES[type]?.color) || C.red}`,
                minHeight: "100%",
                padding: "0 0 40px",
              }
            : {
                background: (type && TICKET_TYPES[type]?.bg) || C.cardBg,
                border: `1px solid ${C.border}`,
                borderTop: `3px solid ${(type && TICKET_TYPES[type]?.color) || C.red}`,
                borderRadius: 8,
                width: type ? 820 : 480,
                maxWidth: "95vw",
                maxHeight: "90vh",
                overflowY: "auto",
              }
        }
        onClick={isMobile ? undefined : (e) => e.stopPropagation()}
      >
        {showUnsaved && <AddTicketUnsavedConfirm onDiscard={onClose} onDismiss={() => setShowUnsaved(false)} />}

        {/* Job info banner — always visible once type selected */}
        {type && <AddTicketJobBanner job={job} />}

        {/* v28.42 — CREATE JSA button removed from this surface. JSA creation
            now lives only on the ticket-detail modal (post-creation), per
            CAM Article III Amendment 2 Q6 — two paths to the same destination
            invite drift. The "Required before signing" gate is enforced at
            the ticket-row level via t.jsaCompleted (JobTicketsTab needsJSA),
            so this affordance was redundant. The VIEW / EDIT JSA button for
            an already-saved JSA stays — it's a useful jump-back. */}
        {type && type !== "Rental" && existingJSA && (
          <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            {/* v28.69 — button state mirrors the v28.41 badge pattern.
                Before this fix the button was hardcoded green ✓ the moment
                existingJSA was truthy, including when the JSA was a draft
                with only some crew signed — communicating "JSA complete"
                falsely. Now: green ✓ only when `completed_at` is set;
                amber DRAFT otherwise. Same color tokens as the JSA badge
                on JobTicketsTab so the two surfaces agree. */}
            {(() => {
              const isComplete = !!existingJSA.completed_at;
              const colors = isComplete
                ? { bg: "#e6f5ec", text: C.green, border: `${C.green}44`, hover: "#d4edda" }
                : { bg: "#fdf5d8", text: "#8a6500", border: "#e6c20044", hover: "#fbeaa0" };
              return (
                <button
                  type="button"
                  onClick={() => setShowJSA(true)}
                  style={{
                    background: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 4,
                    padding: "5px 14px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.bg;
                  }}
                >
                  {isComplete ? "✓ VIEW / EDIT JSA" : "VIEW / EDIT JSA — DRAFT"}
                </button>
              );
            })()}
          </div>
        )}

        <AddTicketJsaPortal
          open={showJSA}
          savedTicketId={savedTicketId}
          jobId={jobId}
          job={job}
          type={type}
          date={date}
          startDate={startDate}
          ticketPinLat={ticketPinLat}
          ticketPinLng={ticketPinLng}
          ticketPin={ticketPin}
          assignedWells={assignedWells}
          existingJSA={existingJSA}
          setExistingJSA={setExistingJSA}
          onClose={() => setShowJSA(false)}
        />

        <div style={{ padding: 24 }}>
          {!type ? (
            <AddTicketTypeSelector onSelect={handleSelectType} onCancel={handleClose} />
          ) : type && !wellsConfirmed && jobWells.length > 1 ? (
            <AddTicketWellsConfirm
              type={type}
              jobWells={jobWells}
              assignedWells={assignedWells}
              onToggleWell={toggleWell}
              onSelectAll={selectAllWells}
              onConfirm={() => setWellsConfirmed(true)}
              onChangeType={() => {
                setType(null);
                setWellsConfirmed(false);
              }}
              onCancel={handleClose}
            />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <TicketTypeBadge type={type} />
                {/* v28.44 — main-form heading on the always-light pastel
                    tcfg.bg panel uses PANEL_TEXT (single source of truth in
                    SharedUI). */}
                <span style={{ fontSize: 16, fontWeight: 700, color: PANEL_TEXT }}>New {type} Ticket</span>
                <button
                  onClick={() => {
                    setType(null);
                    setWellsConfirmed(false);
                  }}
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: PANEL_MUTED,
                    cursor: "pointer",
                    marginLeft: "auto",
                  }}
                >
                  ← CHANGE TYPE
                </button>
              </div>

              <AddTicketDateTimeFields
                type={type}
                startDate={startDate}
                setStartDate={setStartDate}
                cycleDays={cycleDays}
                setCycleDays={setCycleDays}
                endDate={endDate}
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
                date={date}
                setDate={setDate}
                dueOnLoc={dueOnLoc}
                setDueOnLoc={setDueOnLoc}
                timeZone={timeZone}
                setTimeZone={setTimeZone}
                yardsList={yardsList}
                yardLocationIndex={yardLocationIndex}
                setYardLocationIndex={setYardLocationIndex}
              />

              <AddTicketSiteManager
                job={job}
                smFirst={smFirst}
                smLast={smLast}
                smPhone={smPhone}
                smEmail={smEmail}
                setSmFirst={setSmFirst}
                setSmLast={setSmLast}
                setSmPhone={setSmPhone}
                setSmEmail={setSmEmail}
              />

              <AddTicketCrewSection
                savedTicketId={savedTicketId}
                type={type}
                jobId={jobId}
                users={users}
                crewSelection={crewSelection}
                setCrewSelection={setCrewSelection}
                hasRigUpForCopy={hasRigUpForCopy}
                showCopyCrew={showCopyCrew}
                setShowCopyCrew={setShowCopyCrew}
              />

              {type && (
                <AddTicketGooglePin
                  jobGooglePin={jobGooglePin}
                  pinMismatch={pinMismatch}
                  ticketPin={ticketPin}
                  setTicketPin={setTicketPin}
                  ticketPinLat={ticketPinLat}
                  ticketPinLng={ticketPinLng}
                  setTicketPinLat={setTicketPinLat}
                  setTicketPinLng={setTicketPinLng}
                  ticketPinResolving={ticketPinResolving}
                  setTicketPinResolving={setTicketPinResolving}
                  ticketPinError={ticketPinError}
                  setTicketPinError={setTicketPinError}
                />
              )}

              <AddTicketGpsReference driveLoading={driveLoading} driveInfo={driveInfo} dueOnLoc={dueOnLoc} />

              {type !== "Rental" && (
                <AddTicketTimeMileage
                  lvYard={lvYard}
                  arrivalTime={arrivalTime}
                  jobStartTime={jobStartTime}
                  jobEndTime={jobEndTime}
                  retYard={retYard}
                  setLvYard={setLvYard}
                  setArrivalTime={setArrivalTime}
                  setJobStartTime={setJobStartTime}
                  setJobEndTime={setJobEndTime}
                  setRetYard={setRetYard}
                  timeZone={timeZone}
                  mileageBegin={mileageBegin}
                  mileageEnd={mileageEnd}
                  setMileageBegin={setMileageBegin}
                  setMileageEnd={setMileageEnd}
                />
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
              <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={type} qbItems={qbItems} jobId={jobId} />
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <label style={labelStyle}>NOTES</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={handleSave}>{savedTicketId ? "UPDATE TICKET" : "CREATE TICKET"}</Btn>
                <Btn onClick={handleClose} variant="ghost">
                  {savedTicketId ? "DONE" : "CANCEL"}
                </Btn>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AddTicketModal;
