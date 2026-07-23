import { useState, useEffect, useMemo } from "react";
import { resolveMapPin } from "./mapPin.js";
import useIsMobile from "./useIsMobile.js";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { Btn, inputStyle, labelStyle, TICKET_TYPES, TicketTypeBadge, PANEL_TEXT, PANEL_MUTED, Z_INDEX, TINT } from "./SharedUI.jsx";
import TimePicker from "./TimePicker.jsx";
import { validateTicketTimes, driveMinutesFromInfo } from "./ticketTimeValidation.js";
import LineItemEditor from "./LineItemEditor.jsx";
import { windowDaysInclusive, typeCaps, TICKET_FAMILY, isLogType } from "./ticketFamilies.js";
import TicketEquipmentSection from "./TicketEquipmentSection.jsx";
import AddTicketJsaPortal from "./AddTicketJsaPortal.jsx";
import AddTicketCrewSection from "./AddTicketCrewSection.jsx";
import AddTicketUnsavedConfirm from "./AddTicketUnsavedConfirm.jsx";
import AddTicketTypeSelector from "./AddTicketTypeSelector.jsx";
import AddTicketWellsConfirm from "./AddTicketWellsConfirm.jsx";
import AddTicketWorkOrderBanner from "./AddTicketWorkOrderBanner.jsx";
import AddTicketSiteManager from "./AddTicketSiteManager.jsx";
import AddTicketDateTimeFields from "./AddTicketDateTimeFields.jsx";
import AddTicketGooglePin from "./AddTicketGooglePin.jsx";
import AddTicketGpsReference from "./AddTicketGpsReference.jsx";
import AddTicketGpsVehicle from "./AddTicketGpsVehicle.jsx";
import AddTicketTimeMileage from "./AddTicketTimeMileage.jsx";
import { useApp } from "./AppContext.jsx";
import useBodyScrollLock from "./useBodyScrollLock.js";

