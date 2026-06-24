import { useState, useEffect, useMemo } from "react";
import useIsMobile from "./useIsMobile.js";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { Btn, inputStyle, labelStyle, TICKET_TYPES, TicketTypeBadge, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import { validateTicketTimes, driveMinutesFromInfo } from "./ticketTimeValidation.js";
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
import AddTicketGpsVehicle from "./AddTicketGpsVehicle.jsx";
import AddTicketTimeMileage from "./AddTicketTimeMileage.jsx";
import { useApp } from "./AppContext.jsx";

function AddTicketModal({ jobId, job, onSave, onClose, jobWells = [] }) {
  const isMobile = useIsMobile();
  // The only path that ever set this was _autoSaveForJSA (removed as dead code) —
  // so it is permanently null. Kept as a const (still passed to the JSA portal +
  // crew section) until/unless the open-JSA-before-save flow is rebuilt.
  const savedTicketId = null;
  const [showJSA, setShowJSA] = useState(false);
  const [existingJSA, setExistingJSA] = useState(null);
  // Disables + relabels the CREATE/UPDATE button while a save is in flight,
  // so the user sees the click registered. The airtight double-submit stop
  // lives in useAddTicket (a ref guard); this is the visible-feedback layer.
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  // v28.180 — yards now come from /api/yards via AppContext (canonical yards
  // table from migration 010). parseYards(settings) replaced; settings is no
  // longer needed in this component (yards was its only consumer here).
  const { qbItems, yards, showNotice, users } = useApp();
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
  const yardsList = yards;
  const [yardLocationIndex, setYardLocationIndex] = useState(1);
  const [type, setType] = useState(null);
  const [assignedWells, setAssignedWells] = useState([]);
  const [wellsConfirmed, setWellsConfirmed] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => (job?.dateStarted ? String(job.dateStarted).slice(0, 10) : today()));
  // v28.70 — Rental tickets default to WO scheduled date + 1 day, not
  // today(). Reasoning: Day 1 rental is captured on the Rig Up ticket
  // (which uses WO scheduled date directly). Ongoing Rental starts the
  // day after the RU is rigged up. The prior default of today() was
  // inconsistent with how every other ticket type inherits the WO
  // scheduled date (see line above this — `date` does inherit) and
  // forced the user to manually change the date every time they created
  // a Rental ticket scheduled for a future job.
  const [startDate, setStartDate] = useState(() => {
    if (!job?.dateStarted) return today();
    const d = new Date(String(job.dateStarted).slice(0, 10) + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString("en-CA");
  });
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
  // v28.183 — GPS vehicle picker. uuid of vehicles row; populates
  // tickets.gps_vehicle_id on save. AddTicketGpsVehicle auto-defaults to
  // the lead crew's assigned vehicle but only on the first pass — user
  // can override anytime.
  const [gpsVehicleId, setGpsVehicleId] = useState(null);
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
  // v28.188 — pre-populate from the parent WO's POC fields when the modal
  // opens for a fresh ticket. Mirrors the ticketPin/ticketPinLat/ticketPinLng
  // pattern just above: fall through camelCase then snake_case so it works
  // whether the job came from the in-memory store (camelCase) or fresh API
  // (snake_case). Empty fallback preserves the prior "blank when no POC"
  // behavior. Bug origin: 2026-05-22 drive-test, Reggie reported the ticket's
  // site-manager block stayed blank even though the WO had the POC set.
  const [smFirst, setSmFirst] = useState(job?.contactFirst || job?.contact_first || "");
  const [smLast, setSmLast] = useState(job?.contactLast || job?.contact_last || "");
  const [smPhone, setSmPhone] = useState(job?.pocPhone || job?.poc_phone || "");
  const [smEmail, setSmEmail] = useState(job?.pocEmail || job?.poc_email || "");
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

  const handleSave = async () => {
    if (!type || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isRental = type === "Rental";
      const jobGooglePin = job?.googlePin || job?.google_pin || null;
      const jobPinLat = job?.pinLat || job?.pin_lat || null;
      const jobPinLng = job?.pinLng || job?.pin_lng || null;
      // Effective pin coords for this save (resolved below if needed).
      let effPinLat = ticketPinLat || jobPinLat;
      let effPinLng = ticketPinLng || jobPinLng;
      let driveMin = driveMinutesFromInfo(driveInfo);

      // v28.224 — auto-resolve the pin on save. Coords only populated on an
      // explicit RESOLVE click, and typing cleared them — so a ticket could
      // save with a pin string but no coordinates, silently nulling drive time
      // (which breaks BOTH this gate's route-floor AND the labor clock-in
      // anchor's drive_minutes). Resolve here so coords are always present when
      // a pin is. If it genuinely can't resolve, stop and tell the lead —
      // never save a coordinate-less pin silently.
      if (!isRental) {
        const effPin = (ticketPin || "").trim() || jobGooglePin || "";
        if (effPin && (!effPinLat || !effPinLng)) {
          let rlat = null;
          let rlng = null;
          try {
            const rr = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: effPin }),
            });
            if (rr.ok) {
              const j = await rr.json();
              rlat = j.lat;
              rlng = j.lng;
            }
          } catch {
            // fall through to the not-resolved notice
          }
          if (!rlat || !rlng) {
            showNotice(
              "Pin not resolved",
              "This ticket has a Google pin that couldn't be turned into coordinates. Drive time and the clock-in window depend on it — check the pin link and tap RESOLVE, or clear the pin, then save again.",
              "error",
            );
            return;
          }
          effPinLat = rlat;
          effPinLng = rlng;
          setTicketPinLat(rlat);
          setTicketPinLng(rlng);
          driveMin = null; // force a fresh drive calc with the new coords
        }

        // Fresh drive calc when we don't have one but now have coords.
        if (driveMin == null && effPinLat && effPinLng) {
          try {
            const dr = await fetch(`${API_URL}/jobs/drive-distance`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ destLat: effPinLat, destLng: effPinLng, yard_index: yardLocationIndex }),
            });
            if (dr.ok) driveMin = driveMinutesFromInfo(await dr.json());
          } catch {
            // leave null — gate self-skips the route floor, ordering still applies
          }
        }

        // Sanity gate on the Time & Mileage stamps (v28.221–223).
        const { ok, errors } = validateTicketTimes({
          lvYard,
          arrivalTime,
          jobStartTime,
          jobEndTime,
          retYard,
          driveMinutes: driveMin,
          toleranceMin: 10,
        });
        if (!ok) {
          showNotice(
            "Check the times",
            <div>
              {errors.map((e, i) => (
                <div key={i} style={{ marginBottom: i < errors.length - 1 ? 8 : 0 }}>
                  • {e}
                </div>
              ))}
            </div>,
            "error",
          );
          return;
        }
      }
      const ticketData = {
        jobId,
        // v28.109 — carried so useAddTicket can upsert a manually-entered
        // site manager as a customer contact for this customer.
        customerId: job?.customerId || job?.customer_id || null,
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
        gpsVehicleId,
        hasJSA: !!existingJSA,
        ...(type === "Rig Down" ? { missingPieces: null } : {}),
        ...(isRental
          ? {
              startDate,
              endDate,
              cycleDays: parseInt(cycleDays) || 28,
              isRecurring,
              googlePin: ticketPin.trim() || jobGooglePin,
              pinLat: effPinLat,
              pinLng: effPinLng,
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
              pinLat: effPinLat,
              pinLng: effPinLng,
            }
          : {}),
      };
      // v28.07.5 / v28.09 — pass selected crew along so the parent
      // (JobTicketsTab.handleAdd) can bulk-POST them to /tickets/:id/crew
      // after the ticket POST succeeds.
      if (crewSelection.length > 0) ticketData.crewSelection = crewSelection;
      await onSave(ticketData);
    } finally {
      // On success the parent unmounts this modal, so this is a no-op then;
      // on failure the modal stays open and the button re-enables for retry.
      setIsSubmitting(false);
    }
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
              onCancel={handleClose}
            />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <TicketTypeBadge type={type} />
                {/* v28.44 — main-form heading on the always-light pastel
                    tcfg.bg panel uses PANEL_TEXT (single source of truth in
                    SharedUI). */}
                {/* v28.182 — "← CHANGE TYPE" button removed. Per Reggie: it
                    was redundant + a source of subtle state-crossover bugs
                    (type-specific fields like Rental's cycleDays survived
                    a type switch and could land on a non-Rental ticket).
                    Type recovery now flows through: close the modal
                    (wipes state) and re-open with the right type. */}
                <span style={{ fontSize: 16, fontWeight: 700, color: PANEL_TEXT }}>New {type} Ticket</span>
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

              {/* v28.183 — GPS Vehicle picker. Sits between Crew (where the
                  lead is chosen) and the Google Pin (where the location is
                  set) — the picker auto-defaults to the lead crew member's
                  assigned vehicle and is the source of the GPS pull on
                  TicketDetail later. */}
              {type !== "Rental" && <AddTicketGpsVehicle gpsVehicleId={gpsVehicleId} setGpsVehicleId={setGpsVehicleId} crewSelection={crewSelection} />}

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
                <Btn onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? "CREATING…" : "CREATE TICKET"}
                </Btn>
                <Btn onClick={handleClose} variant="ghost">
                  CANCEL
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
