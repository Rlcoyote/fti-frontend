import { useState } from "react";
import useIsMobile from "./useIsMobile.js";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { ALL_COUNTIES, VALID_STATES } from "./NewJobConstants.js";
import NewJobUnsavedConfirm from "./NewJobUnsavedConfirm.jsx";
import useNewJobMobileBack from "./useNewJobMobileBack.js";
import NewJobNotesField from "./NewJobNotesField.jsx";
import NewJobWellsPanel from "./NewJobWellsPanel.jsx";
import NewJobScheduleSalesman from "./NewJobScheduleSalesman.jsx";
import NewJobLocationPanel from "./NewJobLocationPanel.jsx";
import NewJobGooglePin from "./NewJobGooglePin.jsx";
import NewJobContactsPanel from "./NewJobContactsPanel.jsx";
import NewJobCustomerPicker from "./NewJobCustomerPicker.jsx";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";

function NewJobModal({ onClose, onCreateJob }) {
  const { customers, users, refreshCustomers } = useApp();
  const isMobile = useIsMobile();
  useNewJobMobileBack(onClose);
  const [custSearch, setCustSearch] = useState("");
  const [selectedCust, setSelectedCust] = useState(null);
  // showCustDrop / showAddCust / newCustName / newCustMsg state lives
  // inside NewJobCustomerPicker (v28.103).
  const [jobState, setJobState] = useState("");
  const [county, setCounty] = useState("");
  // v28.42 — start with two blanks. Most WOs have ≥2 wells, so pre-seeding
  // saves a click. Auto-grow on last-row fill (see updateWell), drop empties
  // on submit (see cleanWells filter at line ~187).
  const [wellList, setWellList] = useState(["", ""]);
  const [wellTBD, setWellTBD] = useState(false);
  const [jobNotes, setJobNotes] = useState("");
  const [afe, setAfe] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [salesman, setSalesman] = useState("");
  const [contactFirst, setContactFirst] = useState("");
  const [contactLast, setContactLast] = useState("");
  const [approver, setApprover] = useState("");
  const [approverLast, setApproverLast] = useState("");
  const [approverPhone, setApproverPhone] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // v28.54 — A2P 10DLC consent intents. Captured here in form state, posted
  // by useJobActions.handleCreateJob AFTER the WO insert returns success
  // (never record consent for a job that wasn't actually created).
  const [pocConsentIntent, setPocConsentIntent] = useState(false);
  const [approverConsentIntent, setApproverConsentIntent] = useState(false);
  const [companyCode, setCompanyCode] = useState("");
  const [costCenter, setCostCenter] = useState("");
  const [po, setPo] = useState("");
  const [googlePin, setGooglePin] = useState("");
  const [pinLat, setPinLat] = useState(null);
  const [pinLng, setPinLng] = useState(null);
  // pinResolving + pinError state now live inside NewJobGooglePin (v28.101)
  const [stateLockedByPin, setStateLockedByPin] = useState(false);
  const [countyLockedByPin, setCountyLockedByPin] = useState(false);
  const [errors, setErrors] = useState({});
  const [showUnsaved, setShowUnsaved] = useState(false);

  // Salesman users list
  const salesmen = users.filter((u) => u.role === "salesman");

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

  const formatPhone = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };
  // VALID_STATES imported from ./NewJobConstants.js (v28.94) for validateAndCreate.
  // filteredCust derivation moved into NewJobCustomerPicker (v28.103).

  const [knownContacts, setKnownContacts] = useState([]);

  // selectCustomer extracted to NewJobCustomerPicker (v28.103).

  // v28.79 contact category logic + applyContact extracted to
  // NewJobContactsPanel (v28.102).

  // Save contacts after work order creation (upsert — backend handles dedup).
  // v28.81 — drops the `phone` + `role_tag` legacy mirror keys. Backend
  // still accepts both as input aliases, but canonical-only is the cleaner
  // posture going into v28.81b's column drop. POC saves as category=poc;
  // Approver saves as category=approver.
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

  // wells list logic (addWell / updateWell / removeWell) extracted to
  // NewJobWellsPanel in v28.98.

  const handleClose = () => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  };

  // resolvePin + handlePinChange extracted to NewJobGooglePin (v28.101).
  // Parent owns the lat/lng + state/county lock side-effects via the
  // onResolveSuccess + onResolveClear callbacks below.

  // VALID_STATES is now imported from ./NewJobConstants.js (v28.94)

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
    const cleanWells = wellTBD ? ["TBD"] : wellList.map((w) => w.trim()).filter(Boolean);
    // Auto-save POC + Approver as customer contacts (dedup handled by backend)
    if (selectedCust?.id) saveContactsForCustomer(selectedCust.id);

    onCreateJob({
      id: null,
      customer: custSearch.trim(),
      location: [county, jobState].filter(Boolean).join(", ") || "TBD",
      jobState,
      county,
      wells: cleanWells.length > 0 ? cleanWells : ["TBD"],
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

  return (
    <div
      style={
        isMobile
          ? { position: "fixed", inset: 0, background: C.cardBg, zIndex: 100, overflowY: "auto", WebkitOverflowScrolling: "touch" }
          : { position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isMobile ? undefined : handleClose}
    >
      <div
        style={
          isMobile
            ? { background: C.cardBg, borderTop: `3px solid ${C.red}`, padding: 28, minHeight: "100%" }
            : {
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderTop: `3px solid ${C.red}`,
                borderRadius: 8,
                padding: 28,
                width: 640,
                maxWidth: "95vw",
                maxHeight: "85vh",
                overflowY: "auto",
                margin: "20px 0",
              }
        }
        onClick={isMobile ? undefined : (e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>NEW WORK ORDER</div>

        {/* Scheduled Date + Salesman — extracted to NewJobScheduleSalesman (v28.99) */}
        <NewJobScheduleSalesman
          schedDate={schedDate}
          setSchedDate={setSchedDate}
          salesman={salesman}
          setSalesman={setSalesman}
          salesmenList={salesmen}
          isMobile={isMobile}
          error={errors.salesman}
          clearError={() => setErrors((prev) => ({ ...prev, salesman: null }))}
        />

        {/* Customer picker — extracted to NewJobCustomerPicker (v28.103) */}
        <NewJobCustomerPicker
          customers={customers}
          refreshCustomers={refreshCustomers}
          custSearch={custSearch}
          setCustSearch={setCustSearch}
          selectedCust={selectedCust}
          setSelectedCust={setSelectedCust}
          setKnownContacts={setKnownContacts}
          error={errors.customer}
          clearError={() => setErrors((prev) => ({ ...prev, customer: null }))}
        />

        {/* Contact info */}
        {/* Contact Information — extracted to NewJobContactsPanel (v28.102) */}
        <NewJobContactsPanel
          knownContacts={knownContacts}
          contactFirst={contactFirst}
          setContactFirst={setContactFirst}
          contactLast={contactLast}
          setContactLast={setContactLast}
          phone={phone}
          setPhone={setPhone}
          email={email}
          setEmail={setEmail}
          pocConsentIntent={pocConsentIntent}
          setPocConsentIntent={setPocConsentIntent}
          approver={approver}
          setApprover={setApprover}
          approverLast={approverLast}
          setApproverLast={setApproverLast}
          approverPhone={approverPhone}
          setApproverPhone={setApproverPhone}
          approverEmail={approverEmail}
          setApproverEmail={setApproverEmail}
          approverConsentIntent={approverConsentIntent}
          setApproverConsentIntent={setApproverConsentIntent}
          errors={errors}
          clearError={(k) => setErrors((prev) => ({ ...prev, [k]: null }))}
          formatPhone={formatPhone}
        />

        {/* Billing codes */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>BILLING INFORMATION</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label style={labelStyle}>COMPANY CODE</label>
              <input style={inputStyle} value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} placeholder="e.g. 0064" />
            </div>
            <div>
              <label style={labelStyle}>COST CENTER</label>
              <input style={inputStyle} value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="Cost center" />
            </div>
            <div>
              <label style={labelStyle}>PO NUMBER</label>
              <input style={inputStyle} value={po} onChange={(e) => setPo(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>LOCATION</div>

          {/* Google Pin — extracted to NewJobGooglePin (v28.101) */}
          <NewJobGooglePin
            googlePin={googlePin}
            setGooglePin={setGooglePin}
            pinLat={pinLat}
            setPinLat={setPinLat}
            pinLng={pinLng}
            setPinLng={setPinLng}
            onResolveSuccess={({ state, county: geoCounty }) => {
              if (state) {
                setJobState(state);
                setStateLockedByPin(true);
              }
              if (geoCounty) {
                setCounty(geoCounty);
                setCountyLockedByPin(true);
              }
            }}
            onResolveClear={() => {
              setStateLockedByPin(false);
              setCountyLockedByPin(false);
            }}
          />

          {/* State + County — extracted to NewJobLocationPanel (v28.100) */}
          <NewJobLocationPanel
            jobState={jobState}
            setJobState={setJobState}
            county={county}
            setCounty={setCounty}
            stateLockedByPin={stateLockedByPin}
            setStateLockedByPin={setStateLockedByPin}
            countyLockedByPin={countyLockedByPin}
            setCountyLockedByPin={setCountyLockedByPin}
            errors={{ jobState: errors.jobState, county: errors.county }}
            clearError={(k) => setErrors((prev) => ({ ...prev, [k]: null }))}
          />
        </div>

        {/* Wells + AFE — extracted to NewJobWellsPanel (v28.98) */}
        <NewJobWellsPanel
          wellList={wellList}
          setWellList={setWellList}
          wellTBD={wellTBD}
          setWellTBD={setWellTBD}
          afe={afe}
          setAfe={setAfe}
          wellsError={errors.wells}
          clearWellsError={() => setErrors((prev) => ({ ...prev, wells: null }))}
        />

        {/* Notes — extracted to NewJobNotesField (v28.97) */}
        <NewJobNotesField value={jobNotes} onChange={setJobNotes} />

        {/* Scheduling */}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn onClick={validateAndCreate}>CREATE WORK ORDER</Btn>
          <Btn onClick={handleClose} variant="ghost">
            CANCEL
          </Btn>
        </div>

        {/* Unsaved changes confirmation — extracted to NewJobUnsavedConfirm (v28.95) */}
        <NewJobUnsavedConfirm open={showUnsaved} onDiscard={onClose} onDismiss={() => setShowUnsaved(false)} />
      </div>
    </div>
  );
}

export default NewJobModal;