function AddTicketModal({ workOrderId, job, onSave, onClose, workOrderWells = [], initialType = null }) {
  const isMobile = useIsMobile();
  // v28.268 — the create modal locks the page behind it (scroll-chain fix).
  useBodyScrollLock(true);
  // Set by the JSA soft-save (softSaveForJsa): creating a JSA from this modal
  // first soft-saves the ticket, then this id flips the modal into update mode
  // (so the final save updates rather than creating a duplicate) and feeds the
  // JSA portal + crew section the real ticket id.
  const [savedTicketId, setSavedTicketId] = useState(null);
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
  // v28.271 — the type menu preselects; the in-modal grid remains only as the
  // fallback empty state for any path that opens without a type.
  const [type, setType] = useState(initialType);
  const [assignedWells, setAssignedWells] = useState([]);
  // v28.398 (Reggie: "prior renditions already had the wells selected and…
  // gave the user the option to deselect") — visit-family tickets preselect
  // ALL job wells; the confirm step remains the check. Log types (Tester/
  // Pumper) keep deliberate selection — one well per ticket.
  useEffect(() => {
    if (type && !isLogType(type) && !wellsConfirmed && assignedWells.length === 0 && (workOrderWells || []).length > 0) {
      setAssignedWells(workOrderWells);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);
  const [wellsConfirmed, setWellsConfirmed] = useState(false);
  const [lineItems, setLineItems] = useState([]);
  // v28.264 — equipment-on-location rows (master-ticket Phase 3). Separate
  // from lineItems by design: what's ON LOCATION vs what's BILLED.
  const [equipment, setEquipment] = useState([]);
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
  // v28.261 — optional rental window on RU/RD (maps to start_date/end_date,
  // the same columns Rental already uses). Both set -> every line's DAYS
  // auto-fills (Option 2); hand edits after still override until the window
  // changes again.
  const [windowFrom, setWindowFrom] = useState("");
  const [windowTo, setWindowTo] = useState("");
  const [showUnsaved, setShowUnsaved] = useState(false);

  // v28.09 — detect whether the parent job has a non-voided Rig Up so the
  // COPY CREW FROM RIG UP button can surface in the Crew Selection section
  // pre-save (mirrors LineItemEditor.copyFromRigUp gate). Skipped if the
  // current ticket is itself a Rig Up — copying from sibling RUs onto a
  // new RU isn't a workflow we expose.
  useEffect(() => {
    if (!workOrderId || type === "Rig Up") {
      setHasRigUpForCopy(false);
      return;
    }
    fetch(`${API_URL}/tickets?job_id=${workOrderId}&include_voided=true`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rigUps = (data || []).filter((tk) => tk.type === "Rig Up" && !tk.voided_at);
        setHasRigUpForCopy(rigUps.length > 0);
      })
      .catch(() => setHasRigUpForCopy(false));
  }, [workOrderId, type]);
  // v28.183 — GPS vehicle picker. uuid of vehicles row; populates
  // tickets.gps_vehicle_id on save. AddTicketGpsVehicle auto-defaults to
  // the lead crew's assigned vehicle but only on the first pass — user
  // can override anytime.
  const [gpsVehicleId, setGpsVehicleId] = useState(null);
  const [trailerId, setTrailerId] = useState(null); // v28.280 — which trailer hauled the iron
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

  // v28.261 — Option 2 auto-fill: a completed window (RU/RD From/To, or the
  // Rental start+computed end) fills every line's DAYS; per-line hand edits
  // override until the window changes again. Declared AFTER the endDate memo
  // it reads (TDZ). effWindow* are plain derivations — the effect keys on them.
  const effWindowFrom = type === "Rental" ? startDate : windowFrom;
  const effWindowTo = type === "Rental" ? endDate : windowTo;
  useEffect(() => {
    const n = windowDaysInclusive(effWindowFrom, effWindowTo);
    if (n === null) return;
    setLineItems((prev) => prev.map((li) => ({ ...li, days: n })));
  }, [effWindowFrom, effWindowTo]);

  // v28.262 — the master-ticket type selector. v28.182 REMOVED the old
  // "CHANGE TYPE" button because type-specific state (Rental's cycleDays)
  // silently survived a switch and landed on the wrong ticket. The dropdown
  // returns with the crossover class killed by EXPLICIT residue mapping:
  // every field that doesn't apply to the new type is carried or cleared, on
  // purpose, right here. Once a JSA soft-save has created the real ticket,
  // switches lock to the same family (BE v28.260 refuses cross-family PUTs).
  const caps = typeCaps(type);
  const switchType = (next) => {
    if (!next || next === type) return;
    if (savedTicketId && TICKET_FAMILY[next] !== TICKET_FAMILY[type]) return;
    if (next === "Rental") {
      if (windowFrom) setStartDate(windowFrom); // carry the window into the cycle start
      setWindowFrom("");
      setWindowTo("");
    } else if (type === "Rental") {
      if (typeCaps(next).window && startDate) {
        setWindowFrom(startDate); // carry the cycle window into RU/RD From/To
        if (endDate) setWindowTo(endDate);
      }
    }
    setType(next);
  };

  const isDirty = type || lineItems.length > 0 || notes;
  const handleClose = () => {
    // Once soft-saved the ticket is persisted (it's already in the parent list),
    // so "DONE" closes without the unsaved-work warning — that guard only exists
    // to protect a never-saved ticket.
    if (isDirty && !savedTicketId) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  };

  const handleSelectType = (t) => {
    setType(t);
    setAssignedWells([...workOrderWells]);
    if (workOrderWells.length <= 1) setWellsConfirmed(true);
    else setWellsConfirmed(false);
    if (t === "Rig Down") {
      fetch(`${API_URL}/tickets?job_id=${workOrderId}&include_voided=true`)
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
    // v28.278 — multi-well restored for log tickets: the master workbook runs
    // up to SIX wells per flowback under one tester (Reggie, C5). The v28.267
    // single-well read came from the paper ticket's lone Well Name line — the
    // WORKSHEET is the well-data authority, and it's multi-well.
    setAssignedWells((prev) => (prev.includes(well) ? prev.filter((w) => w !== well) : [...prev, well]));
  };
  const selectAllWells = () => setAssignedWells([...workOrderWells]);

  // Pin-resolve + drive calc + time gate + payload build — shared by the final
  // save and the JSA soft-save so the two can never construct a ticket
  // differently. Returns the ticketData, or null when a validation gate stopped
  // the save (the relevant notice has already been shown). Does NOT manage
  // isSubmitting — the caller owns that.
  const prepareTicketData = async () => {
    {
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
          const res = await resolveMapPin(effPin);
          if (res.ok) {
            rlat = res.lat;
            rlng = res.lng;
          }
          // not-ok falls through to the not-resolved notice below
          if (!rlat || !rlng) {
            showNotice(
              "Pin not resolved",
              "This ticket has a Google pin that couldn't be turned into coordinates. Drive time and the clock-in window depend on it — check the pin link and tap RESOLVE, or clear the pin, then save again.",
              "error",
            );
            return null;
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
          logFamily: isLogType(type),
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
          return null;
        }
      }
      const ticketData = {
        workOrderId,
        // v28.109 — carried so useAddTicket can upsert a manually-entered
        // site manager as a customer contact for this customer.
        customerId: job?.customerId || job?.customer_id || null,
        type,
        status: "incomplete",
        date: isRental ? startDate : date,
        signedBy: null,
        signedAt: null,
        lineItems,
        equipment,
        notes,
        assignedWells: assignedWells ?? workOrderWells,
        siteMgrFirst: smFirst,
        siteMgrLast: smLast,
        siteMgrPhone: smPhone,
        siteMgrEmail: smEmail,
        yardLocationIndex,
        gpsVehicleId,
        trailerId,
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
        ...(!isRental && windowFrom && windowTo ? { startDate: windowFrom, endDate: windowTo } : {}),
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
      // (WorkOrderTicketsTab.handleAdd) can bulk-POST them to /tickets/:id/crew
      // after the ticket POST succeeds.
      if (crewSelection.length > 0) ticketData.crewSelection = crewSelection;
      return ticketData;
    }
  };

  const handleSave = async () => {
    if (!type || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const ticketData = await prepareTicketData();
      if (!ticketData) return;
      // After a JSA soft-save the ticket already exists — carry its id so the
      // parent updates it instead of creating a duplicate.
      if (savedTicketId) ticketData.id = savedTicketId;
      await onSave(ticketData);
    } finally {
      // On success the parent unmounts this modal, so this is a no-op then;
      // on failure the modal stays open and the button re-enables for retry.
      setIsSubmitting(false);
    }
  };

  // v28.243 — restored "soft save for JSA" (removed as dead code in v28.240; it
  // was a disconnected feature, not garbage — see git history). Creating a JSA
  // from the new-ticket modal first soft-saves the ticket so the JSA has a real
  // ticket to attach to, keeps the modal open, then flips it into update mode so
  // the final save updates rather than duplicating. No JSA is ever opened
  // against an unsaved ticket — the portal also guards on savedTicketId.
  const softSaveForJsa = async () => {
    if (isSubmitting) return;
    if (savedTicketId) {
      setShowJSA(true); // ticket already soft-saved this session — just open the JSA
      return;
    }
    setIsSubmitting(true);
    try {
      const ticketData = await prepareTicketData();
      if (!ticketData) return;
      const saved = await onSave(ticketData, { keepOpen: true });
      if (saved?.id) {
        setSavedTicketId(saved.id);
        setCrewSelection([]); // crew was committed by the create path; the live manager takes over
        setShowJSA(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fti-modal-selectable"
      style={
        isMobile
          ? {
              position: "fixed",
              inset: 0,
              background: (type && TICKET_TYPES[type]?.bg) || C.cardBg,
              zIndex: Z_INDEX.modal,
              overflowY: "auto",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
            }
          : { position: "fixed", inset: 0, background: C.scrim, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
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
                overscrollBehavior: "contain",
              }
        }
        onClick={isMobile ? undefined : (e) => e.stopPropagation()}
      >
        {showUnsaved && <AddTicketUnsavedConfirm onDiscard={onClose} onDismiss={() => setShowUnsaved(false)} />}

        {/* Job info banner — always visible once type selected */}
        {type && <AddTicketWorkOrderBanner job={job} />}

        {/* v28.243 — SAVE & START JSA restores the soft-save flow. The v28.42
            removal forced every new-ticket JSA through save → close → reopen;
            this brings back the one-click path: soft-save the ticket (kept
            open) and open the JSA against it. Shown only for a non-Rental
            ticket with no JSA yet; once a JSA exists the VIEW / EDIT button
            below takes over. The ticket-row JSA entry point is unchanged. */}
        {type && caps.jsaInCreate && !existingJSA && (
          <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="fti-btn"
              type="button"
              onClick={softSaveForJsa}
              disabled={isSubmitting}
              style={{
                background: TINT.blueGray50,
                color: C.blue,
                border: `1px solid ${C.blue}44`,
                borderRadius: 4,
                padding: "5px 14px",
                fontSize: 11,
                fontWeight: 800,
                cursor: isSubmitting ? "default" : "pointer",
                letterSpacing: "0.04em",
                opacity: isSubmitting ? 0.6 : 1,
              }}
            >
              {savedTicketId ? "OPEN JSA" : isSubmitting ? "SAVING…" : "SAVE & START JSA"}
            </button>
            <span style={{ fontSize: 11, color: C.muted }}>Saves the ticket so the JSA can attach — no need to save &amp; reopen.</span>
          </div>
        )}

        {/* VIEW / EDIT JSA — shown once a JSA exists on this ticket. */}
        {type && caps.jsaInCreate && existingJSA && (
          <div style={{ padding: "8px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            {/* v28.69 — button state mirrors the v28.41 badge pattern.
                Before this fix the button was hardcoded green ✓ the moment
                existingJSA was truthy, including when the JSA was a draft
                with only some crew signed — communicating "JSA complete"
                falsely. Now: green ✓ only when `completed_at` is set;
                amber DRAFT otherwise. Same color tokens as the JSA badge
                on WorkOrderTicketsTab so the two surfaces agree. */}
            {(() => {
              const isComplete = !!existingJSA.completed_at;
              const colors = isComplete
                ? { bg: TINT.greenBg, text: TINT.greenText, border: `${TINT.greenText}44`, hover: TINT.greenDeepBg }
                : { bg: TINT.yellowBg, text: TINT.yellowText, border: TINT.yellowBorder + "44", hover: TINT.yellowHover };
              return (
                <button
                  className="fti-btn"
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
          workOrderId={workOrderId}
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
          ) : type && !wellsConfirmed && workOrderWells.length > 1 ? (
            <AddTicketWellsConfirm
              type={type}
              workOrderWells={workOrderWells}
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
                <select
                  value={type || ""}
                  onChange={(e) => switchType(e.target.value)}
                  title="Switch ticket type — the form recolors and keeps everything that applies"
                  style={{
                    border: `2px solid ${C.border}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: C.cardBg,
                    color: C.text,
                    cursor: "pointer",
                  }}
                >
                  {Object.keys(TICKET_TYPES).map((t) => (
                    <option key={t} value={t} disabled={!!savedTicketId && TICKET_FAMILY[t] !== TICKET_FAMILY[type]}>
                      {t}
                    </option>
                  ))}
                </select>
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
                windowFrom={windowFrom}
                setWindowFrom={setWindowFrom}
                windowTo={windowTo}
                setWindowTo={setWindowTo}
                showWindow={caps.window}
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
                workOrderId={workOrderId}
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
              {caps.gps && (
                <AddTicketGpsVehicle
                  gpsVehicleId={gpsVehicleId}
                  setGpsVehicleId={setGpsVehicleId}
                  trailerId={trailerId}
                  setTrailerId={setTrailerId}
                  crewSelection={crewSelection}
                />
              )}

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

              {caps.times && (
                <AddTicketTimeMileage
                  ticketType={type}
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
              <TicketEquipmentSection rows={equipment} setRows={setEquipment} ticketType={type} workOrderId={workOrderId} readOnly={false} />
              <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={type} qbItems={qbItems} workOrderId={workOrderId} />
              <div style={{ marginTop: 16, marginBottom: 16 }}>
                <label style={labelStyle}>NOTES</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 56 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? (savedTicketId ? "UPDATING…" : "CREATING…") : savedTicketId ? "UPDATE TICKET" : "CREATE TICKET"}
                </Btn>
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
