import { useState, useEffect, useRef, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { formatDate, calcLineTotal, buildTicketPayload, mapTicketFromApi, parseYards } from "./utils.js";
import TicketDeleteModal from "./TicketDeleteModal.jsx";
import TicketVoidModal from "./TicketVoidModal.jsx";
import TicketDuplicateModal from "./TicketDuplicateModal.jsx";
import TicketCommentThread from "./TicketCommentThread.jsx";
import TicketSiteManager from "./TicketSiteManager.jsx";
import TicketGooglePin from "./TicketGooglePin.jsx";
import TicketTimeAndMileage from "./TicketTimeAndMileage.jsx";
import TicketActionBar from "./TicketActionBar.jsx";
import TicketEditLockBanner from "./TicketEditLockBanner.jsx";
import TicketJsaBar from "./TicketJsaBar.jsx";
import TicketHeaderRow from "./TicketHeaderRow.jsx";
import TicketSignatureFlow from "./TicketSignatureFlow.jsx";
import { inputStyle, TICKET_TYPES } from "./SharedUI.jsx";
import useEditLock from "./useEditLock.js";
import { PhotoStrip } from "./PhotoStrip.jsx";
import LineItemEditor from "./LineItemEditor.jsx";
import ReadOnlyLineItems from "./ReadOnlyLineItems.jsx";
import JSAModal from "./JSAModal.jsx";
import TicketRentalCycle, { RentalCountdown } from "./TicketRentalCycle.jsx";
import { useApp } from "./AppContext.jsx";

// RentalCountdown is re-exported below for backward compat with JobTicketsTab
// which still imports from this module path. New code should import directly
// from TicketRentalCycle.

function TicketDetail({ ticket, onUpdate, onClose, onDelete, onDuplicate, onRevise, jobs, tickets = [], openToSign = false, asPage = false }) {
  const { qbItems, currentUser, settings, showNotice } = useApp();
  const [isMobile] = useState(() => window.innerWidth <= 900);
  const yardsList = useMemo(() => parseYards(settings), [settings]);
  // All state initialized from ticket prop on mount only
  const [lineItems, setLineItems] = useState(() => [...(ticket.lineItems || [])]);
  const [ticketDate, setTicketDate] = useState(() => ticket.date ? ticket.date.slice(0, 10) : "");
  const [notes, setNotes] = useState(() => ticket.notes || "");
  const [rentalStartDate, setRentalStartDate] = useState(() => (ticket.startDate || ticket.start_date || "").slice(0, 10));
  const [rentalEndDate, setRentalEndDate] = useState(() => (ticket.endDate || ticket.end_date || "").slice(0, 10));
  const [rentalCycleDays, setRentalCycleDays] = useState(() => ticket.cycleDays || ticket.cycle_days || 28);
  const [rentalRecurring, setRentalRecurring] = useState(() => !!(ticket.isRecurring || ticket.is_recurring));
  const [status, setStatus] = useState(() => ticket.status);
  const [missingPieces, setMissingPieces] = useState(() => ticket.missingPieces ?? null);
  const [sigNotReqReason, setSigNotReqReason] = useState(() => ticket.sigNotReqReason || null);
  const [sigNotReqNote, setSigNotReqNote] = useState(() => ticket.sigNotReqNote || "");
  // Time & mileage fields (all ticket types except JSA and Rental)
  const [lvYard, setLvYard] = useState(() => ticket.lvYard || ticket.lv_yard || "");
  const [arrivalTime, setArrivalTime] = useState(() => ticket.arrivalTime || ticket.arrival_time || "");
  const [dueOnLoc, setDueOnLoc] = useState(() => ticket.dueOnLoc || ticket.due_on_loc || "");
  const [jobStartTime, setJobStartTime] = useState(() => ticket.jobStartTime || ticket.job_start_time || "");
  const [jobEndTime, setJobEndTime] = useState(() => ticket.jobEndTime || ticket.job_end_time || "");
  const [retYard, setRetYard] = useState(() => ticket.retYard || ticket.ret_yard || "");
  const [timeZone, setTimeZone] = useState(() => ticket.timeZone || ticket.time_zone || "");
  const [mileageBegin, setMileageBegin] = useState(() => ticket.mileageBegin ?? ticket.mileage_begin ?? "");
  const [mileageEnd, setMileageEnd] = useState(() => ticket.mileageEnd ?? ticket.mileage_end ?? "");
  // Ticket-level pin
  const [ticketPin, setTicketPin] = useState(() => ticket.googlePin || ticket.google_pin || "");
  const [ticketPinLat, setTicketPinLat] = useState(() => ticket.pinLat || ticket.pin_lat || null);
  const [ticketPinLng, setTicketPinLng] = useState(() => ticket.pinLng || ticket.pin_lng || null);
  // ticketPinResolving + ticketPinError moved into TicketGooglePin (v27.77)
  // — transient display state, never read outside the component.
  const [driveInfo, setDriveInfo] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
  // Site Manager fields (ticket-level)
  const [siteMgrFirst, setSiteMgrFirst] = useState(() => ticket.siteMgrFirst || "");
  const [siteMgrLast, setSiteMgrLast] = useState(() => ticket.siteMgrLast || "");
  const [siteMgrPhone, setSiteMgrPhone] = useState(() => ticket.siteMgrPhone || "");
  const [siteMgrEmail, setSiteMgrEmail] = useState(() => ticket.siteMgrEmail || "");
  // Yard location — 1-indexed, matches backend yard_location_index / yard_index
  const [yardLocationIndex, setYardLocationIndex] = useState(() => ticket.yardLocationIndex || ticket.yard_location_index || 1);
  // Known contacts for this customer (for site manager quick-fill)
  const [knownContacts, setKnownContacts] = useState([]);
  const _contactJob = (jobs || []).find(j => j.id === ticket.jobId);
  const _contactCustId = _contactJob?.customerId || _contactJob?.customer_id;
  useEffect(() => {
    if (!_contactCustId) return;
    fetch(`${API_URL}/customers/${_contactCustId}/contacts`)
      .then(r => r.ok ? r.json() : [])
      .then(c => setKnownContacts(c))
      .catch(() => {});
  }, [_contactCustId]);
  const [showDupModal, setShowDupModal] = useState(false);
  // All duplicate-modal state (dupType, dupDate, dupJobId, dupSourceId,
  // dupSourcePickerOpen, incLineItems, incNotes, incPin, incWells,
  // dupSubmitting) moved into TicketDuplicateModal (v27.72). Parent just
  // controls open/close; each open starts with fresh defaults.
  const [emailTo, setEmailTo] = useState(() => {
    if (ticket.emailTo) return ticket.emailTo.split(",").map(e => e.trim()).filter(Boolean);
    const job = jobs?.find(j => j.id === ticket.jobId);
    const pocAddr = job?.pocEmail || job?.poc_email || "";
    return pocAddr ? [pocAddr] : [""];
  });
  const [emailCc, setEmailCc] = useState(() => ticket.emailCc || "");
  const [signedBy, setSignedBy] = useState(() => ticket.signedBy || null);
  const [signedAt, setSignedAt] = useState(() => ticket.signedAt || null);
  const [signatureImage, setSignatureImage] = useState(() => ticket.signatureImage || null);
  const [sigWiped, setSigWiped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Track original values for dirty detection
  const normalizeLI = (items) => (items || []).map(li => `${li.qbCode||li.qb_code}|${li.desc||li.description}|${li.rate}|${li.qty}|${li.um||li.unit_measure}|${li.days||1}`).join("~");
  const origRef = useRef({
    lineItems: normalizeLI(ticket.lineItems),
    notes: ticket.notes || "",
    date: ticket.date ? ticket.date.slice(0, 10) : "",
    lvYard: ticket.lvYard || ticket.lv_yard || "",
    arrivalTime: ticket.arrivalTime || ticket.arrival_time || "",
    dueOnLoc: ticket.dueOnLoc || ticket.due_on_loc || "",
    jobStartTime: ticket.jobStartTime || ticket.job_start_time || "",
    jobEndTime: ticket.jobEndTime || ticket.job_end_time || "",
    retYard: ticket.retYard || ticket.ret_yard || "",
    timeZone: ticket.timeZone || ticket.time_zone || "",
    mileageBegin: String(ticket.mileageBegin ?? ticket.mileage_begin ?? ""),
    mileageEnd: String(ticket.mileageEnd ?? ticket.mileage_end ?? ""),
    ticketPin: ticket.googlePin || ticket.google_pin || "",
  });
  const isDirty = () => {
    if (sigWiped || isEditing) return true;
    if (notes !== origRef.current.notes) return true;
    if (ticketDate !== origRef.current.date) return true;
    if (normalizeLI(lineItems) !== origRef.current.lineItems) return true;
    if (lvYard !== origRef.current.lvYard) return true;
    if (arrivalTime !== origRef.current.arrivalTime) return true;
    if (dueOnLoc !== origRef.current.dueOnLoc) return true;
    if (jobStartTime !== origRef.current.jobStartTime) return true;
    if (jobEndTime !== origRef.current.jobEndTime) return true;
    if (retYard !== origRef.current.retYard) return true;
    if (timeZone !== origRef.current.timeZone) return true;
    if (String(mileageBegin) !== origRef.current.mileageBegin) return true;
    if (String(mileageEnd) !== origRef.current.mileageEnd) return true;
    if (ticketPin !== origRef.current.ticketPin) return true;
    return false;
  };
  const [showSigPad, setShowSigPad] = useState(() => openToSign && !["sentToQB", "qbVerified", "signed", "sigNotReq", "approved"].includes(ticket.status));
  const [showSigOptions, setShowSigOptions] = useState(false);
  // Comment-thread state (tdComments, tdReply, tdSending, tdLoading) moved into
  // TicketCommentThread (v27.75). Parent no longer owns any of it.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  // voidReason / voidReasonNote state moved into TicketVoidModal (v27.71) —
  // no parent ownership needed; reset happens naturally on modal close.
  const [showJSA, setShowJSA] = useState(false);
  const [existingJSA, setExistingJSA] = useState(null);
  const [jsaLoaded, setJsaLoaded] = useState(false);

  // Load JSA for this ticket
  useEffect(() => {
    if (!ticket.id) return;
    fetch(`${API_URL}/jsas/ticket/${ticket.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setExistingJSA({
            ...data,
            wellName: data.well_name,
            designatedDriver: data.designated_driver,
            lat: data.latitude,
            lng: data.longitude,
            ppe: { frClothing: data.ppe_fr_clothing, toolsTrained: data.ppe_tools_trained, confinedSpace: data.ppe_confined_space },
            signatures: (data.signatures || []).map(s => s.name || s),
            additionalSteps: (data.additional_steps || []).map(s => ({ step: s.step, hazard: s.hazard, procedure: s.procedure })),
          });
        }
        setJsaLoaded(true);
      })
      .catch(() => setJsaLoaded(true));
  }, [ticket.id]);

  // Load comments when ticket opens + poll every 30s
  // Auto-fetch drive distance from yard if pin coords available.
  // Re-runs when the selected yard changes so the distance/time follow the dropdown.
  useEffect(() => {
    const lat = ticketPinLat || job?.pinLat || job?.pin_lat;
    const lng = ticketPinLng || job?.pinLng || job?.pin_lng;
    if (!lat || !lng) return;
    setDriveLoading(true);
    fetch(`${API_URL}/jobs/drive-distance`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destLat: lat, destLng: lng, yard_index: yardLocationIndex }),
    })
      .then(r => r.ok ? r.json() : { error: "Could not calculate" })
      .then(d => setDriveInfo(d))
      .catch(() => setDriveInfo({ error: "Network error" }))
      .finally(() => setDriveLoading(false));
  }, [ticket.id, yardLocationIndex]);

  // Signature status polling — comment loading moved to TicketCommentThread
  // (v27.75). This effect now only polls for signature arrival when the
  // ticket is emailed-but-unsigned; updates local display when it lands.
  useEffect(() => {
    if (!ticket.id) return;
    const checkSignatureStatus = () => {
      if (status !== "emailed" || signedBy) return;
      fetch(`${API_URL}/tickets?job_id=${ticket.jobId}&include_voided=true`)
        .then(r => r.ok ? r.json() : [])
        .then(data => {
          const updated = data.find(t => t.id === ticket.id);
          if (updated && updated.signature_img && !signedBy) {
            setSignedBy(updated.signed_by);
            setSignedAt(updated.signed_at);
            setSignatureImage(updated.signature_img);
            setStatus("signed");
          }
        })
        .catch(() => {});
    };
    const interval = setInterval(checkSignatureStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, status, signedBy]);

  const handleClose = () => {
    editLock.releaseLock();
    if (isDirty() && !isFullyLocked && !ticket.voidedAt) save();
    onClose();
  };

  const job = (jobs || []).find(j => j.id === ticket.jobId);
  const tcfg = TICKET_TYPES[ticket.type] || { color: C.muted, label: ticket.type || "Unknown" };
  const total = lineItems.reduce((s, li) => s + calcLineTotal(li), 0);
  const isLocked = !isEditing && ["signed", "sigNotReq", "approved", "sentToQB", "qbVerified", "voided"].includes(status);
  const isFullyLocked = status === "qbVerified" || status === "sentToQB";
  const isVoided = !!ticket.voidedAt;

  // Edit lock — pessimistic locking for concurrent access
  const editLock = useEditLock("tickets", ticket.id, currentUser, () => save());
  const editable = !isFullyLocked && !isVoided && editLock.hasLock;
  const canApprove = ["owner", "admin", "manager", "lead"].includes(currentUser?.role);

  // Auto-save site manager as customer contact (upsert — backend deduplicates)
  const saveSiteMgrAsContact = () => {
    const custId = job?.customerId || job?.customer_id;
    const fullName = [siteMgrFirst, siteMgrLast].filter(Boolean).join(" ").trim();
    if (!fullName || !custId) return;
    fetch(`${API_URL}/customers/${custId}/contacts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, phone: siteMgrPhone || null, email: siteMgrEmail || null, role_tag: "site_manager" }),
    }).catch(() => {});
  };

  const save = (overrides = {}) => {
    if (!editable && !overrides.status) return; // Don't save if ticket is locked and no status override
    saveSiteMgrAsContact();
    const updates = {
      lineItems, notes, status, missingPieces, date: ticketDate,
      sigNotReqReason, sigNotReqNote, emailTo: emailTo.filter(e => e.trim()).join(", "), emailCc,
      signedBy, signedAt, signatureImage,
      siteMgrFirst, siteMgrLast, siteMgrPhone, siteMgrEmail,
      yardLocationIndex,
      ...(ticket.type === "Rental" ? { startDate: rentalStartDate, endDate: rentalEndDate, cycleDays: parseInt(rentalCycleDays) || 28, isRecurring: rentalRecurring, googlePin: ticketPin || null, pinLat: ticketPinLat || null, pinLng: ticketPinLng || null } : {}),
      ...(!["Rental", "JSA"].includes(ticket.type) ? {
        lvYard, arrivalTime, dueOnLoc, jobStartTime, jobEndTime, retYard, timeZone,
        mileageBegin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
        mileageEnd: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
        googlePin: ticketPin || null,
        pinLat: ticketPinLat || null,
        pinLng: ticketPinLng || null,
      } : {}),
      ...overrides,
    };
    onUpdate(ticket.id, updates);
  };

  // Date change wipes signature (same as line item changes)
  const handleDateChange = (newDate) => {
    setTicketDate(newDate);
    if (signedBy && newDate !== (ticket.date || "").slice(0, 10)) {
      handleSigWipe();
    }
  };

  const handleSigWipe = () => {
    if (!signedBy && !signatureImage) return; // Nothing to wipe
    setSigWiped(true);
    setSignedBy(null);
    setSignedAt(null);
    setSignatureImage(null);
    // If ticket was approved, revert approval
    if (["approved", "sentToQB"].includes(status)) {
      setStatus("inField");
    }
  };

  const handleSign = ({ name, date, imageData }) => {
    // Update local state
    setSignedBy(name);
    setSignedAt(date);
    setSignatureImage(imageData);
    setStatus("signed");
    setSigWiped(false);
    setShowSigPad(false);
    setIsEditing(false);
    // Save to DB
    save({ signedBy: name, signedAt: date, signatureImage: imageData, status: "signed", sigNotReqReason: null, sigNotReqNote: "" });
  };

  const handleCancel = () => {
    setLineItems([...(ticket.lineItems || [])]);
    setNotes(ticket.notes || "");
    setStatus(ticket.status);
    setSignedBy(ticket.signedBy || null);
    setSignedAt(ticket.signedAt || null);
    setSignatureImage(ticket.signatureImage || null);
    setSigWiped(false);
    setIsEditing(false);
    setShowSigPad(false);
    setShowSigOptions(false);
    onClose();
  };

  const handleSave = () => {
    if (sigWiped) {
      save({ signedBy: null, signedAt: null, signatureImage: null, status: "inField" });
      setStatus("inField");
    } else {
      save();
    }
    setIsEditing(false);
    setSigWiped(false);
    onClose();
  };

  const handleSigNotRequired = () => {
    if (!sigNotReqReason) return;
    if (signedBy) return; // Don't allow if already signed
    setStatus("sigNotReq");
    setShowSigOptions(false);
    save({ status: "sigNotReq", sigNotReqReason, sigNotReqNote, signedBy: null, signedAt: null, signatureImage: null });
  };

  const handleApprove = () => {
    setStatus("approved");
    save({ status: "approved", approvedBy: currentUser?.name, approvedAt: new Date().toISOString() });
  };

  const isPageMode = asPage || isMobile;

  return (
    <div
      style={isPageMode
        ? { background: tcfg.bg, borderTop: `4px solid ${tcfg.color}`, minHeight: "100vh" }
        : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isPageMode ? undefined : handleClose}
    >
      <div
        style={isPageMode
          ? { maxWidth: 820, margin: "0 auto" }
          : { background: tcfg.bg, border: `1px solid ${C.border}`, borderTop: `4px solid ${tcfg.color}`, borderRadius: 8, width: 820, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }
        }
        onClick={isPageMode ? undefined : e => e.stopPropagation()}
      >
        {/* Ticket type header bar */}
        <div style={{ background: tcfg.color, padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "0.1em" }}>{tcfg.label || ticket.type?.toUpperCase()}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em" }}>TICKET DETAIL</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.25)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}>CLOSE</button>
        </div>
        {/* Edit lock banner + edit-request notification — extracted to TicketEditLockBanner (v27.81) */}
        <TicketEditLockBanner editLock={editLock} currentUserRole={currentUser?.role} />
        {/* JSA bar — extracted to TicketJsaBar (v27.82). Single component handles
            both non-Rental (required) and Rental (optional) variants via ticket.type. */}
        <TicketJsaBar ticket={ticket} jsaLoaded={jsaLoaded} existingJSA={existingJSA} onOpen={() => setShowJSA(true)} />

        {/* Header row — extracted to TicketHeaderRow (v27.83) */}
        <TicketHeaderRow
          ticket={ticket} status={status} total={total}
          isLocked={isLocked} isFullyLocked={isFullyLocked} editable={editable}
          job={job} isPageMode={isPageMode}
          ticketDate={ticketDate} onDateChange={handleDateChange}
          dueOnLoc={dueOnLoc} setDueOnLoc={setDueOnLoc}
          timeZone={timeZone} setTimeZone={setTimeZone}
          yardLocationIndex={yardLocationIndex} setYardLocationIndex={setYardLocationIndex}
          yardsList={yardsList}
        />

        {/* Job / Customer Info — read only */}
        {job && (
          <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>WORK ORDER INFO — <span style={{ color: C.muted, fontWeight: 400 }}>To update, go to Active Work Orders → Details → Edit Work Order</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 24px", fontSize: 12 }}>
              <span><span style={{ color: C.muted }}>Customer: </span><strong>{job.customer}</strong></span>
              {job.jobState && <span><span style={{ color: C.muted }}>State: </span><strong>{job.jobState}</strong></span>}
              {job.county && <span><span style={{ color: C.muted }}>County: </span><strong>{job.county}</strong></span>}
              {job.wells?.length > 0 && (
                <span>
                  <span style={{ color: C.muted }}>Wells: </span>
                  <strong>
                    {ticket.assignedWells?.length > 0
                      ? ticket.assignedWells.join(", ")
                      : job.wells.map(w => w.well_name || w).join(", ")}
                  </strong>
                  {ticket.assignedWells?.length > 0 && ticket.assignedWells.length < job.wells.length && (
                    <span style={{ color: C.muted, fontSize: 10 }}> ({ticket.assignedWells.length} of {job.wells.length})</span>
                  )}
                </span>
              )}
              {job.afe && <span><span style={{ color: C.muted }}>AFE: </span><strong>{job.afe}</strong></span>}
              {job.companyCode && <span><span style={{ color: C.muted }}>Co. Code: </span><strong>{job.companyCode}</strong></span>}
              {job.costCenter && <span><span style={{ color: C.muted }}>Cost Center: </span><strong>{job.costCenter}</strong></span>}
              {job.po && <span><span style={{ color: C.muted }}>PO: </span><strong>{job.po}</strong></span>}
              {(job.contactFirst || job.contactLast) && <span><span style={{ color: C.muted }}>Point of Contact: </span><strong>{[job.contactFirst, job.contactLast].filter(Boolean).join(" ")}</strong></span>}
            </div>
          </div>
        )}

        {/* Site Manager — extracted to TicketSiteManager (v27.76) */}
        <TicketSiteManager
          editable={editable}
          values={{ first: siteMgrFirst, last: siteMgrLast, phone: siteMgrPhone, email: siteMgrEmail }}
          onChange={(partial) => {
            if (partial.first !== undefined) setSiteMgrFirst(partial.first);
            if (partial.last !== undefined) setSiteMgrLast(partial.last);
            if (partial.phone !== undefined) setSiteMgrPhone(partial.phone);
            if (partial.email !== undefined) setSiteMgrEmail(partial.email);
          }}
          job={job}
          knownContacts={knownContacts}
        />

        {/* Time & Mileage — extracted to TicketTimeAndMileage (v27.78) */}
        {!['Rental'].includes(ticket.type) && (
          <TicketTimeAndMileage
            editable={editable}
            values={{
              lvYard, arrivalTime, jobStartTime, jobEndTime, retYard,
              timeZone, mileageBegin, mileageEnd, dueOnLoc,
            }}
            onChange={(partial) => {
              if (partial.lvYard !== undefined) setLvYard(partial.lvYard);
              if (partial.arrivalTime !== undefined) setArrivalTime(partial.arrivalTime);
              if (partial.jobStartTime !== undefined) setJobStartTime(partial.jobStartTime);
              if (partial.jobEndTime !== undefined) setJobEndTime(partial.jobEndTime);
              if (partial.retYard !== undefined) setRetYard(partial.retYard);
              if (partial.mileageBegin !== undefined) setMileageBegin(partial.mileageBegin);
              if (partial.mileageEnd !== undefined) setMileageEnd(partial.mileageEnd);
            }}
            driveInfo={driveInfo}
          />
        )}

        {/* Rental cycle — extracted to TicketRentalCycle (v27.79) */}
        <TicketRentalCycle
          ticket={ticket}
          readOnly={isFullyLocked || !!ticket.voidedAt}
          values={{ startDate: rentalStartDate, endDate: rentalEndDate, cycleDays: rentalCycleDays, recurring: rentalRecurring }}
          onChange={(partial) => {
            if (partial.startDate !== undefined) setRentalStartDate(partial.startDate);
            if (partial.endDate !== undefined) setRentalEndDate(partial.endDate);
            if (partial.cycleDays !== undefined) setRentalCycleDays(partial.cycleDays);
            if (partial.recurring !== undefined) setRentalRecurring(partial.recurring);
          }}
        />

        {/* Google Pin — extracted to TicketGooglePin (v27.77) */}
        <TicketGooglePin
          editable={editable}
          values={{ pin: ticketPin, lat: ticketPinLat, lng: ticketPinLng }}
          onChange={(partial) => {
            if (partial.pin !== undefined) setTicketPin(partial.pin);
            if (partial.lat !== undefined) setTicketPinLat(partial.lat);
            if (partial.lng !== undefined) setTicketPinLng(partial.lng);
          }}
          job={job}
          driveInfo={driveInfo}
          driveLoading={driveLoading}
          onCalcDrive={async () => {
            if (!ticketPinLat || !ticketPinLng) return;
            setDriveLoading(true);
            try {
              const r = await fetch(`${API_URL}/jobs/drive-distance`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destLat: ticketPinLat, destLng: ticketPinLng, yard_index: yardLocationIndex }),
              });
              if (r.ok) { const d = await r.json(); setDriveInfo(d); }
              else setDriveInfo({ error: "Could not calculate — check yard location in Settings" });
            } catch { setDriveInfo({ error: "Network error" }); }
            setDriveLoading(false);
          }}
        />

        {/* Body */}
        <div style={{ padding: "16px 24px" }}>

          {/* Voided banner */}
          {ticket.voidedAt && (
            <div style={{ background: "#fdecea", border: `1px solid ${C.red}44`, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.red }}>
              VOIDED{ticket._replacedByLabel ? ` — Replaced by #${ticket._replacedByLabel}` : ""}
            </div>
          )}

          {/* Revision banner */}
          {ticket.revisionOf && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: C.blue }}>
              Revision of #{ticket._revisionOfLabel || "previous ticket"}
            </div>
          )}

          {/* Duplicate reminder */}
          {ticket._duplicateReminder && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: C.blue }}>
              This ticket was duplicated. Please update the date and review before saving.
            </div>
          )}

          {/* Awaiting signature banner */}
          {status === "emailed" && !signedBy && (
            <div style={{ background: "#f3eafa", border: "1px solid #7a3ca044", borderRadius: 4, padding: "10px 14px", marginBottom: 12, fontSize: 13, fontWeight: 700, color: "#7a3ca0", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#7a3ca0", animation: "pulse 2s infinite" }} />
              Emailed for signature — awaiting response
              {ticket.emailedAt && <span style={{ fontWeight: 400, fontSize: 12, marginLeft: "auto" }}>Sent {new Date(ticket.emailedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
            </div>
          )}

          {/* Edit warning */}
          {isEditing && !sigWiped && signedBy && (
            <div style={{ background: "#fdf5d8", border: "1px solid #e6c200", borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: "#8a6500" }}>
              ⚠ Editing signed ticket — changing line items, rate, or qty will require a new signature.
            </div>
          )}
          {sigWiped && (
            <div style={{ background: "#fdecea", border: `1px solid ${C.red}44`, borderRadius: 4, padding: "8px 12px", marginBottom: 12, fontSize: 12, fontWeight: 700, color: C.red }}>
              ⚠ Line items changed — signature cleared. Customer must re-sign before saving.
            </div>
          )}

          {/* Missing pieces (RD only) */}
          {ticket.type === "Rig Down" && (
            <div style={{ background: "#fdf5d8", border: "1px solid #e6c200", borderRadius: 6, padding: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>Check quantities against R/U — any pieces missing? </span>
              {!isLocked ? (
                <>
                  <span onClick={() => setMissingPieces(false)} style={{ cursor: "pointer", fontWeight: 700, color: missingPieces === false ? C.green : C.muted, marginLeft: 8 }}>NO</span>
                  <span style={{ color: C.muted, margin: "0 6px" }}>|</span>
                  <span onClick={() => setMissingPieces(true)} style={{ cursor: "pointer", fontWeight: 700, color: missingPieces === true ? C.red : C.muted }}>YES</span>
                </>
              ) : (
                <span style={{ fontWeight: 700, color: missingPieces ? C.red : C.green, marginLeft: 8 }}>{missingPieces ? "YES" : "NO"}</span>
              )}
            </div>
          )}

          {/* Line items */}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
          {!isLocked ? (
            <LineItemEditor lineItems={lineItems} setLineItems={setLineItems} ticketType={ticket.type} qbItems={qbItems} onSigWipe={handleSigWipe} jobId={ticket.jobId} />
          ) : (
            <ReadOnlyLineItems lineItems={lineItems} ticketType={ticket.type} total={total} />
          )}

          {/* Notes */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
            {!isFullyLocked ? (
              <textarea style={{ ...inputStyle, width: "100%", minHeight: 60, resize: "vertical", boxSizing: "border-box" }}
                value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes..." />
            ) : (
              <div style={{ fontSize: 12, color: C.text, padding: "8px 0" }}>{notes || "—"}</div>
            )}
          </div>

          {/* Photos */}
          <PhotoStrip ticketId={ticket.id} isLocked={isFullyLocked || !!ticket.voidedAt} />

          {/* JSA button moved to header bar */}

          {/* Signature flow — extracted to TicketSignatureFlow (v27.84) */}
          <TicketSignatureFlow
            status={status}
            signedBy={signedBy} signedAt={signedAt} signatureImage={signatureImage}
            sigNotReqReason={sigNotReqReason} sigNotReqNote={sigNotReqNote}
            showSigOptions={showSigOptions}
            setSigNotReqReason={setSigNotReqReason} setSigNotReqNote={setSigNotReqNote}
            onConfirmSigNotRequired={handleSigNotRequired}
            onCancelSigOptions={() => setShowSigOptions(false)}
            showSigPad={showSigPad}
            onSign={handleSign}
            onCancelSigPad={() => setShowSigPad(false)}
          />

          {/* Comment Thread — extracted to TicketCommentThread (v27.75) */}
          <TicketCommentThread
            ticket={ticket}
            onPendingCleared={(id) => { if (onUpdate) onUpdate(id, { hasPendingComment: false, has_pending_comment: false }); }}
          />

        </div>

        {/* Footer — extracted to TicketActionBar (v27.80) */}
        <TicketActionBar
          ticket={ticket}
          status={status}
          isLocked={isLocked} isFullyLocked={isFullyLocked} isEditing={isEditing}
          sigWiped={sigWiped} signedBy={signedBy}
          existingJSA={existingJSA} jsaLoaded={jsaLoaded}
          canApprove={canApprove}
          showSigPad={showSigPad} showSigOptions={showSigOptions}
          handleSave={handleSave} handleClose={handleClose}
          handleCancel={handleCancel} handleApprove={handleApprove}
          onClose={onClose}
          setIsEditing={setIsEditing}
          setShowSigPad={setShowSigPad} setShowSigOptions={setShowSigOptions}
          setShowJSA={setShowJSA}
          setShowVoidConfirm={setShowVoidConfirm}
          setShowDupModal={setShowDupModal}
          setShowDeleteConfirm={setShowDeleteConfirm}
          onRevise={onRevise} onDuplicate={onDuplicate} onDelete={onDelete}
        />

        {/* Delete confirmation — extracted to TicketDeleteModal (v27.70) */}
        {showDeleteConfirm && (
          <TicketDeleteModal
            ticket={ticket}
            onClose={() => setShowDeleteConfirm(false)}
            onDeleted={onDelete}
          />
        )}

        {/* Void confirmation — extracted to TicketVoidModal (v27.71) */}
        {showVoidConfirm && (
          <TicketVoidModal
            ticket={ticket}
            onClose={() => setShowVoidConfirm(false)}
            onRevise={onRevise}
          />
        )}

        {/* JSA Modal */}
        {showJSA && job && (
          <JSAModal
            job={job}
            ticket={{ ...ticket, date: ticketDate, pinLat: ticketPinLat || ticket.pinLat, pinLng: ticketPinLng || ticket.pinLng, googlePin: ticketPin || ticket.googlePin }}
            existingJSA={existingJSA}
            onClose={() => setShowJSA(false)}
            onSave={async (jsaData) => {
              try {
                const endpoint = ticket.id
                  ? `${API_URL}/jsas/ticket/${ticket.id}`
                  : `${API_URL}/jsas/${job.id}`;
                await fetch(endpoint, {
                  method: "PUT", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    job_id: job.id,
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
                setExistingJSA(jsaData);
                // Update parent ticket state so JSA badge on ticket row refreshes
                if (onUpdate) onUpdate(ticket.id, { hasJSA: true, has_jsa: true });
              } catch (err) { console.error("JSA save failed:", err); }
            }}
          />
        )}

        {/* Duplicate Options Modal — extracted to TicketDuplicateModal (v27.72) */}
        {showDupModal && (
          <TicketDuplicateModal
            ticket={ticket}
            jobs={jobs}
            tickets={tickets}
            onClose={() => setShowDupModal(false)}
            onDuplicate={onDuplicate}
          />
        )}

      </div>
    </div>
  );
}


export default TicketDetail;
export { RentalCountdown };
