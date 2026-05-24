import { useState } from "react";
import { API_URL } from "./config.js";
// v28.188 — formatPhone moved to utils.js as a shared export so AddTicketSiteManager
// (and any future caller) can mask US phone numbers without duplicating the
// logic. Local re-bind to formatPhoneImpl keeps the hook's return-shape stable
// for downstream consumers that destructure `formatPhone` off the bag.
import { today, formatPhone as formatPhoneImpl } from "./utils.js";
import { VALID_STATES } from "./Geography.js";

// ─── useNewJobForm (v28.104 — ship 11 of NewJobModal split, arc final) ─────
// Owns all NewJobModal form state, derived values, validation, and the
// save dispatch. Big API surface (40+ entries) but matches the
// useTicketState / useNewJobModal pattern elsewhere — single-call
// orchestrator the shell destructures.
//
// What this hook owns:
//   - Every useState declaration that was inline in NewJobModal
//     (POC fields, Approver fields, billing codes, location, wells,
//     schedule, salesman, pin, errors, showUnsaved, knownContacts,
//     selectedCust, custSearch)
//   - The isDirty derivation (OR-chain across every state var)
//   - formatPhone util (used by phone + approverPhone fields)
//   - handleClose (with dirty-check → showUnsaved prompt)
//   - saveContactsForCustomer (POSTs POC + Approver to
//     customer_contacts on save — canonical-only since v28.81)
//   - validateAndCreate (gathers errors, scrolls to first error,
//     or fires onCreateJob with the assembled payload)
//
// What stays in the shell (NewJobModal.jsx):
//   - useApp + useIsMobile + useNewJobMobileBack at the top
//   - The hook call below
//   - All JSX, wiring the hook's bag into the sibling components
//
// Future split candidate (NOT part of this arc): if this hook grows
// past ~400 lines, split into useNewJobContactsState +
// useNewJobLocationState + useNewJobValidation. Currently ~200 lines,
// well under the threshold.

