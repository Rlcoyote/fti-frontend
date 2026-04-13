import { useState, useEffect, useRef, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { today, formatDate, formatShortStamp, shortName, calcLineTotal, buildTicketPayload, mapTicketFromApi, parseYards } from "./utils.js";
import { Btn, FilterBtn, inputStyle, labelStyle, TicketTypeBadge, TicketStatusBadge, TICKET_TYPES } from "./SharedUI.jsx";
import useEditLock from "./useEditLock.js";
import TimePicker from "./TimePicker.jsx";
import { PhotoStrip } from "./PhotoStrip.jsx";
import SignaturePad from "./SignaturePad.jsx";
import LineItemEditor from "./LineItemEditor.jsx";
import ReadOnlyLineItems from "./ReadOnlyLineItems.jsx";
import JSAModal from "./JSAModal.jsx";
import { useApp } from "./AppContext.jsx";

function RentalCountdown({ ticket }) {
  const endDate = ticket.endDate || ticket.end_date;
  if (!endDate || endDate === "" || ticket.type !== "Rental") return null;
  if (ticket.cycleEnded || ticket.cycle_ended || ticket.voidedAt || ticket.voided_at) return null;
  const end = new Date(endDate + "T23:59:59");
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  const diffMs = end - now;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft < 0 || isNaN(daysLeft)) return null;
  const color = daysLeft <= 1 ? "#B01020" : daysLeft <= 7 ? "#8a6500" : "#1a7a3c";
  const bg = daysLeft <= 1 ? "#fdecea" : daysLeft <= 7 ? "#fdf5d8" : "#e6f5ec";
  const border = daysLeft <= 1 ? "#B0102044" : daysLeft <= 7 ? "#e6c20044" : "#1a7a3c44";
  const label = daysLeft === 0 ? "Last day" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
  return (
    <span style={{ background: bg, color, borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: `1px solid ${border}`, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function TicketDetail({ ticket, onUpdate, onClose, onDelete, onDuplicate, onRevise, jobs, openToSign = false, asPage = false }) {
  const { qbItems, currentUser, settings } = useApp();
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
  const [ticketPinResolving, setTicketPinResolving] = useState(false);
  const [ticketPinError, setTicketPinError] = useState("");
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
  const [showQBConfirm, setShowQBConfirm] = useState(false);
  const [showUnsavedClose, setShowUnsavedClose] = useState(false);
  const [tdComments, setTdComments] = useState([]);
  const [tdReply, setTdReply] = useState("");
  const [tdSending, setTdSending] = useState(false);
  const [tdLoading, setTdLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
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

  useEffect(() => {
    if (!ticket.id) return;
    const loadComments = () => {
      fetch(`${API_URL}/signature/comments/${ticket.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => { setTdComments(data); setTdLoading(false); })
        .catch(() => setTdLoading(false));
    };
    const checkSignatureStatus = () => {
      // Only poll if ticket is emailed and unsigned
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
            if (onUpdate) onUpdate(ticket.id, { signedBy: updated.signed_by, signedAt: updated.signed_at, signatureImage: updated.signature_img, status: "signed" });
          }
        })
        .catch(() => {});
    };
    setTdLoading(true);
    loadComments();
    // Clear pending flag when ticket is opened
    if (ticket.hasPendingComment || ticket.has_pending_comment) {
      fetch(`${API_URL}/tickets/${ticket.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ has_pending_comment: false }),
      }).catch(() => {});
      if (onUpdate) onUpdate(ticket.id, { hasPendingComment: false, has_pending_comment: false });
    }
    const interval = setInterval(() => { loadComments(); checkSignatureStatus(); }, 30000);
    return () => clearInterval(interval);
  }, [ticket.id]);

  const handleClose = () => {
    if (isFullyLocked || ticket.voidedAt) { editLock.releaseLock(); onClose(); return; }
    if (isDirty()) { setShowUnsavedClose(true); return; }
    editLock.releaseLock();
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

  const handleSendToQB = () => {
    setStatus("sentToQB");
    save({ status: "sentToQB", sentToQBAt: new Date().toISOString() });
  };

  const handleEmailTicket = async () => {
    if (!emailTo.some(e => e.trim())) return;
    const emailToStr = emailTo.filter(e => e.trim()).join(", ");
    try {
      // Save emailTo first
      await save({ emailTo: emailToStr, emailCc });
      const r = await fetch(`${API_URL}/signature/send/${ticket.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ performed_by: currentUser?.name }),
      });
      if (!r.ok) { const d = await r.json(); alert(d.error || "Email failed"); return; }
      setStatus("emailed");
      save({ status: "emailed", emailTo: emailToStr, emailCc, emailedAt: new Date().toISOString() });
    } catch (err) { alert("Email send failed: " + err.message); }
  };

  const isPageMode = asPage || isMobile;

  return (
    <div
      style={isPageMode
        ? { background: C.cardBg, borderTop: `4px solid ${tcfg.color}`, minHeight: "100vh" }
        : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isPageMode ? undefined : handleClose}
    >
      <div
        style={isPageMode
          ? { maxWidth: 820, margin: "0 auto" }
          : { background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${tcfg.color}`, borderRadius: 8, width: 820, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }
        }
        onClick={isPageMode ? undefined : e => e.stopPropagation()}
      >
        {/* Back button — page mode only */}
        {isPageMode && (
          <div style={{ padding: "12px 24px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: C.muted, cursor: "pointer" }}>← BACK</button>
          </div>
        )}
        {/* Edit Lock Banner */}
        {editLock.isLocked && !editLock.hasLock && (
          <div style={{ background: "#fdf5d8", borderBottom: `1px solid #e6c20044`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#8a6500" }}>
              This ticket is being edited by <strong>{editLock.lockedByName}</strong>. As soon as they are done, you may edit.
            </div>
            <button onClick={editLock.requestEdit} style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "5px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>REQUEST EDIT</button>
          </div>
        )}
        {/* Edit Request Notification (shown to lock holder) */}
        {editLock.hasLock && editLock.requestedByName && (
          <div style={{ background: "#e8f0fb", borderBottom: `1px solid ${C.blue}33`, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>
              <strong>{editLock.requestedByName}</strong> is requesting access to this ticket.
            </div>
            <button onClick={editLock.dismissRequest} style={{ background: "transparent", border: `1px solid ${C.blue}44`, color: C.blue, borderRadius: 4, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>THE CURRENT USER WILL BE FINISHED SHORTLY</button>
          </div>
        )}
        {/* Header — mobile: single-column vertical stack. Desktop: side-by-side with total right-aligned */}
        <div style={{ padding: isPageMode ? "14px 16px 12px" : "20px 24px 16px", borderBottom: `1px solid ${C.border}` }}>
          {/* Row 1: badges + ticket number */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <TicketTypeBadge type={ticket.type} />
            <TicketStatusBadge status={status} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>#{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}</span>
            {isLocked && <span style={{ fontSize: 10, fontWeight: 700, color: isFullyLocked ? C.green : C.orange, background: isFullyLocked ? "#d4edda" : "#fdf5d8", padding: "2px 8px", borderRadius: 3 }}>{isFullyLocked ? "QB VERIFIED" : "LOCKED"}</span>}
          </div>
          {/* Row 2: total + created by */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: isPageMode ? 18 : 20, fontWeight: 800, color: C.text }}>{'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            {ticket.createdBy && <span style={{ fontSize: 9, color: "#a0aec8" }}>{shortName(ticket.createdBy)} · {formatShortStamp(ticket.createdAt)}</span>}
          </div>
          {/* Row 3: customer + date */}
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
            <span>{job?.customer || "Unknown"} · {isLocked
              ? formatDate(ticketDate)
              : <input type="date" value={ticketDate} onChange={e => handleDateChange(e.target.value)}
                  style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }} />
            }</span>
          </div>
          {/* Row 4: Location Time + Time Zone + Yard — each on own line on mobile */}
          {ticket.type !== "Rental" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 12, color: C.muted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>LOCATION TIME:</span>
                {editable
                  ? <TimePicker value={dueOnLoc} onChange={setDueOnLoc} startHour={6} startPeriod="AM" />
                  : <span style={{ fontWeight: 600 }}>{dueOnLoc || "—"}</span>
                }
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>TIME ZONE:</span>
                {editable
                  ? <span style={{ display: "flex", gap: 6 }}>
                      {["TX", "NM"].map(tz => (
                        <span key={tz} onClick={() => setTimeZone(tz)} style={{ display: "flex", alignItems: "center", gap: 3, cursor: "pointer", fontSize: 12, fontWeight: 700, color: timeZone === tz ? C.red : C.muted }}>
                          <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${timeZone === tz ? C.red : C.border}`, background: timeZone === tz ? C.red : "transparent", display: "inline-block" }} />
                          {tz}
                        </span>
                      ))}
                    </span>
                  : <span style={{ fontWeight: 600 }}>{timeZone || "—"}</span>
                }
              </span>
              {yardsList.length > 1 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>YARD:</span>
                  <select value={yardLocationIndex} onChange={e => setYardLocationIndex(parseInt(e.target.value, 10))}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg, fontWeight: 600, maxWidth: isPageMode ? 200 : "none" }}>
                    {yardsList.map((y, i) => <option key={i} value={i + 1}>{y.name || `Yard #${i + 1}`}</option>)}
                  </select>
                </span>
              )}
            </div>
          )}
        </div>

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

        {/* Site Manager — ticket level */}
        <div style={{ background: C.cardBg, borderBottom: `1px solid ${C.border}`, padding: "12px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>SITE MANAGER</div>
            {editable && job && (job.contactFirst || job.contactLast) && (
              <span onClick={() => {
                setSiteMgrFirst(job.contactFirst || "");
                setSiteMgrLast(job.contactLast || "");
                setSiteMgrPhone(job.pocPhone || job.poc_phone || "");
                setSiteMgrEmail(job.pocEmail || job.poc_email || "");
              }} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: C.blue, fontWeight: 700, cursor: "pointer", padding: "3px 10px", border: `1px solid ${C.blue}44`, borderRadius: 4, background: "transparent" }}>
                <span style={{ fontSize: 13 }}>📋</span> Copy Point of Contact Info
              </span>
            )}
          </div>
          {editable && knownContacts.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.blue, letterSpacing: "0.08em", marginBottom: 4 }}>KNOWN CONTACTS</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {knownContacts.filter(c => c.role_tag === "site_manager" || c.role_tag === "poc").map(c => (
                  <button key={c.id} type="button" onClick={() => {
                    const parts = c.name.split(" ");
                    setSiteMgrFirst(parts[0] || "");
                    setSiteMgrLast(parts.slice(1).join(" ") || "");
                    setSiteMgrPhone(c.phone || "");
                    setSiteMgrEmail(c.email || "");
                  }} style={{
                    background: "transparent", border: `1px solid ${C.blue}44`, borderRadius: 4,
                    padding: "3px 8px", fontSize: 10, fontWeight: 600, color: C.text, cursor: "pointer",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#e8f0fb"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    {c.name} <span style={{ color: C.muted, fontSize: 8 }}>{c.role_tag?.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            <div>
              <label style={labelStyle}>FIRST NAME</label>
              {editable
                ? <input style={inputStyle} value={siteMgrFirst} onChange={e => setSiteMgrFirst(e.target.value)} placeholder="First" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrFirst || "—"}</div>
              }
            </div>
            <div>
              <label style={labelStyle}>LAST NAME</label>
              {editable
                ? <input style={inputStyle} value={siteMgrLast} onChange={e => setSiteMgrLast(e.target.value)} placeholder="Last" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrLast || "—"}</div>
              }
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              {editable
                ? <input style={inputStyle} value={siteMgrPhone} onChange={e => setSiteMgrPhone(e.target.value)} placeholder="555-555-5555" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrPhone || "—"}</div>
              }
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              {editable
                ? <input style={inputStyle} value={siteMgrEmail} onChange={e => setSiteMgrEmail(e.target.value)} placeholder="email@company.com" />
                : <div style={{ fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" }}>{siteMgrEmail || "—"}</div>
              }
            </div>
          </div>
        </div>

        {/* Time & Mileage band — below job info, all types except Rental */}
        {!["Rental"].includes(ticket.type) && (() => {
          const parseT = (s) => {
            if (!s) return null;
            const match = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (!match) return null;
            let h = parseInt(match[1]), min = parseInt(match[2]);
            const p = match[3].toUpperCase();
            if (p === "PM" && h !== 12) h += 12;
            if (p === "AM" && h === 12) h = 0;
            return h * 60 + min;
          };
          const fmtDiff = (a, b) => {
            if (a === null || b === null) return null;
            let d = b - a; if (d < 0) d += 1440;
            return `${Math.floor(d / 60)}h ${d % 60}m`;
          };
          const tLv = parseT(lvYard), tArr = parseT(arrivalTime), tJe = parseT(jobEndTime), tRy = parseT(retYard);
          const overall = fmtDiff(tLv, tRy);
          const onLoc = fmtDiff(tArr, tJe);
          let driveTime = null;
          if (tLv !== null && tArr !== null && tJe !== null && tRy !== null) {
            let d1 = tArr - tLv; if (d1 < 0) d1 += 1440;
            let d2 = tRy - tJe; if (d2 < 0) d2 += 1440;
            const tot = d1 + d2;
            driveTime = `${Math.floor(tot / 60)}h ${tot % 60}m`;
          }
          const totalMiles = (mileageBegin !== "" && mileageEnd !== "" && mileageBegin != null && mileageEnd != null)
            ? Math.max(0, parseFloat(mileageEnd) - parseFloat(mileageBegin)) : null;
          const selStyle = { border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 };
          const roStyle = { fontSize: 12, color: C.text, fontWeight: 600, padding: "3px 0" };
          const lblStyle = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };
          const totalStyle = { fontSize: 12, fontWeight: 700, color: C.text };
          const totalSubStyle = { fontSize: 10, color: C.muted, marginTop: 1 };
          return (
            <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>TIME &amp; MILEAGE</div>
              {/* Time fields */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end", marginBottom: 8 }}>
                {[
                  { label: "LV YARD", val: lvYard, set: setLvYard, startHour: 6, startPeriod: "AM" },
                  { label: "ARRIVAL", val: arrivalTime, set: setArrivalTime, startHour: 6, startPeriod: "AM" },
                  { label: "JOB START", val: jobStartTime, set: setJobStartTime, startHour: 6, startPeriod: "AM" },
                  { label: "JOB END", val: jobEndTime, set: setJobEndTime, startHour: 12, startPeriod: "PM" },
                  { label: "RET YARD", val: retYard, set: setRetYard, startHour: 12, startPeriod: "PM" },
                ].map(({ label, val, set, startHour, startPeriod }) => (
                  <div key={label}>
                    <div style={lblStyle}>{label}</div>
                    {editable
                      ? <TimePicker value={val} onChange={set} startHour={startHour} startPeriod={startPeriod} />
                      : <div style={roStyle}>{val || "—"}</div>}
                  </div>
                ))}
                <div>
                  <div style={lblStyle}>TIME ZONE</div>
                  <div style={roStyle}>{timeZone || "—"}</div>
                </div>
              </div>
              {/* Totals */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", borderTop: `1px solid ${C.border}`, paddingTop: 7, marginBottom: 8 }}>
                {[
                  { label: "OVERALL TIME", val: overall, sub: "LV Yard → Ret Yard" },
                  { label: "TIME ON LOC", val: onLoc, sub: "Arrival → Job End" },
                  { label: "DRIVE TIME", val: driveTime, sub: "LV Yard→Arrival + Job End→Ret Yard" },
                ].map(({ label, val, sub }) => (
                  <div key={label} style={{ marginRight: 8 }}>
                    <div style={lblStyle}>{label}</div>
                    <div style={totalStyle}>{val || "—"}</div>
                    <div style={totalSubStyle}>{sub}</div>
                  </div>
                ))}
              </div>
              {/* Mileage */}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, display: "flex", flexWrap: "wrap", gap: "6px 12px", alignItems: "flex-end" }}>
                {[
                  { label: "MILEAGE — BEGINNING", val: mileageBegin, set: setMileageBegin },
                  { label: "MILEAGE — END", val: mileageEnd, set: setMileageEnd },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <div style={lblStyle}>{label}</div>
                    {editable
                      ? <input type="number" value={val} onChange={e => set(e.target.value)} min={0} placeholder="0"
                          style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px", fontSize: 12, color: C.text, background: C.cardBg, width: 98 }} />
                      : <div style={roStyle}>{val !== "" && val != null ? val : "—"}</div>}
                  </div>
                ))}
                <div>
                  <div style={lblStyle}>TOTAL MILES</div>
                  <div style={totalStyle}>{totalMiles !== null ? `${totalMiles.toLocaleString()} mi` : "—"}</div>
                </div>
              </div>

              {/* GPS Reference — Recommended Leave Time & Expected Distance */}
              {(driveInfo && !driveInfo.error) && (() => {
                // Calculate recommended leave time = Location Time minus drive duration
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
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "6px 24px" }}>
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
                );
              })()}

              {/* Pin section */}
              {(() => {
                const jobPin = job?.googlePin || job?.google_pin || "";
                const pinMismatch = jobPin && ticketPin && ticketPin.trim() !== jobPin.trim();
                const resolveTicketPin = async (url) => {
                  if (!url.trim()) return;
                  setTicketPinResolving(true); setTicketPinError("");
                  try {
                    const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url: url.trim() }),
                    });
                    if (!r.ok) { setTicketPinError("Could not resolve pin."); setTicketPinResolving(false); return; }
                    const { lat, lng } = await r.json();
                    setTicketPinLat(lat); setTicketPinLng(lng);
                  } catch { setTicketPinError("Network error."); }
                  setTicketPinResolving(false);
                };
                return (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 7, marginTop: 2 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <div style={lblStyle}>GOOGLE PIN</div>
                      {pinMismatch && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#8a6500", background: "#fdf5d8", border: "1px solid #e6c20044", borderRadius: 3, padding: "2px 8px", letterSpacing: "0.04em" }}>
                          ALT PIN — differs from Work Order
                        </span>
                      )}
                      {jobPin && !ticketPin && (
                        <span style={{ fontSize: 10, color: C.muted }}>Work Order: {jobPin.length > 40 ? jobPin.slice(0, 40) + "…" : jobPin}</span>
                      )}
                    </div>
                    {editable ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
                          value={ticketPin}
                          onChange={e => { setTicketPin(e.target.value); setTicketPinLat(null); setTicketPinLng(null); setTicketPinError(""); }}
                          placeholder={jobPin ? "Override Work Order pin or leave blank to use Work Order pin" : "Paste Google Maps link..."}
                        />
                        {ticketPin && (
                          <button type="button" onClick={() => resolveTicketPin(ticketPin)} disabled={ticketPinResolving}
                            style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                            {ticketPinResolving ? "..." : "RESOLVE"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div style={roStyle}>{ticketPin || (jobPin ? `Using Work Order pin` : "—")}</div>
                    )}
                    {ticketPinError && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>⚠ {ticketPinError}</div>}
                    {(ticketPinLat || ticketPinLng) && (
                      <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 4, display: "flex", gap: 12, alignItems: "center" }}>
                        <span>{parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}</span>
                        <a href={`https://www.google.com/maps?q=${ticketPinLat},${ticketPinLng}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none", fontFamily: "'Arial', sans-serif" }}>
                          View on Google Maps ↗
                        </a>
                      </div>
                    )}
                    {/* Drive distance from yard */}
                    {(ticketPinLat && ticketPinLng) && (
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                        {!driveInfo && !driveLoading && (
                          <button type="button" onClick={async () => {
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
                          }} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: C.text, cursor: "pointer" }}>
                            CALC DRIVE
                          </button>
                        )}
                        {driveLoading && <span style={{ fontSize: 11, color: C.muted }}>Calculating...</span>}
                        {driveInfo && !driveInfo.error && (
                          <div style={{ display: "flex", gap: 16 }}>
                            <div>
                              <div style={lblStyle}>DRIVE DISTANCE</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.distance}</div>
                            </div>
                            <div>
                              <div style={lblStyle}>EST. DRIVE TIME</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.duration}</div>
                            </div>
                          </div>
                        )}
                        {driveInfo?.error && <div style={{ fontSize: 11, color: C.red }}>⚠ {driveInfo.error}</div>}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Rental cycle info */}
        {ticket.type === "Rental" && (rentalStartDate || ticket.startDate || ticket.start_date) && (
          <div style={{ background: "#f8f4e8", borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
            {isFullyLocked || ticket.voidedAt ? (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
                <span><span style={{ color: C.muted }}>Start: </span><strong>{formatDate(rentalStartDate)}</strong></span>
                <span><span style={{ color: C.muted }}>End: </span><strong>{formatDate(rentalEndDate)}</strong></span>
                <span><span style={{ color: C.muted }}>Cycle: </span><strong>{rentalCycleDays} days</strong></span>
                <span style={{ color: rentalRecurring ? C.green : C.muted, fontWeight: 700 }}>
                  {rentalRecurring ? "● Recurring" : "○ Not recurring"}
                </span>
                {(ticket.cycleEnded || ticket.cycle_ended) && (
                  <span style={{ background: "#fdf5d8", color: "#8a6500", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, border: "1px solid #e6c20044" }}>CYCLE ENDED</span>
                )}
                <RentalCountdown ticket={{ ...ticket, endDate: rentalEndDate, isRecurring: rentalRecurring }} />
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: C.text }}>
                <div>
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" }}>START </span>
                  <input type="date" value={rentalStartDate} onChange={e => setRentalStartDate(e.target.value)}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }} />
                </div>
                <div>
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" }}>END </span>
                  <input type="date" value={rentalEndDate} onChange={e => setRentalEndDate(e.target.value)}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg }} />
                </div>
                <div>
                  <span style={{ color: C.muted, fontWeight: 600, fontSize: 10, letterSpacing: "0.06em" }}>CYCLE </span>
                  <input type="number" value={rentalCycleDays} onChange={e => setRentalCycleDays(e.target.value)} min={1}
                    style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", fontSize: 12, color: C.text, background: C.cardBg, width: 50 }} />
                  <span style={{ fontSize: 11, color: C.muted }}> days</span>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  <input type="checkbox" checked={rentalRecurring} onChange={e => setRentalRecurring(e.target.checked)} style={{ width: 14, height: 14 }} />
                  <span style={{ color: rentalRecurring ? C.green : C.muted }}>{rentalRecurring ? "● Recurring" : "○ Not recurring"}</span>
                </label>
                <RentalCountdown ticket={{ ...ticket, endDate: rentalEndDate, isRecurring: rentalRecurring }} />
              </div>
            )}
          </div>
        )}

        {/* Google Pin for Rental tickets (pin + resolve + drive distance, no time/mileage) */}
        {ticket.type === "Rental" && (() => {
          const lblStyle = { fontSize: 10, fontWeight: 700, color: C.muted, letterSpacing: "0.06em", marginBottom: 3 };
          const roStyle = { fontSize: 13, color: C.text, padding: "6px 0" };
          const jobPin = job?.googlePin || job?.google_pin || "";
          const pinMismatch = jobPin && ticketPin && ticketPin.trim() !== jobPin.trim();
          const resolveTicketPin = async (url) => {
            if (!url.trim()) return;
            setTicketPinResolving(true); setTicketPinError("");
            try {
              const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim() }),
              });
              if (!r.ok) { setTicketPinError("Could not resolve pin."); setTicketPinResolving(false); return; }
              const { lat, lng } = await r.json();
              setTicketPinLat(lat); setTicketPinLng(lng);
            } catch { setTicketPinError("Network error."); }
            setTicketPinResolving(false);
          };
          return (
            <div style={{ background: C.steel, borderBottom: `1px solid ${C.border}`, padding: "10px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={lblStyle}>GOOGLE PIN</div>
                {pinMismatch && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#8a6500", background: "#fdf5d8", border: "1px solid #e6c20044", borderRadius: 3, padding: "2px 8px", letterSpacing: "0.04em" }}>
                    ALT PIN — differs from Work Order
                  </span>
                )}
                {jobPin && !ticketPin && (
                  <span style={{ fontSize: 10, color: C.muted }}>Work Order: {jobPin.length > 40 ? jobPin.slice(0, 40) + "…" : jobPin}</span>
                )}
              </div>
              {editable ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
                    value={ticketPin}
                    onChange={e => { setTicketPin(e.target.value); setTicketPinLat(null); setTicketPinLng(null); setTicketPinError(""); }}
                    placeholder={jobPin ? "Override Work Order pin or leave blank to use Work Order pin" : "Paste Google Maps link..."}
                  />
                  {ticketPin && (
                    <button type="button" onClick={() => resolveTicketPin(ticketPin)} disabled={ticketPinResolving}
                      style={{ background: C.blue, color: C.white, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      {ticketPinResolving ? "..." : "RESOLVE"}
                    </button>
                  )}
                </div>
              ) : (
                <div style={roStyle}>{ticketPin || (jobPin ? "Using Work Order pin" : "—")}</div>
              )}
              {ticketPinError && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>⚠ {ticketPinError}</div>}
              {(ticketPinLat || ticketPinLng) && (
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace", marginTop: 4, display: "flex", gap: 12, alignItems: "center" }}>
                  <span>{parseFloat(ticketPinLat).toFixed(6)}, {parseFloat(ticketPinLng).toFixed(6)}</span>
                  <a href={`https://www.google.com/maps?q=${ticketPinLat},${ticketPinLng}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none", fontFamily: "'Arial', sans-serif" }}>
                    View on Google Maps ↗
                  </a>
                </div>
              )}
              {(ticketPinLat && ticketPinLng) && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                  {!driveInfo && !driveLoading && (
                    <button type="button" onClick={async () => {
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
                    }} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 3, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: C.text, cursor: "pointer" }}>
                      CALC DRIVE
                    </button>
                  )}
                  {driveLoading && <span style={{ fontSize: 11, color: C.muted }}>Calculating...</span>}
                  {driveInfo && !driveInfo.error && (
                    <div style={{ display: "flex", gap: 16 }}>
                      <div>
                        <div style={lblStyle}>DRIVE DISTANCE</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.distance}</div>
                      </div>
                      <div>
                        <div style={lblStyle}>EST. DRIVE TIME</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{driveInfo.duration}</div>
                      </div>
                    </div>
                  )}
                  {driveInfo?.error && <div style={{ fontSize: 11, color: C.red }}>⚠ {driveInfo.error}</div>}
                </div>
              )}
            </div>
          );
        })()}

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

          {/* Status selector (unlocked only) */}
          {!isLocked && status !== "emailed" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginRight: 4 }}>STATUS:</span>
              {[["incomplete", "INCOMPLETE"], ["inField", "IN FIELD"]].map(([key, lbl]) => (
                <FilterBtn key={key} active={status === key} onClick={() => setStatus(key)}>{lbl}</FilterBtn>
              ))}
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

          {/* JSA */}
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" onClick={() => setShowJSA(true)}
              style={{ background: existingJSA ? C.green : C.blue, color: "#fff", border: "none", borderRadius: 4, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {existingJSA ? "VIEW / EDIT JSA" : "CREATE JSA"}
            </button>
            {existingJSA && <span style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>✓ JSA on file</span>}
            {jsaLoaded && !existingJSA && <span style={{ fontSize: 11, color: "#8a6500", fontWeight: 600 }}>No JSA yet</span>}
          </div>

          {/* Signature display */}
          {["signed", "approved", "sentToQB", "qbVerified", "voided"].includes(status) && signedBy && (
            <div style={{ background: status === "voided" ? "#fdecea" : "#e6f5ec", border: `1px solid ${status === "voided" ? C.red : C.green}44`, borderRadius: 6, padding: 14, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: status === "voided" ? C.red : C.green, marginBottom: 6 }}>✓ SIGNED &nbsp; {signedBy}</div>
              {signedAt && <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>Signed: {new Date(signedAt).toLocaleString("en-US", { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit", hour12: true })}</div>}
              {signatureImage && <img src={signatureImage} alt="Signature" style={{ maxWidth: 300, height: 80, display: "block", border: `1px solid ${C.border}`, borderRadius: 4, background: C.white }} />}
            </div>
          )}

          {/* Sig not required display */}
          {status === "sigNotReq" && (
            <div style={{ background: "#e8f0fb", border: `1px solid ${C.blue}44`, borderRadius: 6, padding: 14, marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.blue }}>SIGNATURE NOT REQUIRED</div>
              <div style={{ fontSize: 11, color: C.text, marginTop: 4 }}>{sigNotReqReason}</div>
              {sigNotReqNote && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sigNotReqNote}</div>}
            </div>
          )}

          {/* Sig not required options */}
          {showSigOptions && (
            <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 16, marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>REASON SIGNATURE NOT REQUIRED</div>
              {[["not_required", "Customer does not require field signature"], ["other", "Other"]].map(([val, lbl]) => (
                <div key={val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }} onClick={() => setSigNotReqReason(sigNotReqReason === val ? null : val)}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${sigNotReqReason === val ? C.blue : C.border}`, background: sigNotReqReason === val ? C.blue : "transparent" }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{lbl}</span>
                </div>
              ))}
              {sigNotReqReason === "other" && (
                <input style={inputStyle} value={sigNotReqNote} onChange={e => setSigNotReqNote(e.target.value)} placeholder="Reason..." />
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Btn onClick={handleSigNotRequired}>CONFIRM</Btn>
                <Btn variant="ghost" onClick={() => setShowSigOptions(false)}>CANCEL</Btn>
              </div>
            </div>
          )}

          {/* Sig pad — always rendered when showSigPad is true */}
          {showSigPad && (
            <SignaturePad onSign={handleSign} onCancel={() => setShowSigPad(false)} />
          )}

          {/* ── Comment Thread ── */}
          <div style={{ marginTop: 20, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Site Manager Comments</span>
              {(ticket.hasPendingComment || ticket.has_pending_comment) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fdecea", color: "#B01020", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", border: "1px solid #B0102044" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B01020", display: "inline-block" }} />
                  COMMENT PENDING
                </span>
              )}
            </div>
            {tdLoading && <div style={{ fontSize: 12, color: C.muted }}>Loading comments...</div>}
            {!tdLoading && tdComments.length === 0 && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>No comments yet.</div>}
            {tdComments.map((c, i) => {
              const who = c.author_type === "fti" ? `Flo-Test (${c.author})` : `${c.author} (Site)`;
              const bg = c.author_type === "fti" ? "#e8f0fb" : "#fef9e7";
              const time = new Date(c.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
              return (
                <div key={i} style={{ background: bg, borderRadius: 6, padding: "8px 12px", marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}><strong>{who}</strong> · {time}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{c.message}</div>
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "flex-end" }}>
              <textarea
                style={{ flex: 1, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, minHeight: 50, resize: "vertical", boxSizing: "border-box" }}
                value={tdReply} onChange={e => setTdReply(e.target.value)}
                placeholder="Reply to site manager..."
              />
              <button type="button"
                style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: tdSending ? 0.6 : 1, whiteSpace: "nowrap", height: 36 }}
                disabled={tdSending || !tdReply.trim()}
                onClick={async () => {
                  if (!tdReply.trim()) return;
                  setTdSending(true);
                  try {
                    const r = await fetch(`${API_URL}/signature/reply/${ticket.id}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ author: currentUser?.name || "FTI", message: tdReply.trim() }),
                    });
                    if (!r.ok) { const d = await r.json(); alert(d.error || "Reply failed"); setTdSending(false); return; }
                    setTdComments(prev => [...prev, { author: currentUser?.name || "FTI", author_type: "fti", message: tdReply.trim(), created_at: new Date().toISOString() }]);
                    setTdReply("");
                    // Clear pending flag locally
                    if (onUpdate) onUpdate(ticket.id, { hasPendingComment: false, has_pending_comment: false });
                  } catch (err) { alert("Reply failed: " + err.message); }
                  setTdSending(false);
                }}>
                {tdSending ? "Sending..." : "Reply & Email"}
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>

          {/* QB Verified — fully locked */}
          {status === "qbVerified" && (
            <span style={{ fontSize: 12, fontWeight: 800, color: C.green, background: "#d4edda", padding: "6px 14px", borderRadius: 4 }}>✓ QB VERIFIED</span>
          )}

          {status === "sentToQB" && (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, background: C.steel, border: `1px solid ${C.border}`, padding: "6px 14px", borderRadius: 4 }}>AWAITING QB VERIFICATION</span>
          )}

          {/* Approved — send to QB */}
          {status === "approved" && !isEditing && (
            <Btn variant="blue" onClick={() => setShowQBConfirm(true)}>SEND TO ACCOUNTING</Btn>
          )}

          {/* Signed/SigNotReq — approve */}
          {(status === "signed" || status === "sigNotReq") && !isEditing && (
            canApprove
              ? <Btn variant="blue" onClick={handleApprove}>APPROVE TICKET</Btn>
              : <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, padding: "6px 0" }}>Awaiting approval</span>
          )}

          {/* Editable — save/sign buttons */}
          {!isLocked && !showSigPad && !showSigOptions && (
            <>
              <Btn onClick={handleSave}>SAVE & CLOSE</Btn>
              {!sigWiped && <Btn variant="blue" onClick={() => setShowSigPad(true)}>COLLECT SIGNATURE</Btn>}
              {!sigWiped && !signedBy && <Btn variant="ghost" onClick={() => setShowSigOptions(true)}>SIG NOT REQUIRED</Btn>}
            </>
          )}

          {/* Edit button for locked but NOT signed tickets (e.g., sigNotReq) */}
          {isLocked && !isFullyLocked && !signedBy && status !== "sentToQB" && status !== "voided" && !isEditing && (
            <Btn variant="ghost" onClick={() => setIsEditing(true)}>EDIT TICKET</Btn>
          )}

          {/* Void button for signed tickets only */}
          {signedBy && !isFullyLocked && status !== "voided" && !isEditing && onRevise && (
            <Btn variant="ghost" onClick={() => setShowVoidConfirm(true)}>VOID TICKET</Btn>
          )}

          {/* Voided — no actions */}
          {status === "voided" && (
            <span style={{ fontSize: 12, fontWeight: 800, color: C.red, background: "#fdecea", padding: "6px 14px", borderRadius: 4 }}>VOIDED</span>
          )}

          {/* Always show close/cancel */}
          {!isFullyLocked && !isEditing && !sigWiped && <Btn variant="ghost" onClick={handleClose}>CLOSE</Btn>}
          {!isFullyLocked && (isEditing || sigWiped) && <Btn variant="ghost" onClick={handleCancel}>CANCEL</Btn>}
          {isFullyLocked && <Btn variant="ghost" onClick={onClose}>CLOSE</Btn>}

          {/* Spacer to push delete/duplicate to the right */}
          <div style={{ flex: 1 }} />

          {/* Duplicate */}
          {onDuplicate && !isFullyLocked && (
            <Btn variant="ghost" onClick={() => setShowDupModal(true)}>DUPLICATE</Btn>
          )}

          {/* Delete — not on locked/QB tickets */}
          {onDelete && !isFullyLocked && (
            <button type="button" onClick={() => setShowDeleteConfirm(true)}
              style={{ background: "transparent", border: "none", color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer", padding: "6px 10px", letterSpacing: "0.04em", opacity: 0.7 }}>
              DELETE
            </button>
          )}

        </div>

        {/* Unsaved changes confirmation */}
        {showUnsavedClose && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowUnsavedClose(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 400, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>You have unsaved changes on this ticket. Are you sure you want to close without saving?</div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={onClose}>YES, DISCARD</Btn>
                <Btn variant="ghost" onClick={() => setShowUnsavedClose(false)}>KEEP EDITING</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Send to Accounting confirmation */}
        {showQBConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowQBConfirm(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 12 }}>Send to Accounting?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
                Once submitted, this ticket will be permanently locked. No further edits, signatures, or deletions will be permitted.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="blue" onClick={() => { setShowQBConfirm(false); handleSendToQB(); }}>CONFIRM — SEND TO ACCOUNTING</Btn>
                <Btn variant="ghost" onClick={() => setShowQBConfirm(false)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowDeleteConfirm(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 420, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Delete Ticket?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
                This will remove ticket <strong>#{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}</strong> ({ticket.type}). The ticket can be recovered by an admin.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={async () => {
                  try {
                    const r = await fetch(`${API_URL}/tickets/${ticket.id}`, { method: "DELETE" });
                    if (!r.ok) { const d = await r.json(); alert(d.error || "Delete failed"); return; }
                    if (onDelete) onDelete(ticket.id);
                  } catch (err) { alert("Delete failed: " + err.message); }
                  setShowDeleteConfirm(false);
                }}>YES, DELETE</Btn>
                <Btn variant="ghost" onClick={() => setShowDeleteConfirm(false)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        )}

        {/* Void confirmation */}
        {showVoidConfirm && (
          <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }} onClick={() => setShowVoidConfirm(false)}>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.red}`, borderRadius: 8, padding: 28, width: 460, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.red, marginBottom: 10 }}>Void This Ticket?</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.7 }}>
                Ticket <strong>#{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}</strong> is signed and permanent. Proceeding will:
              </div>
              <div style={{ fontSize: 13, color: C.text, marginBottom: 20, lineHeight: 1.8, paddingLeft: 16 }}>
                <div>1. Void this ticket permanently (cannot be reversed)</div>
                <div>2. Preserve the existing signature for audit records</div>
                <div>3. Generate a new draft ticket with the same line items</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => {
                  setShowVoidConfirm(false);
                  if (onRevise) onRevise(ticket);
                }}>YES, VOID & CREATE NEW</Btn>
                <Btn variant="ghost" onClick={() => setShowVoidConfirm(false)}>CANCEL</Btn>
              </div>
            </div>
          </div>
        )}

        {/* JSA Modal */}
        {showJSA && job && (
          <JSAModal
            job={job}
            ticket={ticket}
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
              } catch (err) { console.error("JSA save failed:", err); }
            }}
          />
        )}

        {/* Duplicate Options Modal */}
        {showDupModal && (() => {
          const TYPES = ["Rig Up", "Tester", "Pumper", "Rental", "Rig Down"];
          const DupModal = () => {
            const [dupType, setDupType] = useState(ticket.type);
            const [dupDate, setDupDate] = useState(today());
            const [dupJobId, setDupJobId] = useState(ticket.jobId);
            const [incLineItems, setIncLineItems] = useState(true);
            const [incNotes, setIncNotes] = useState(false);
            const [incPin, setIncPin] = useState(true);
            const [incWells, setIncWells] = useState(true);
            const [submitting, setSubmitting] = useState(false);
            const targetJob = jobs?.find(j => j.id === dupJobId);
            const sourceJob = jobs?.find(j => j.id === ticket.jobId);
            const customerChanged = targetJob && sourceJob && targetJob.customer !== sourceJob.customer;
            const activeJobs = (jobs || []).filter(j => j.status !== "Deleted");
            const chk = { width: 16, height: 16, cursor: "pointer", accentColor: C.blue };
            const lbl = { fontSize: 13, cursor: "pointer", userSelect: "none" };
            return (
              <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setShowDupModal(false)}>
                <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28, width: 500, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 4 }}>Duplicate Ticket</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>
                    #{ticket.jobId}{ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""} — {ticket.type}
                  </div>

                  {/* Type */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TICKET TYPE</div>
                    <select value={dupType} onChange={e => setDupType(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {/* Date */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>TICKET DATE</div>
                    <input type="date" value={dupDate} onChange={e => setDupDate(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }} />
                  </div>

                  {/* Target Job */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>ASSIGN TO JOB</div>
                    <select value={dupJobId} onChange={e => setDupJobId(Number(e.target.value))} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}>
                      {activeJobs.map(j => <option key={j.id} value={j.id}>#{j.id} — {j.customer} ({j.location})</option>)}
                    </select>
                    {dupJobId !== ticket.jobId && targetJob && (
                      <div style={{ fontSize: 11, color: C.blue, marginTop: 4 }}>Customer: {targetJob.customer}</div>
                    )}
                  </div>

                  {/* Carry Over Options */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>CARRY OVER</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20, padding: "12px 14px", background: C.steel, borderRadius: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incLineItems} onChange={e => setIncLineItems(e.target.checked)} style={chk} />
                      Line Items ({ticket.lineItems?.length || 0} items)
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incNotes} onChange={e => setIncNotes(e.target.checked)} style={chk} />
                      Notes
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl, opacity: customerChanged ? 0.5 : 1 }}>
                      <input type="checkbox" checked={customerChanged ? false : incPin} onChange={e => setIncPin(e.target.checked)} disabled={customerChanged} style={{ ...chk, cursor: customerChanged ? "not-allowed" : "pointer" }} />
                      Google Pin {customerChanged && <span style={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>(different customer)</span>}
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, ...lbl }}>
                      <input type="checkbox" checked={incWells} onChange={e => setIncWells(e.target.checked)} style={chk} />
                      Assigned Wells
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <Btn variant="blue" onClick={async () => {
                      setSubmitting(true);
                      await onDuplicate(ticket, {
                        new_date: dupDate,
                        new_job_id: dupJobId !== ticket.jobId ? dupJobId : undefined,
                        new_type: dupType !== ticket.type ? dupType : undefined,
                        assigned_wells: incWells ? ticket.assignedWells : [],
                        include_notes: incNotes,
                        include_line_items: incLineItems,
                        include_pin: customerChanged ? false : incPin,
                      });
                      setShowDupModal(false);
                      setSubmitting(false);
                    }} disabled={submitting}>{submitting ? "DUPLICATING..." : "DUPLICATE"}</Btn>
                    <Btn variant="ghost" onClick={() => setShowDupModal(false)}>CANCEL</Btn>
                  </div>
                </div>
              </div>
            );
          };
          return <DupModal />;
        })()}

      </div>
    </div>
  );
}


export default TicketDetail;
export { RentalCountdown };
