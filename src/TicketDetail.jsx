import { useState, useEffect } from "react";
import useIsMobile from "./useIsMobile.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { C, API_URL } from "./config.js";
import { calcLineTotal, validateTicketForApproval } from "./utils.js";
import TicketDeleteModal from "./TicketDeleteModal.jsx";
import TicketVoidModal from "./TicketVoidModal.jsx";
import TicketDuplicateModal from "./TicketDuplicateModal.jsx";
import TicketCommentThread from "./TicketCommentThread.jsx";
import TicketSiteManager from "./TicketSiteManager.jsx";
import TicketGooglePin from "./TicketGooglePin.jsx";
import TicketTimeAndMileage from "./TicketTimeAndMileage.jsx";
import TicketGpsTracking from "./TicketGpsTracking.jsx";
import TicketActionBar from "./TicketActionBar.jsx";
import TicketEditLockBanner from "./TicketEditLockBanner.jsx";
import TicketJsaBar from "./TicketJsaBar.jsx";
import TicketDvirBar from "./TicketDvirBar.jsx";
import TicketHeaderRow from "./TicketHeaderRow.jsx";
import TicketClockInReadiness from "./TicketClockInReadiness.jsx";
import TicketSignatureFlow from "./TicketSignatureFlow.jsx";
import TicketStatusBanners from "./TicketStatusBanners.jsx";
import TicketJobInfo from "./TicketJobInfo.jsx";
import CrewSelectionManager from "./CrewSelectionManager.jsx";
import TicketRigDownMissing from "./TicketRigDownMissing.jsx";
import { inputStyle, TICKET_TYPES, PANEL_TEXT, PANEL_MUTED } from "./SharedUI.jsx";
import useEditLock from "./useEditLock.js";
import useTicketState from "./useTicketState.js";
import useTicketJSA from "./useTicketJSA.js";
import useTicketDvir from "./useTicketDvir.js";
import useSignaturePolling from "./useSignaturePolling.js";
import { PhotoStrip } from "./PhotoStrip.jsx";
import LineItemEditor from "./LineItemEditor.jsx";
import { windowDaysInclusive, TICKET_FAMILY, isLogType } from "./ticketFamilies.js";
import TicketWeekDays from "./TicketWeekDays.jsx";
import WellLogTab from "./WellLogTab.jsx";
import TicketEquipmentSection from "./TicketEquipmentSection.jsx";
import { api } from "./api.js";
import ReadOnlyLineItems from "./ReadOnlyLineItems.jsx";
import JSAModal from "./JSAModal.jsx";
import TicketRentalCycle, { RentalCountdown } from "./TicketRentalCycle.jsx";
import { useApp } from "./AppContext.jsx";

// RentalCountdown is re-exported below for backward compat with JobTicketsTab
// which still imports from this module path. New code should import directly
// from TicketRentalCycle.