export default function useNewJobForm({ onClose, onCreateJob }) {
  // Customer
  const [custSearch, setCustSearch] = useState("");
  const [selectedCust, setSelectedCust] = useState(null);
  const [knownContacts, setKnownContacts] = useState([]);
  // Location
  const [jobState, setJobState] = useState("");
  const [county, setCounty] = useState("");
  // Wells + AFE
  const [wellList, setWellList] = useState(["", ""]);
  const [wellTBD, setWellTBD] = useState(false);
  const [afe, setAfe] = useState("");
  // v28.181 — Per-well location overrides. ARRAY parallel to wellList (each
  // index has a matching override object). Default { useSameLocation: true }
  // means the well inherits the WO's primary pin (the common case — most
  // WOs are one location with multiple wells). When useSameLocation is
  // false, pinLat/pinLng on the override become the well's own location;
  // the BE creates a separate geofence in Samsara for that well.
  const [wellOverrides, setWellOverrides] = useState([{ useSameLocation: true }, { useSameLocation: true }]);
  // v28.181 — Geofence radius around the primary pin (feet). 300ft default
  // per the GPS Phase 2 design. Stored on the job and used when FTI creates
  // the provider geofence on dispatch.
  const [locationRadiusFt, setLocationRadiusFt] = useState(300);
  // Notes
  const [jobNotes, setJobNotes] = useState("");
  // Schedule + Salesman
  const [schedDate, setSchedDate] = useState("");
  const [salesman, setSalesman] = useState("");
  // POC
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  // Approver
  const [approver, setApprover] = useState("");
  const [approverLast, setApproverLast] = useState("");
  const [approverPhone, setApproverPhone] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  // v28.54 — A2P 10DLC consent intents. Captured here; posted by
  // useJobActions.handleCreateJob AFTER the WO insert returns success
  // (never record consent for a job that wasn't actually created).
  const [pocConsentIntent, setPocConsentIntent] = useState(false);
  const [approverConsentIntent, setApproverConsentIntent] = useState(false);
  // Billing
  const [companyCode, setCompanyCode] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [po, setPo] = useState("");
  // Pin
  const [googlePin, setGooglePin] = useState("");
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);
  const [stateLockedByPin, setStateLockedByPin] = useState(false);
  const [countyLockedByPin, setCountyLockedByPin] = useState(false);
  // UI
  const [errors, setErrors] = useState({});
  const [showUnsaved, setShowUnsaved] = useState(false);

  const isDirty =
    custSearch ||
    contactFirst ||
    contactLast ||
    phone ||
    email ||
    approver ||
    approverLast ||
    approverPhone ||
    approverEmail ||
    companyCode ||
    costCenter ||
    po ||
    jobState ||
    county ||
    wellList.some((w) => w.trim()) ||
    afe ||
    schedDate ||
    salesman ||
    googlePin;

  const clearError = (k) => setErrors((prev) => ({ ...prev, [k]: null }));

  const handleClose = () => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  };

  // Save contacts after work order creation (upsert — backend handles dedup).
  // v28.81 — canonical-only (no `phone` / `role_tag` legacy mirror keys).
  const saveContactsForCustomer = async (custId) => {
    if (!custId) return;
    const pocName = [contactFirst, contactLast].filter(Boolean).join(" ").trim();
    const approverName = [approver, approverLast].filter(Boolean).join(" ").trim();
    const saves = [];
    if (pocName) {
      saves.push(
        fetch(`${API_URL}/customers/${custId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pocName,
            phone_work: phone || null,
            email: email || null,
            category: "poc",
          }),
        }),
      );
    }
    if (approverName) {
      saves.push(
        fetch(`${API_URL}/customers/${custId}/contacts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: approverName,
            phone_work: approverPhone || null,
            email: approverEmail || null,
            category: "approver",
          }),
        }),
      );
    }
    await Promise.allSettled(saves);
  };

  const validateAndCreate = () => {
    const errs = {};
    if (!custSearch.trim()) errs.customer = "Customer is required";
    if (!wellTBD && !wellList.some((w) => w.trim())) errs.wells = "At least one well name is required";
    if (!jobState.trim()) errs.jobState = "State is required";
    if (!county.trim()) errs.county = "County is required";
    if (!contactFirst.trim()) errs.contactFirst = "Point of Contact first name is required";
    if (!contactLast.trim()) errs.contactLast = "Point of Contact last name is required";
    if (!phone.trim()) errs.phone = "Point of Contact phone is required";
    if (!salesman) errs.salesman = "Salesman selection is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Invalid email format";
    if (approverEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail)) errs.approverEmail = "Invalid email format";
    if (jobState && !VALID_STATES.includes(jobState.toUpperCase())) errs.jobState = "Invalid state code";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-error="${firstKey}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setErrors({});
    // v28.181 — Build parallel arrays of cleaned well names AND their override
    // metadata, indexed together (the filter drops empty rows; we keep
    // wellOverrides aligned with the surviving wells).
    let cleanWells = [];
    let cleanWellOverrides = [];
    if (wellTBD) {
      cleanWells = ["TBD"];
      cleanWellOverrides = [{ useSameLocation: true }];
    } else {
      wellList.forEach((w, idx) => {
        const t = (w || "").trim();
        if (!t) return;
        cleanWells.push(t);
        cleanWellOverrides.push(wellOverrides[idx] || { useSameLocation: true });
      });
      if (cleanWells.length === 0) {
        cleanWells = ["TBD"];
        cleanWellOverrides = [{ useSameLocation: true }];
      }
    }
    // Auto-save POC + Approver as customer contacts (dedup handled by backend)
    if (selectedCust?.id) saveContactsForCustomer(selectedCust.id);

    onCreateJob({
      id: null,
      customer: custSearch.trim(),
      location: [county, jobState].filter(Boolean).join(", ") || "TBD",
      jobState,
      county,
      wells: cleanWells,
      // v28.181 — per-well override metadata, aligned with `wells` by index.
      wellOverrides: cleanWellOverrides,
      locationRadiusFt: Number(locationRadiusFt) || 300,
      afe: afe || null,
      dateStarted: schedDate || today(),
      status: "Scheduled",
      salesman: salesman || null,
      crew: [],
      equipment: [],
      hoursLogged: 0,
      estimatedCost: 0,
      jsaComplete: false,
      contactFirst,
      contactLast,
      email,
      phone,
      approver,
      approverLast,
      approverPhone,
      approverEmail,
      // v28.54 — consent intents travel with the job payload. The action
      // layer (useJobActions.handleCreateJob) reads these AFTER the WO
      // insert returns success and POSTs them to /api/sms-consents.
      pocConsentIntent,
      approverConsentIntent,
      companyCode,
      costCenter,
      po,
      googlePin: googlePin || null,
      pinLat: pinLat || null,
      pinLng: pinLng || null,
      notes: jobNotes || null,
    });
  };

  return {
    // Customer
    custSearch,
    setCustSearch,
    selectedCust,
    setSelectedCust,
    knownContacts,
    setKnownContacts,
    // Location
    jobState,
    setJobState,
    county,
    setCounty,
    // Wells + AFE
    wellList,
    setWellList,
    wellTBD,
    setWellTBD,
    afe,
    setAfe,
    // v28.181 — per-well location override + WO geofence radius
    wellOverrides,
    setWellOverrides,
    locationRadiusFt,
    setLocationRadiusFt,
    // Notes
    jobNotes,
    setJobNotes,
    // Schedule + Salesman
    schedDate,
    setSchedDate,
    salesman,
    setSalesman,
    // POC
    contactFirst,
    setContactFirst,
    contactLast,
    setContactLast,
    phone,
    setPhone,
    email,
    setEmail,
    pocConsentIntent,
    setPocConsentIntent,
    // Approver
    approver,
    setApprover,
    approverLast,
    setApproverLast,
    approverPhone,
    setApproverPhone,
    approverEmail,
    setApproverEmail,
    approverConsentIntent,
    setApproverConsentIntent,
    // Billing
    companyCode,
    setCompanyCode,
    costCenter,
    setCostCenter,
    po,
    setPo,
    // Pin
    googlePin,
    setGooglePin,
    pinLat,
    setPinLat,
    pinLng,
    setPinLng,
    stateLockedByPin,
    setStateLockedByPin,
    countyLockedByPin,
    setCountyLockedByPin,
    // UI
    errors,
    setErrors,
    showUnsaved,
    setShowUnsaved,
    // Derived
    isDirty,
    // Actions
    formatPhone: formatPhoneImpl,
    clearError,
    handleClose,
    validateAndCreate,
  };
}
