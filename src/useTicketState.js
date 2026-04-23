import { useState, useEffect, useRef } from "react";
import { API_URL } from "./config.js";

// ─── useTicketState (v27.88) ─────────────────────────────────────────────────
// Owns every field of a ticket the user can edit, plus dirty-tracking and the
// two data effects tied to the ticket (known-contacts fetch, drive-distance
// auto-fetch).
//
// Extracted from TicketDetail.jsx as part of the Article XXV Option-3 pass.
// TicketDetail went from holding ~45 useState calls + origRef + isDirty +
// two useEffects to a single destructure from this hook, leaving it focused
// on orchestration and render.
//
// Not included here (stay in TicketDetail by design):
//   - UI-only modal flags (showSigPad, showSigOptions, showDeleteConfirm,
//     showVoidConfirm, showDupModal) — pure view state, no data concern
//   - JSA state — owned by useTicketJSA
//   - Signature polling — owned by useSignaturePolling
//   - Save/sign/approve handlers — they COMPOSE state from this hook but
//     aren't state owners themselves
//
// Return shape:
//   All data fields as `value` + `setValue` pairs (flat destructurable).
//   Plus: isDirty(), resetFromTicket(ticket), buildPayload(ticketType).
//
// Contract:
//   - `buildPayload(ticketType)` produces the same `updates` object that
//     TicketDetail's save() used to build inline. Callers spread overrides
//     on top to augment.
//   - `resetFromTicket(ticket)` snaps every field back to the ticket's
//     original values and clears sigWiped — used by handleCancel.
//   - `isDirty()` reads origRef (frozen on mount) vs. current values.
//     sigWiped and isEditing both force-dirty.