function TicketDetail({ ticket, onUpdate, onClose, onDelete, onDuplicate, onRevise, jobs, tickets = [], openToSign = false, asPage = false }) {
  // v28.180 — yards now come from /api/yards via AppContext (canonical yards
  // table from migration 010). Previous parseYards(settings) lookup retired.
  const { qbItems, currentUser, yards, showNotice, can } = useApp();
  const isMobile = useIsMobile();
  const yardsList = yards;

  // Parent WO this ticket belongs to (needed before useTicketState so the
  // hook can derive contact email / customer contacts).
  const job = (jobs || []).find((j) => j.id === ticket.jobId);

  // ── All ticket field state + dirty tracking + payload builder (v27.88) ──
  const s = useTicketState(ticket, job);

  // ── JSA lifecycle (v27.88) ──────────────────────────────────────────────
  const jsa = useTicketJSA(ticket, job, onUpdate);

  // ── DVIR gate lookup (v28.190) — parallel to JSA. Loads "does the ticket's
  // primary vehicle have a passing pre-trip on this ticket's date, and is it
  // free of an active red-tag?" from /api/inspections/current. The
  // TicketDvirBar renders the green/red status; the sign action enforces the
  // gate (block when !dvir.ok). ──────────────────────────────────────────
  const dvir = useTicketDvir(ticket);

  // ── Signature arrival polling (v27.88) ──────────────────────────────────
  // Fires every 30s while status === "emailed" and !signedBy. Flips local
  // state when the external signer lands on the /sign/:token page.
  useSignaturePolling(ticket.id, ticket.jobId, s.status, s.signedBy, ({ signedBy, signedAt, signatureImage }) => {
    s.setSignedBy(signedBy);
    s.setSignedAt(signedAt);
    s.setSignatureImage(signatureImage);
    s.setStatus("signed");
  });

  // ── UI-only flags (not data, not shared — stay flat in this component) ──
  const [showDupModal, setShowDupModal] = useState(false);
  const [showSigPad, setShowSigPad] = useState(() => openToSign && !["sentToQB", "qbVerified", "signed", "sigNotReq", "approved"].includes(ticket.status));
  const [showSigOptions, setShowSigOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────
  const tcfg = TICKET_TYPES[ticket.type] || { color: C.muted, label: ticket.type || "Unknown" };
  const total = s.lineItems.reduce((sum, li) => sum + calcLineTotal(li), 0);
  const isLocked = !s.isEditing && ["signed", "sigNotReq", "approved", "sentToQB", "qbVerified", "voided"].includes(s.status);
  const isFullyLocked = s.status === "qbVerified" || s.status === "sentToQB";
  const isVoided = !!ticket.voidedAt;

  // Edit lock — pessimistic locking for concurrent access
  const editLock = useEditLock("tickets", ticket.id, currentUser, () => save());
  const editable = !isFullyLocked && !isVoided && editLock.hasLock;
  const canApprove = can("approve_tickets");

  // Auto-save site manager as customer contact (upsert — backend deduplicates).
  // v28.81 — writes the canonical fields (phone_work + category + title)
  // instead of the legacy (phone + role_tag). Backend still accepts legacy
  // as input aliases for now, but this caller speaks canonical so it keeps
  // working through and past v28.81b's column drop.
  const saveSiteMgrAsContact = () => {
    const custId = job?.customerId || job?.customer_id;
    const fullName = [s.siteMgrFirst, s.siteMgrLast].filter(Boolean).join(" ").trim();
    if (!fullName || !custId) return;
    fetch(`${API_URL}/customers/${custId}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fullName,
        phone_work: s.siteMgrPhone || null,
        email: s.siteMgrEmail || null,
        category: "site_rep",
        title: "Site Manager",
      }),
    }).catch(() => {});
  };

  // v28.264 — equipment-on-location rows (Phase 3). Loaded per ticket; saved
  // via PUT /tickets/:id/equipment on SAVE (only when touched). Edits wipe the
  // signature via the section's onSigWipe like any other on-page change.
  const [equipment, setEquipment] = useState([]);
  // v28.267 — log-family (Tester/Pumper) body: DAYS & HOURS | WELL LOG tabs.
  const [logTab, setLogTab] = useState("days");
  // v28.273 — per-day JSA: chip click loads that DAY's JSA (may be null) and
  // opens JSAModal locked to the date. jsaBump refreshes the chips on close.
  const [dayJsa, setDayJsa] = useState(null); // { date, existing } | null
  const [jsaBump, setJsaBump] = useState(0);
  const openDayJsa = async (jsaDate) => {
    try {
      const existing = await api.get(`/jsas/ticket/${ticket.id}?date=${jsaDate}`);
      setDayJsa({ date: jsaDate, existing: existing || null });
    } catch {
      setDayJsa({ date: jsaDate, existing: null });
    }
  };
  const [equipDirty, setEquipDirty] = useState(false);
  useEffect(() => {
    api
      .get(`/tickets/${ticket.id}/equipment`)
      .then((rows) => {
        setEquipment(rows.map((r) => ({ inventory_id: r.inventory_id, item: r.item, size: r.size || "", qty: r.qty, note: r.note || "" })));
        setEquipDirty(false);
      })
      .catch(() => setEquipment([]));
  }, [ticket.id]);
  const setEquipmentDirty = (updater) => {
    setEquipDirty(true);
    setEquipment(updater);
  };
  const saveEquipment = () => {
    if (!equipDirty) return;
    api
      .put(`/tickets/${ticket.id}/equipment`, {
        rows: equipment
          .filter((r) => r.item && String(r.item).trim())
          .map((r) => ({ inventory_id: r.inventory_id || null, item: r.item, size: r.size || null, qty: r.qty || 1, note: r.note || null })),
      })
      .then(() => setEquipDirty(false))
      .catch((e) => showNotice?.("Equipment Save Failed", e.message, "error"));
  };

  const save = (overrides = {}) => {
    if (!editable && !overrides.status) return; // Don't save if locked and no status override
    saveSiteMgrAsContact();
    const updates = { ...s.buildPayload(ticket.type), ...overrides };
    onUpdate(ticket.id, updates);
    saveEquipment();
  };

  const handleClose = () => {
    editLock.releaseLock();
    if (s.isDirty() && !isFullyLocked && !ticket.voidedAt) save();
    onClose();
  };

  // Date change wipes signature (same as line item changes)
  const handleDateChange = (newDate) => {
    s.setTicketDate(newDate);
    if (s.signedBy && newDate !== (ticket.date || "").slice(0, 10)) {
      handleSigWipe();
    }
  };

  const handleSigWipe = () => {
    if (!s.signedBy && !s.signatureImage) return; // Nothing to wipe
    s.setSigWiped(true);
    s.setSignedBy(null);
    s.setSignedAt(null);
    s.setSignatureImage(null);
    // v28.40 — wipe-edit on a previously-signed/approved ticket lands the
    // ticket back at incomplete (was inField pre-v28.40). The two states
    // were functionally identical (both meant "needs a signature"); the
    // distinction was historical noise without operational value.
    if (["approved", "sentToQB"].includes(s.status)) {
      s.setStatus("incomplete");
    }
  };

  // v28.40 — future-date guard. A ticket cannot be "completed" (signed or
  // sigNotReq) while its date is in the future. Per Reggie's framing:
  // creation with a future date is allowed (scheduling work for next week
  // is normal); completion with a future date is not (you can't have done
  // work that hasn't happened yet). Backend enforces the same rule.
  const isFutureDated = () => {
    const d = (s.ticketDate || ticket.date || "").slice(0, 10);
    if (!d) return false;
    const todayStr = new Date().toLocaleDateString("en-CA");
    return d > todayStr;
  };

  const blockIfFutureDated = (whichAction) => {
    if (!isFutureDated()) return false;
    const d = (s.ticketDate || ticket.date || "").slice(0, 10);
    showNotice(
      "Ticket date is in the future",
      `This ticket is dated ${d}. Update the date to reflect when the work was actually performed before ${whichAction}.`,
      "error",
    );
    return true;
  };

  // v28.190 — DVIR gate. Same posture as the future-dated check: returns true
  // if the action should be BLOCKED. Block reasons (in priority order):
  //   - vehicle red-tagged (most severe; cannot operate)
  //   - no pre-trip on file for the ticket's date
  //   - pre-trip exists but recorded defects (result !== 'pass')
  // The "no vehicle" case does NOT block at sign time. A ticket can legitimately
  // be signed without a vehicle assigned (admin-cadence work, paperwork-only
  // tickets, etc.); only the DVIR bar nudges to assign a vehicle. If a vehicle
  // IS assigned, its DVIR is enforced.
  const blockIfDvirNotReady = (whichAction) => {
    if (!dvir.loaded) return false; // don't block before the lookup finishes
    if (dvir.reason === "no_vehicle") return false; // no vehicle = nothing to gate on
    if (dvir.ok) return false; // green light
    let title = "DVIR required";
    let body = "A passing pre-trip DVIR is required for this vehicle on this ticket's date before " + whichAction + ".";
    if (dvir.reason === "red_tagged") {
      title = "Vehicle is red-tagged";
      body = `This vehicle is out of service${dvir.activeRedTag?.reason ? ` (${dvir.activeRedTag.reason})` : ""}. Clear the red-tag before ${whichAction}.`;
    } else if (dvir.reason === "failed_dvir") {
      title = "Today's DVIR recorded defects";
      body = `Today's pre-trip recorded defects. Re-inspect after repair before ${whichAction}.`;
    }
    showNotice(title, body, "error");
    return true;
  };

  const handleSign = ({ name, date, imageData }) => {
    if (blockIfFutureDated("collecting a signature")) return;
    if (blockIfDvirNotReady("collecting a signature")) return;
    s.setSignedBy(name);
    s.setSignedAt(date);
    s.setSignatureImage(imageData);
    s.setStatus("signed");
    s.setSigWiped(false);
    setShowSigPad(false);
    s.setIsEditing(false);
    save({ signedBy: name, signedAt: date, signatureImage: imageData, status: "signed", sigNotReqReason: null, sigNotReqNote: "" });
  };

  const handleCancel = () => {
    s.resetFromTicket(ticket);
    setShowSigPad(false);
    setShowSigOptions(false);
    onClose();
  };

  // v28.262 — same-family type switch on an existing ticket (Reggie: "the
  // ability to switch back to another ticket if the situation arises"). Saves
  // immediately through the normal save path; a signed ticket's signature
  // wipes (the document changed) exactly as any other billing edit. Cross-
  // family options are disabled in the dropdown AND refused by BE v28.260.
  const handleTypeSwitch = (next) => {
    if (!next || next === ticket.type) return;
    const wasSigned = !!s.signedBy;
    handleSigWipe();
    save({ type: next, ...(wasSigned ? { signedBy: null, signedAt: null, signatureImage: null, status: "incomplete" } : {}) });
  };

  const handleSave = () => {
    if (s.sigWiped) {
      // v28.40 — wipe lands at incomplete (was inField).
      save({ signedBy: null, signedAt: null, signatureImage: null, status: "incomplete" });
      s.setStatus("incomplete");
    } else {
      save();
    }
    s.setIsEditing(false);
    s.setSigWiped(false);
    onClose();
  };

  const handleSigNotRequired = () => {
    if (!s.sigNotReqReason) return;
    if (s.signedBy) return; // Don't allow if already signed
    if (blockIfFutureDated("marking signature not required")) return;
    if (blockIfDvirNotReady("marking signature not required")) return;
    s.setStatus("sigNotReq");
    setShowSigOptions(false);
    save({ status: "sigNotReq", sigNotReqReason: s.sigNotReqReason, sigNotReqNote: s.sigNotReqNote, signedBy: null, signedAt: null, signatureImage: null });
  };

  const handleApprove = () => {
    // v28.189 — block approval when time-data is incomplete. Reggie 2026-05-24:
    // a ticket reached "approved" with no Leave Yard or Return to Yard recorded.
    // validateTicketForApproval checks both legacy manual fields (lvYard,
    // retYard) and the v28.183 GPS-tracked equivalents (yardLeftAt,
    // yardReturnedAt) — either source counts.
    const check = validateTicketForApproval({
      lvYard: s.lvYard,
      retYard: s.retYard,
      yardLeftAt: s.yardLeftAt,
      yardReturnedAt: s.yardReturnedAt,
    });
    if (!check.ok) {
      showNotice("Cannot approve yet", check.error, "error");
      return;
    }
    s.setStatus("approved");
    save({ status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
  };

  const isPageMode = asPage || isMobile;

  // v28.268 — modal mode locks the page behind (scroll-chain bug fix).

  useBodyScrollLock(!isPageMode);

  return (
    <div
      style={
        isPageMode
          ? { background: tcfg.bg, borderTop: `4px solid ${tcfg.color}`, minHeight: "100vh" }
          : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isPageMode ? undefined : handleClose}
    >
      <div
        style={
          isPageMode
            ? { maxWidth: 820, margin: "0 auto" }
            : {
                background: tcfg.bg,
                border: `1px solid ${C.border}`,
                borderTop: `4px solid ${tcfg.color}`,
                borderRadius: 8,
                width: 820,
                maxWidth: "95vw",
                maxHeight: "90vh",
                overflowY: "auto",
                overscrollBehavior: "contain",
              }
        }
        onClick={isPageMode ? undefined : (e) => e.stopPropagation()}
      >
        {/* Ticket type header bar */}
        <div style={{ background: tcfg.color, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "0.1em" }}>{tcfg.label || ticket.type?.toUpperCase()}</div>
              {editable && (
                <select
                  value={ticket.type}
                  onChange={(e) => handleTypeSwitch(e.target.value)}
                  title="Switch ticket type (same family). The form recolors; a signed ticket's signature clears."
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: 4,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 6px",
                    cursor: "pointer",
                  }}
                >
                  {Object.keys(TICKET_TYPES).map((t) => (
                    <option key={t} value={t} style={{ color: "#222" }} disabled={TICKET_FAMILY[t] !== TICKET_FAMILY[ticket.type]}>
                      {t}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>TICKET DETAIL</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 4,
              padding: "5px 14px",
              fontSize: 11,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}
          >
            CLOSE
          </button>
        </div>
        {/* Edit lock banner + edit-request notification — extracted to TicketEditLockBanner (v27.81) */}
        <TicketEditLockBanner editLock={editLock} />
        {/* JSA bar — extracted to TicketJsaBar (v27.82). Single component handles
            both non-Rental (required) and Rental (optional) variants via ticket.type. */}
        <TicketJsaBar ticket={ticket} jsaLoaded={jsa.jsaLoaded} existingJSA={jsa.existingJSA} onOpen={() => jsa.setShowJSA(true)} />
        {/* v28.190 — DVIR bar. Same row treatment as JSA. Tap opens the
            inspection page with vehicleId pre-filled. */}
        <TicketDvirBar ticket={ticket} dvirState={dvir} />

        {/* Header row — extracted to TicketHeaderRow (v27.83) */}
        <TicketHeaderRow
          ticket={ticket}
          status={s.status}
          total={total}
          isLocked={isLocked}
          isFullyLocked={isFullyLocked}
          editable={editable}
          job={job}
          isPageMode={isPageMode}
          ticketDate={s.ticketDate}
          onDateChange={handleDateChange}
          dueOnLoc={s.dueOnLoc}
          setDueOnLoc={s.setDueOnLoc}
          timeZone={s.timeZone}
          setTimeZone={s.setTimeZone}
          yardLocationIndex={s.yardLocationIndex}
          setYardLocationIndex={s.setYardLocationIndex}
          yardsList={yardsList}
        />

        {/* v28.214 — Phase 4b: clock-in readiness. The lead sees the three
            prerequisites (Location Time + Yard above, Pin below) and whether
            the crew can clock into the job yet. Job tickets only (Rental
            doesn't track time). */}
        {!["Rental"].includes(ticket.type) && (
          <TicketClockInReadiness
            dueOnLoc={s.dueOnLoc}
            yardName={yardsList[(s.yardLocationIndex || 1) - 1]?.name}
            pinLat={s.ticketPinLat}
            pinLng={s.ticketPinLng}
            driveInfo={s.driveInfo}
          />
        )}

        {/* Job / Customer Info — extracted to TicketJobInfo (v27.86) */}
        <TicketJobInfo job={job} assignedWells={ticket.assignedWells} />

        {/* Site Manager — extracted to TicketSiteManager (v27.76) */}
        <TicketSiteManager
          editable={editable}
          values={{ first: s.siteMgrFirst, last: s.siteMgrLast, phone: s.siteMgrPhone, email: s.siteMgrEmail }}
          onChange={(partial) => {
            if (partial.first !== undefined) s.setSiteMgrFirst(partial.first);
            if (partial.last !== undefined) s.setSiteMgrLast(partial.last);
            if (partial.phone !== undefined) s.setSiteMgrPhone(partial.phone);
            if (partial.email !== undefined) s.setSiteMgrEmail(partial.email);
          }}
          job={job}
          knownContacts={s.knownContacts}
        />

        {/* Crew Selection (v28.06; renamed from Ticket Crew in v28.09).
            Prereq for v28.07 JSA biometric flow — JSA auto-populates
            required signers from this list. Hidden until ticket has an id
            (skip on the create flow before ticket exists in DB). */}
        {ticket?.id && (
          <CrewSelectionManager
            ticketId={ticket.id}
            ticketIsClosed={isFullyLocked || !!ticket.voidedAt || !!ticket.deletedAt}
            editable={editable}
            ticketType={ticket.type}
            jobId={ticket.jobId}
          />
        )}

        {/* v28.183 — GPS time tracking block. Sits ABOVE the manual time/
            mileage fields, so the GPS-pulled times are the canonical record
            and the legacy manual fields below act as a fallback for crews
            on non-GPS vehicles. Hidden for Rental tickets (which don't track
            time at all). */}
        {!["Rental"].includes(ticket.type) && ticket?.id && (
          <TicketGpsTracking
            ticket={ticket}
            editable={editable}
            gpsVehicleId={s.gpsVehicleId}
            setGpsVehicleId={s.setGpsVehicleId}
            yardLeftAt={s.yardLeftAt}
            setYardLeftAt={s.setYardLeftAt}
            yardReturnedAt={s.yardReturnedAt}
            setYardReturnedAt={s.setYardReturnedAt}
            gpsStatus={s.gpsStatus}
            setGpsStatus={s.setGpsStatus}
            gpsPulledAt={s.gpsPulledAt}
            setGpsPulledAt={s.setGpsPulledAt}
            stops={s.stops}
            setStops={s.setStops}
          />
        )}

        {/* Time & Mileage — extracted to TicketTimeAndMileage (v27.78) */}
        {!["Rental"].includes(ticket.type) && (
          <TicketTimeAndMileage
            ticketType={ticket.type}
            editable={editable}
            values={{
              lvYard: s.lvYard,
              arrivalTime: s.arrivalTime,
              jobStartTime: s.jobStartTime,
              jobEndTime: s.jobEndTime,
              retYard: s.retYard,
              timeZone: s.timeZone,
              mileageBegin: s.mileageBegin,
              mileageEnd: s.mileageEnd,
              dueOnLoc: s.dueOnLoc,
            }}
            onChange={(partial) => {
              if (partial.lvYard !== undefined) s.setLvYard(partial.lvYard);
              if (partial.arrivalTime !== undefined) s.setArrivalTime(partial.arrivalTime);
              if (partial.jobStartTime !== undefined) s.setJobStartTime(partial.jobStartTime);
              if (partial.jobEndTime !== undefined) s.setJobEndTime(partial.jobEndTime);
              if (partial.retYard !== undefined) s.setRetYard(partial.retYard);
              if (partial.mileageBegin !== undefined) s.setMileageBegin(partial.mileageBegin);
              if (partial.mileageEnd !== undefined) s.setMileageEnd(partial.mileageEnd);
            }}
            driveInfo={s.driveInfo}
          />
        )}

        {/* Rental cycle — extracted to TicketRentalCycle (v27.79) */}
        <TicketRentalCycle
          ticket={ticket}
          readOnly={isFullyLocked || !!ticket.voidedAt}
          values={{ startDate: s.rentalStartDate, endDate: s.rentalEndDate, cycleDays: s.rentalCycleDays, recurring: s.rentalRecurring }}
          onChange={(partial) => {
            if (partial.startDate !== undefined) s.setRentalStartDate(partial.startDate);
            if (partial.endDate !== undefined) s.setRentalEndDate(partial.endDate);
            if (partial.cycleDays !== undefined) s.setRentalCycleDays(partial.cycleDays);
            if (partial.recurring !== undefined) s.setRentalRecurring(partial.recurring);
            // v28.261 — Option 2: a completed window re-fills every line's DAYS
            // (hand edits per line still override after). Changes billing, so
            // the signature wipes like any other line-item edit.
            const from = partial.startDate !== undefined ? partial.startDate : s.rentalStartDate;
            const to = partial.endDate !== undefined ? partial.endDate : s.rentalEndDate;
            const n = windowDaysInclusive(from, to);
            if (n !== null) {
              s.setLineItems((prev) => prev.map((li) => ({ ...li, days: n })));
              handleSigWipe();
            }
          }}
        />

        {/* Google Pin — extracted to TicketGooglePin (v27.77) */}
        <TicketGooglePin
          editable={editable}
          values={{ pin: s.ticketPin, lat: s.ticketPinLat, lng: s.ticketPinLng }}
          onChange={(partial) => {
            if (partial.pin !== undefined) s.setTicketPin(partial.pin);
            if (partial.lat !== undefined) s.setTicketPinLat(partial.lat);
            if (partial.lng !== undefined) s.setTicketPinLng(partial.lng);
          }}
          job={job}
          driveInfo={s.driveInfo}
          driveLoading={s.driveLoading}
          onCalcDrive={async () => {
            if (!s.ticketPinLat || !s.ticketPinLng) return;
            s.setDriveLoading(true);
            try {
              const r = await fetch(`${API_URL}/jobs/drive-distance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destLat: s.ticketPinLat, destLng: s.ticketPinLng, yard_index: s.yardLocationIndex }),
              });
              if (r.ok) {
                const d = await r.json();
                s.setDriveInfo(d);
              } else s.setDriveInfo({ error: "Could not calculate — check yard location in Settings" });
            } catch {
              s.setDriveInfo({ error: "Network error" });
            }
            s.setDriveLoading(false);
          }}
        />

        {/* Body */}
        <div style={{ padding: "16px 24px" }}>
          {/* Status banners — extracted to TicketStatusBanners (v27.85) */}
          <TicketStatusBanners ticket={ticket} status={s.status} signedBy={s.signedBy} isEditing={s.isEditing} sigWiped={s.sigWiped} />

          {/* Rig Down missing-pieces — extracted to TicketRigDownMissing (v27.86) */}
          <TicketRigDownMissing ticketType={ticket.type} isLocked={isLocked} missingPieces={s.missingPieces} setMissingPieces={s.setMissingPieces} />

          {/* Line items — v28.44: PANEL_MUTED for the section header
              (renders directly on the pastel tcfg.bg panel). */}
          {isLogType(ticket.type) && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {[
                  ["days", "DAYS & HOURS"],
                  ["well", "WELL LOG"],
                ].map(([key, label]) => (
                  <span
                    key={key}
                    onClick={() => setLogTab(key)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      cursor: "pointer",
                      border: `2px solid ${logTab === key ? tcfg.color : C.border}`,
                      background: logTab === key ? `${tcfg.color}22` : "transparent",
                      color: logTab === key ? tcfg.color : PANEL_MUTED,
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              {logTab === "days" ? (
                <TicketWeekDays
                  ticket={ticket}
                  accent={tcfg.color}
                  readOnly={isLocked}
                  showNotice={showNotice}
                  onOpenJsa={openDayJsa}
                  jsaBump={jsaBump}
                  onTotalHours={(total, meta) => {
                    // v28.267 — auto-sum: the saved week total flows into any
                    // line item measured in hours (U/M starting HR/HOUR).
                    // Office adjusts before approval; the signature wipes
                    // (billing changed).
                    if (!meta?.saved || !total) return;
                    let touched = false;
                    s.setLineItems((prev) =>
                      prev.map((li) => {
                        if (/^(hr|hour)/i.test(String(li.um || ""))) {
                          touched = true;
                          return { ...li, qty: total };
                        }
                        return li;
                      }),
                    );
                    if (touched) {
                      handleSigWipe();
                      showNotice?.("Test Hours Applied", `${total} hours filled into the hourly line item(s). Press SAVE to keep it.`, "success");
                    }
                  }}
                />
              ) : (
                <WellLogTab ticket={ticket} accent={tcfg.color} readOnly={isLocked} showNotice={showNotice} />
              )}
            </div>
          )}

          <TicketEquipmentSection
            rows={equipment}
            setRows={setEquipmentDirty}
            ticketType={ticket.type}
            jobId={ticket.jobId}
            readOnly={isLocked}
            onSigWipe={handleSigWipe}
          />

          <div style={{ fontSize: 12, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
          {!isLocked ? (
            <LineItemEditor
              lineItems={s.lineItems}
              setLineItems={s.setLineItems}
              ticketType={ticket.type}
              qbItems={qbItems}
              onSigWipe={handleSigWipe}
              jobId={ticket.jobId}
            />
          ) : (
            <ReadOnlyLineItems lineItems={s.lineItems} ticketType={ticket.type} total={total} />
          )}

          {/* Notes — v28.44: header + read-only display use PANEL_*. */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: PANEL_MUTED, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
            {!isFullyLocked ? (
              <textarea
                style={{ ...inputStyle, width: "100%", minHeight: 60, resize: "vertical", boxSizing: "border-box" }}
                value={s.notes}
                onChange={(e) => s.setNotes(e.target.value)}
                placeholder="Notes..."
              />
            ) : (
              <div style={{ fontSize: 12, color: PANEL_TEXT, padding: "8px 0" }}>{s.notes || "—"}</div>
            )}
          </div>

          {/* Photos */}
          <PhotoStrip ticketId={ticket.id} isLocked={isFullyLocked || !!ticket.voidedAt} />

          {/* Signature flow — extracted to TicketSignatureFlow (v27.84) */}
          <TicketSignatureFlow
            status={s.status}
            signedBy={s.signedBy}
            signedAt={s.signedAt}
            signatureImage={s.signatureImage}
            sigNotReqReason={s.sigNotReqReason}
            sigNotReqNote={s.sigNotReqNote}
            showSigOptions={showSigOptions}
            setSigNotReqReason={s.setSigNotReqReason}
            setSigNotReqNote={s.setSigNotReqNote}
            onConfirmSigNotRequired={handleSigNotRequired}
            onCancelSigOptions={() => setShowSigOptions(false)}
            showSigPad={showSigPad}
            onSign={handleSign}
            onCancelSigPad={() => setShowSigPad(false)}
          />

          {/* Comment Thread — extracted to TicketCommentThread (v27.75) */}
          <TicketCommentThread
            ticket={ticket}
            onPendingCleared={(id) => {
              if (onUpdate) onUpdate(id, { hasPendingComment: false, has_pending_comment: false });
            }}
          />
        </div>

        {/* Footer — extracted to TicketActionBar (v27.80) */}
        <TicketActionBar
          ticket={ticket}
          status={s.status}
          isLocked={isLocked}
          isFullyLocked={isFullyLocked}
          isEditing={s.isEditing}
          sigWiped={s.sigWiped}
          signedBy={s.signedBy}
          existingJSA={jsa.existingJSA}
          jsaLoaded={jsa.jsaLoaded}
          canApprove={canApprove}
          showSigPad={showSigPad}
          showSigOptions={showSigOptions}
          handleSave={handleSave}
          handleClose={handleClose}
          handleCancel={handleCancel}
          handleApprove={handleApprove}
          onClose={onClose}
          setIsEditing={s.setIsEditing}
          setShowSigPad={setShowSigPad}
          setShowSigOptions={setShowSigOptions}
          setShowJSA={jsa.setShowJSA}
          setShowVoidConfirm={setShowVoidConfirm}
          setShowDupModal={setShowDupModal}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onRevise={onRevise}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />

        {/* Delete confirmation — extracted to TicketDeleteModal (v27.70) */}
        {showDeleteConfirm && <TicketDeleteModal ticket={ticket} onClose={() => setShowDeleteConfirm(false)} onDeleted={onDelete} />}

        {/* Void confirmation — extracted to TicketVoidModal (v27.71) */}
        {showVoidConfirm && <TicketVoidModal ticket={ticket} onClose={() => setShowVoidConfirm(false)} onRevise={onRevise} />}

        {/* JSA Modal — save handler lives in useTicketJSA (v27.88) */}
        {dayJsa && job && (
          <JSAModal
            job={job}
            ticket={{ ...ticket, date: dayJsa.date }}
            targetDate={dayJsa.date}
            existingJSA={dayJsa.existing}
            onClose={() => {
              setDayJsa(null);
              setJsaBump((n) => n + 1);
            }}
            onSave={jsa.handleJsaSave}
            onComplete={jsa.handleJsaCompleted}
          />
        )}
        {jsa.showJSA && job && (
          <JSAModal
            job={job}
            ticket={{
              ...ticket,
              date: s.ticketDate,
              pinLat: s.ticketPinLat || ticket.pinLat,
              pinLng: s.ticketPinLng || ticket.pinLng,
              googlePin: s.ticketPin || ticket.googlePin,
            }}
            existingJSA={jsa.existingJSA}
            onClose={() => jsa.setShowJSA(false)}
            onSave={jsa.handleJsaSave}
            onComplete={jsa.handleJsaCompleted}
          />
        )}

        {/* Duplicate Options Modal — extracted to TicketDuplicateModal (v27.72) */}
        {showDupModal && (
          <TicketDuplicateModal ticket={ticket} jobs={jobs} tickets={tickets} onClose={() => setShowDupModal(false)} onDuplicate={onDuplicate} />
        )}
      </div>
    </div>
  );
}

export default TicketDetail;
export { RentalCountdown };