export default function useTicketState(ticket, job) {
  // ── Line items + basic fields ────────────────────────────────────────────
  const [lineItems, setLineItems] = useState(() => [...(ticket.lineItems || [])]);
  const [ticketDate, setTicketDate] = useState(() => ticket.date ? ticket.date.slice(0, 10) : "");
  const [notes, setNotes] = useState(() => ticket.notes || "");
  const [status, setStatus] = useState(() => ticket.status);

  // ── Rental ───────────────────────────────────────────────────────────────
  const [rentalStartDate, setRentalStartDate] = useState(() => (ticket.startDate || ticket.start_date || "").slice(0, 10));
  const [rentalEndDate, setRentalEndDate] = useState(() => (ticket.endDate || ticket.end_date || "").slice(0, 10));
  const [rentalCycleDays, setRentalCycleDays] = useState(() => ticket.cycleDays || ticket.cycle_days || 28);
  const [rentalRecurring, setRentalRecurring] = useState(() => !!(ticket.isRecurring || ticket.is_recurring));

  // ── Rig Down ─────────────────────────────────────────────────────────────
  const [missingPieces, setMissingPieces] = useState(() => ticket.missingPieces ?? null);

  // ── Time & Mileage (all ticket types except Rental and JSA) ─────────────
  const [lvYard, setLvYard] = useState(() => ticket.lvYard || ticket.lv_yard || "");
  const [arrivalTime, setArrivalTime] = useState(() => ticket.arrivalTime || ticket.arrival_time || "");
  const [dueOnLoc, setDueOnLoc] = useState(() => ticket.dueOnLoc || ticket.due_on_loc || "");
  const [jobStartTime, setJobStartTime] = useState(() => ticket.jobStartTime || ticket.job_start_time || "");
  const [jobEndTime, setJobEndTime] = useState(() => ticket.jobEndTime || ticket.job_end_time || "");
  const [retYard, setRetYard] = useState(() => ticket.retYard || ticket.ret_yard || "");
  const [timeZone, setTimeZone] = useState(() => ticket.timeZone || ticket.time_zone || "");
  const [mileageBegin, setMileageBegin] = useState(() => ticket.mileageBegin ?? ticket.mileage_begin ?? "");
  const [mileageEnd, setMileageEnd] = useState(() => ticket.mileageEnd ?? ticket.mileage_end ?? "");

  // ── Google Pin (ticket-level) ───────────────────────────────────────────
  const [ticketPin, setTicketPin] = useState(() => ticket.googlePin || ticket.google_pin || "");
  const [ticketPinLat, setTicketPinLat] = useState(() => ticket.pinLat || ticket.pin_lat || null);
  const [ticketPinLng, setTicketPinLng] = useState(() => ticket.pinLng || ticket.pin_lng || null);

  // ── Site Manager ────────────────────────────────────────────────────────
  const [siteMgrFirst, setSiteMgrFirst] = useState(() => ticket.siteMgrFirst || "");
  const [siteMgrLast, setSiteMgrLast] = useState(() => ticket.siteMgrLast || "");
  const [siteMgrPhone, setSiteMgrPhone] = useState(() => ticket.siteMgrPhone || "");
  const [siteMgrEmail, setSiteMgrEmail] = useState(() => ticket.siteMgrEmail || "");

  // ── Yard location (1-indexed, matches backend yard_location_index) ──────
  const [yardLocationIndex, setYardLocationIndex] = useState(() => ticket.yardLocationIndex || ticket.yard_location_index || 1);

  // ── Email ───────────────────────────────────────────────────────────────
  const [emailTo, setEmailTo] = useState(() => {
    if (ticket.emailTo) return ticket.emailTo.split(",").map(e => e.trim()).filter(Boolean);
    const pocAddr = job?.pocEmail || job?.poc_email || "";
    return pocAddr ? [pocAddr] : [""];
  });
  const [emailCc, setEmailCc] = useState(() => ticket.emailCc || "");

  // ── Signature ───────────────────────────────────────────────────────────
  const [signedBy, setSignedBy] = useState(() => ticket.signedBy || null);
  const [signedAt, setSignedAt] = useState(() => ticket.signedAt || null);
  const [signatureImage, setSignatureImage] = useState(() => ticket.signatureImage || null);
  const [sigNotReqReason, setSigNotReqReason] = useState(() => ticket.sigNotReqReason || null);
  const [sigNotReqNote, setSigNotReqNote] = useState(() => ticket.sigNotReqNote || "");
  const [sigWiped, setSigWiped] = useState(false);

  // ── Edit mode (signed-ticket edit flow) ─────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);

  // ── Drive-distance state + auto-fetch effect ───────────────────────────
  // Both TicketGooglePin and TicketTimeAndMileage consume driveInfo, so it
  // lives at parent level. The effect re-fires whenever the selected yard
  // (yardLocationIndex) changes so distance/time follow the dropdown.
  const [driveInfo, setDriveInfo] = useState(null);
  const [driveLoading, setDriveLoading] = useState(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id, yardLocationIndex]);

  // ── Known contacts (site manager quick-fill) ───────────────────────────
  const [knownContacts, setKnownContacts] = useState([]);
  const contactCustId = job?.customerId || job?.customer_id;
  useEffect(() => {
    if (!contactCustId) return;
    fetch(`${API_URL}/customers/${contactCustId}/contacts`)
      .then(r => r.ok ? r.json() : [])
      .then(c => setKnownContacts(c))
      .catch(() => {});
  }, [contactCustId]);

  // ── Dirty tracking ──────────────────────────────────────────────────────
  // origRef snapshots the baseline on mount. isDirty() compares current
  // values to that baseline. sigWiped and isEditing force-dirty (the user
  // is actively mid-edit / signature has been cleared).
  const normalizeLI = (items) =>
    (items || [])
      .map(li => `${li.qbCode || li.qb_code}|${li.desc || li.description}|${li.rate}|${li.qty}|${li.um || li.unit_measure}|${li.days || 1}`)
      .join("~");
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

  // ── Payload builder ─────────────────────────────────────────────────────
  // Produces the exact shape TicketDetail's save() used to build inline.
  // Caller spreads overrides on top.
  const buildPayload = (ticketType) => ({
    lineItems, notes, status, missingPieces, date: ticketDate,
    sigNotReqReason, sigNotReqNote,
    emailTo: emailTo.filter(e => e.trim()).join(", "),
    emailCc,
    signedBy, signedAt, signatureImage,
    siteMgrFirst, siteMgrLast, siteMgrPhone, siteMgrEmail,
    yardLocationIndex,
    ...(ticketType === "Rental"
      ? {
          startDate: rentalStartDate,
          endDate: rentalEndDate,
          cycleDays: parseInt(rentalCycleDays) || 28,
          isRecurring: rentalRecurring,
          googlePin: ticketPin || null,
          pinLat: ticketPinLat || null,
          pinLng: ticketPinLng || null,
        }
      : {}),
    ...(!["Rental", "JSA"].includes(ticketType)
      ? {
          lvYard, arrivalTime, dueOnLoc, jobStartTime, jobEndTime, retYard, timeZone,
          mileageBegin: mileageBegin !== "" ? parseFloat(mileageBegin) : null,
          mileageEnd: mileageEnd !== "" ? parseFloat(mileageEnd) : null,
          googlePin: ticketPin || null,
          pinLat: ticketPinLat || null,
          pinLng: ticketPinLng || null,
        }
      : {}),
  });

  // ── Cancel-style reset ──────────────────────────────────────────────────
  // Snaps state back to the ticket prop. Used when the user clicks CANCEL
  // on a signed-ticket edit — any local changes are discarded.
  const resetFromTicket = (t) => {
    setLineItems([...(t.lineItems || [])]);
    setNotes(t.notes || "");
    setStatus(t.status);
    setSignedBy(t.signedBy || null);
    setSignedAt(t.signedAt || null);
    setSignatureImage(t.signatureImage || null);
    setSigWiped(false);
    setIsEditing(false);
  };

  return {
    // Basic
    lineItems, setLineItems,
    ticketDate, setTicketDate,
    notes, setNotes,
    status, setStatus,

    // Rental
    rentalStartDate, setRentalStartDate,
    rentalEndDate, setRentalEndDate,
    rentalCycleDays, setRentalCycleDays,
    rentalRecurring, setRentalRecurring,

    // Rig Down
    missingPieces, setMissingPieces,

    // Time & Mileage
    lvYard, setLvYard,
    arrivalTime, setArrivalTime,
    dueOnLoc, setDueOnLoc,
    jobStartTime, setJobStartTime,
    jobEndTime, setJobEndTime,
    retYard, setRetYard,
    timeZone, setTimeZone,
    mileageBegin, setMileageBegin,
    mileageEnd, setMileageEnd,

    // Google Pin
    ticketPin, setTicketPin,
    ticketPinLat, setTicketPinLat,
    ticketPinLng, setTicketPinLng,

    // Site Manager
    siteMgrFirst, setSiteMgrFirst,
    siteMgrLast, setSiteMgrLast,
    siteMgrPhone, setSiteMgrPhone,
    siteMgrEmail, setSiteMgrEmail,

    // Yard
    yardLocationIndex, setYardLocationIndex,

    // Email
    emailTo, setEmailTo,
    emailCc, setEmailCc,

    // Signature
    signedBy, setSignedBy,
    signedAt, setSignedAt,
    signatureImage, setSignatureImage,
    sigNotReqReason, setSigNotReqReason,
    sigNotReqNote, setSigNotReqNote,
    sigWiped, setSigWiped,

    // Edit
    isEditing, setIsEditing,

    // Drive distance (auto-loaded by effect)
    driveInfo, setDriveInfo,
    driveLoading, setDriveLoading,

    // Known contacts (auto-loaded by effect)
    knownContacts,

    // Derived / helpers
    isDirty,
    buildPayload,
    resetFromTicket,
  };
}
