import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import SmsConsentCheckbox from "./SmsConsentCheckbox.jsx";

function NewJobModal({ onClose, onCreateJob }) {
  const { customers, users, refreshCustomers } = useApp();
  const [isMobile] = useState(() => window.innerWidth <= 900);

  useEffect(() => {
    if (!isMobile) return;
    window.history.pushState({ newJobOpen: true }, "");
    const handlePop = () => {
      onClose();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile, onClose]);
  const [custSearch, setCustSearch] = useState("");
  const [showCustDrop, setShowCustDrop] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [showAddCust, setShowAddCust] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustMsg, setNewCustMsg] = useState("");
  const [jobState, setJobState] = useState("");
  const [county, setCounty] = useState("");
  const [showCountyDrop, setShowCountyDrop] = useState(false);
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
  const [pinResolving, setPinResolving] = useState(false);
  const [pinError, setPinError] = useState("");
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
  const formatState = (val) =>
    val
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 2)
      .toUpperCase();

  const TX_COUNTIES = [
    "Andrews",
    "Archer",
    "Armstrong",
    "Bailey",
    "Baylor",
    "Borden",
    "Brewster",
    "Briscoe",
    "Brooks",
    "Brown",
    "Callahan",
    "Carson",
    "Castro",
    "Childress",
    "Clay",
    "Cochran",
    "Coke",
    "Coleman",
    "Collingsworth",
    "Comanche",
    "Concho",
    "Cottle",
    "Crane",
    "Crockett",
    "Crosby",
    "Culberson",
    "Dallam",
    "Dawson",
    "Deaf Smith",
    "Dickens",
    "Dimmit",
    "Donley",
    "Eastland",
    "Ector",
    "Edwards",
    "El Paso",
    "Fisher",
    "Floyd",
    "Foard",
    "Gaines",
    "Garza",
    "Glasscock",
    "Gray",
    "Hale",
    "Hall",
    "Hansford",
    "Hardeman",
    "Hartley",
    "Haskell",
    "Hemphill",
    "Howard",
    "Hudspeth",
    "Hutchinson",
    "Irion",
    "Jeff Davis",
    "Jones",
    "Kent",
    "Kimble",
    "King",
    "Kinney",
    "Knox",
    "Lamb",
    "Lampasas",
    "Lipscomb",
    "Llano",
    "Loving",
    "Lubbock",
    "Lynn",
    "Martin",
    "Mason",
    "Maverick",
    "McCulloch",
    "McMullen",
    "Menard",
    "Midland",
    "Mills",
    "Mitchell",
    "Montague",
    "Moore",
    "Motley",
    "Nolan",
    "Ochiltree",
    "Oldham",
    "Palo Pinto",
    "Parmer",
    "Pecos",
    "Potter",
    "Presidio",
    "Randall",
    "Reagan",
    "Real",
    "Reeves",
    "Roberts",
    "Runnels",
    "San Saba",
    "Schleicher",
    "Scurry",
    "Shackelford",
    "Sherman",
    "Stephens",
    "Sterling",
    "Stonewall",
    "Sutton",
    "Swisher",
    "Taylor",
    "Terrell",
    "Terry",
    "Throckmorton",
    "Tom Green",
    "Upton",
    "Uvalde",
    "Val Verde",
    "Ward",
    "Wheeler",
    "Winkler",
    "Yoakum",
    "Young",
    "Zavala",
  ];
  const NM_COUNTIES = [
    "Chaves",
    "Cibola",
    "Curry",
    "De Baca",
    "Dona Ana",
    "Eddy",
    "Grant",
    "Guadalupe",
    "Harding",
    "Hidalgo",
    "Lea",
    "Lincoln",
    "Los Alamos",
    "Luna",
    "McKinley",
    "Mora",
    "Otero",
    "Quay",
    "Rio Arriba",
    "Roosevelt",
    "San Juan",
    "San Miguel",
    "Sandoval",
    "Santa Fe",
    "Sierra",
    "Socorro",
    "Taos",
    "Torrance",
    "Union",
    "Valencia",
  ];
  const ALL_COUNTIES = [...TX_COUNTIES, ...NM_COUNTIES].sort();
  const filteredCounties = county.length > 0 ? ALL_COUNTIES.filter((c) => c.toLowerCase().startsWith(county.toLowerCase())) : [];
  const filteredCust = custSearch.length > 0 ? customers.filter((c) => c.name.toLowerCase().includes(custSearch.toLowerCase())) : customers;

  const [knownContacts, setKnownContacts] = useState([]);

  const selectCustomer = (cust) => {
    setSelectedCust(cust);
    setCustSearch(cust.name);
    setShowCustDrop(false);
    setErrors((prev) => ({ ...prev, customer: null }));
    // Fetch known contacts for this customer
    fetch(`${API_URL}/customers/${cust.id}/contacts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((contacts) => setKnownContacts(contacts))
      .catch(() => setKnownContacts([]));
  };

  // v28.79 — category-driven contact resolution. Reads `category` first
  // (v28.72 canonical) with `role_tag` fallback for pre-migration rows.
  // Site Manager / Company Man / DSM all map to `site_rep` per the v28.72
  // call, so a POC pick may surface either a poc-categorized or
  // site_rep-categorized row.
  const contactCategory = (c) => c?.category || c?.role_tag;
  const isPocCategory = (cat) => ["poc", "site_rep", "site_manager", "company_man"].includes(cat);
  const isApproverCategory = (cat) => cat === "approver";

  const applyContact = (c) => {
    const cat = contactCategory(c);
    const phoneForApply = c.phone_work || c.phone || "";
    if (isPocCategory(cat)) {
      setContactFirst(c.name.split(" ")[0] || "");
      setContactLast(c.name.split(" ").slice(1).join(" ") || "");
      setPhone(phoneForApply);
      setEmail(c.email || "");
    }
    if (isApproverCategory(cat)) {
      setApprover(c.name.split(" ")[0] || "");
      setApproverLast(c.name.split(" ").slice(1).join(" ") || "");
      setApproverPhone(phoneForApply);
      setApproverEmail(c.email || "");
    }
  };

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

  const addWell = () => {
    if (wellList.length < 10) setWellList((prev) => [...prev, ""]);
  };
  // v28.42 — auto-grow: typing in the last row spawns a fresh empty below
  // (up to the 10-row cap). User no longer needs to hit "+ ADD WELL" between
  // entries. Empty rows drop on submit via cleanWells.
  const updateWell = (idx, val) =>
    setWellList((prev) => {
      const next = prev.map((w, i) => (i === idx ? val : w));
      const isLastRow = idx === prev.length - 1;
      const wasEmpty = !prev[idx]?.trim();
      const becameNonEmpty = !!val.trim();
      if (isLastRow && wasEmpty && becameNonEmpty && next.length < 10) {
        next.push("");
      }
      return next;
    });
  const removeWell = (idx) => setWellList((prev) => prev.filter((_, i) => i !== idx));
  const handleClose = () => {
    if (isDirty) {
      setShowUnsaved(true);
    } else {
      onClose();
    }
  };

  // Resolve Google pin → lat/lng → geocode → state/county
  const resolvePin = async (pinUrl) => {
    if (!pinUrl.trim()) return;
    setPinResolving(true);
    setPinError("");
    try {
      // Step 1: resolve short URL to coordinates via existing backend resolver
      const resolveR = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: pinUrl.trim() }),
      });
      if (!resolveR.ok) {
        setPinError("Could not resolve pin link. Check the URL and try again.");
        setPinResolving(false);
        return;
      }
      const { lat, lng } = await resolveR.json();
      if (!lat || !lng) {
        setPinError("No coordinates found in this link.");
        setPinResolving(false);
        return;
      }
      setPinLat(lat);
      setPinLng(lng);
      // Step 2: geocode coordinates → state + county
      const geoR = await fetch(`${API_URL}/jobs/geocode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      if (geoR.ok) {
        const { state, county: geoCounty } = await geoR.json();
        if (state) {
          setJobState(state);
          setStateLockedByPin(true);
        }
        if (geoCounty) {
          setCounty(geoCounty);
          setCountyLockedByPin(true);
        }
      }
    } catch {
      setPinError("Network error resolving pin. Try again.");
    }
    setPinResolving(false);
  };

  const handlePinChange = (val) => {
    setGooglePin(val);
    setPinLat(null);
    setPinLng(null);
    setPinError("");
    setStateLockedByPin(false);
    setCountyLockedByPin(false);
  };

  const VALID_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
  ];

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

        {/* Scheduled Date + Salesman — TOP. Mobile stacks columns explicitly
            because flex-wrap math against iOS Safari + native select chevron
            sizing produced a visual overlap at iPhone widths in v28.08. */}
        <div
          style={
            isMobile
              ? { display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }
              : { display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }
          }
        >
          <div style={isMobile ? {} : { flex: 1, minWidth: 140 }}>
            <label style={labelStyle}>SCHEDULED DATE</label>
            <input type="date" style={inputStyle} value={schedDate} onChange={(e) => setSchedDate(e.target.value)} />
          </div>
          <div style={isMobile ? {} : { flex: 1, minWidth: 180 }}>
            <label style={labelStyle}>SALESMAN *</label>
            <select
              style={{ ...inputStyle, borderColor: errors.salesman ? C.red : C.border }}
              value={salesman}
              onChange={(e) => {
                setSalesman(e.target.value);
                setErrors((prev) => ({ ...prev, salesman: null }));
              }}
            >
              <option value="">— Select —</option>
              <option value="No Salesman Assigned">No Salesman Assigned</option>
              {salesmen.map((u) => (
                <option key={u.id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
            {errors.salesman && (
              <div data-error="salesman" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
                ⚠ {errors.salesman}
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <label style={labelStyle}>CUSTOMER *</label>
          <input
            style={{ ...inputStyle, borderColor: errors.customer ? C.red : selectedCust ? C.green : C.border }}
            value={custSearch}
            onChange={(e) => {
              setCustSearch(e.target.value);
              setShowCustDrop(true);
              setSelectedCust(null);
              setErrors((prev) => ({ ...prev, customer: null }));
            }}
            onFocus={() => setShowCustDrop(true)}
            placeholder="Type to search or browse..."
          />
          {errors.customer && (
            <div data-error="customer" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
              ⚠ {errors.customer}
            </div>
          )}
          {showCustDrop && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                boxShadow: "0 8px 32px #00000022",
                maxHeight: 220,
                overflowY: "auto",
                marginTop: 2,
              }}
            >
              {filteredCust.map((c) => (
                <div
                  key={c.name}
                  onClick={() => selectCustomer(c)}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontWeight: 700, color: C.text }}>{c.name}</span>
                  <span style={{ color: C.muted, fontSize: 11 }}>{[c.city, c.state].filter(Boolean).join(", ")}</span>
                </div>
              ))}
              {filteredCust.length === 0 && custSearch.trim() && (
                <div style={{ padding: 10, color: C.muted, fontSize: 12, textAlign: "center" }}>No matches</div>
              )}
              <div
                onClick={() => {
                  setShowCustDrop(false);
                  setNewCustName(custSearch.trim());
                  setShowAddCust(true);
                }}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.blue,
                  borderTop: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#e8f0fb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                + Add New Customer
              </div>
            </div>
          )}
          {showAddCust && (
            <div
              style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
              onClick={() => setShowAddCust(false)}
            >
              <div
                style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderTop: `4px solid ${C.blue}`,
                  borderRadius: 8,
                  padding: 24,
                  width: 420,
                  maxWidth: "90vw",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 12 }}>ADD NEW CUSTOMER</div>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>This customer will be created in FTI and flagged for QuickBooks sync.</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>CUSTOMER NAME *</label>
                  <input style={inputStyle} value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Company name" autoFocus />
                </div>
                {newCustMsg && (
                  <div style={{ fontSize: 11, color: newCustMsg.includes("fail") ? C.red : C.green, marginBottom: 8, fontWeight: 700 }}>{newCustMsg}</div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    onClick={async () => {
                      if (!newCustName.trim()) {
                        setNewCustMsg("Name is required.");
                        return;
                      }
                      try {
                        const r = await fetch(`${API_URL}/customers`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name: newCustName.trim() }),
                        });
                        if (r.ok) {
                          const created = await r.json();
                          await refreshCustomers();
                          selectCustomer(created);
                          setShowAddCust(false);
                          setNewCustName("");
                          setNewCustMsg("");
                        } else {
                          const d = await r.json().catch(() => null);
                          setNewCustMsg(d?.error || "Failed to create customer.");
                        }
                      } catch {
                        setNewCustMsg("Error creating customer.");
                      }
                    }}
                  >
                    CREATE CUSTOMER
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={() => {
                      setShowAddCust(false);
                      setNewCustMsg("");
                    }}
                  >
                    CANCEL
                  </Btn>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contact info */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>CONTACT INFORMATION</div>

          {/* Point of Contact — category-filtered dropdown. v28.79: filter
              uses `category` (canonical) with `role_tag` fallback for
              pre-v28.72 rows. POC picker INCLUDES site_rep (since Site
              Manager / Company Man / DSM all canonicalize to site_rep).
              Inactive contacts are excluded — soft-deleted entries don't
              clutter the picker. */}
          <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.1em", marginBottom: 6 }}>POINT OF CONTACT</div>
          {(() => {
            const pocOptions = knownContacts.filter((c) => c.is_active !== false && isPocCategory(contactCategory(c)));
            if (pocOptions.length === 0) return null;
            return (
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>EXISTING POC FOR THIS CUSTOMER</label>
                <select
                  style={{ ...inputStyle, maxWidth: 420 }}
                  defaultValue=""
                  onChange={(e) => {
                    const c = pocOptions.find((o) => String(o.id) === e.target.value);
                    if (c) applyContact(c);
                    e.target.value = ""; // reset so same selection can be chosen again after edits
                  }}
                >
                  <option value="">— Choose existing contact or enter new below —</option>
                  {pocOptions.map((c) => {
                    const cat = contactCategory(c);
                    const titlePart = c.title ? ` · ${c.title === "Other" && c.title_other ? c.title_other : c.title}` : "";
                    const phonePart = c.phone_work || c.phone ? ` · ${c.phone_work || c.phone}` : "";
                    const legacyTag = ["site_manager", "company_man"].includes(cat) ? " (legacy)" : "";
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {titlePart}
                        {phonePart}
                        {legacyTag}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>FIRST NAME *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.contactFirst ? C.red : C.border }}
                value={contactFirst}
                onChange={(e) => {
                  setContactFirst(e.target.value);
                  setErrors((prev) => ({ ...prev, contactFirst: null }));
                }}
                placeholder="First"
              />
              {errors.contactFirst && (
                <div data-error="contactFirst" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
                  ⚠ {errors.contactFirst}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>LAST NAME *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.contactLast ? C.red : C.border }}
                value={contactLast}
                onChange={(e) => {
                  setContactLast(e.target.value);
                  setErrors((prev) => ({ ...prev, contactLast: null }));
                }}
                placeholder="Last"
              />
              {errors.contactLast && (
                <div data-error="contactLast" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
                  ⚠ {errors.contactLast}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>PHONE *</label>
              <input
                style={{ ...inputStyle, borderColor: errors.phone ? C.red : C.border }}
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  setErrors((prev) => ({ ...prev, phone: null }));
                }}
                placeholder="555-555-5555"
              />
              {errors.phone && (
                <div data-error="phone" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
                  ⚠ {errors.phone}
                </div>
              )}
              <SmsConsentCheckbox phone={phone} recipientType="customer_rep" consentIntent={pocConsentIntent} setConsentIntent={setPocConsentIntent} />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                style={{ ...inputStyle, borderColor: errors.email ? C.red : C.border }}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: null }));
                }}
                placeholder="sitemanager@company.com"
              />
              {errors.email && (
                <div data-error="email" style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
                  {errors.email}
                </div>
              )}
            </div>
          </div>

          {/* Approver — category-filtered dropdown. v28.79 BUG FIX: the
              previous filter included `role_tag === "company_man"` here,
              which was wrong — Company Man is a SITE-REP role (canonical
              site_rep), not an Approver. Reggie's call: "Site Mgr / Co Man
              / DSM all mean the same thing" — they're all on-site reps.
              v28.72 migration already canonicalized company_man → site_rep,
              so this filter now reads ONLY category=approver. */}
          <div style={{ fontSize: 10, fontWeight: 800, color: C.blue, letterSpacing: "0.1em", marginBottom: 6 }}>APPROVER</div>
          {(() => {
            const approverOptions = knownContacts.filter((c) => c.is_active !== false && isApproverCategory(contactCategory(c)));
            if (approverOptions.length === 0) return null;
            return (
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>EXISTING APPROVER FOR THIS CUSTOMER</label>
                <select
                  style={{ ...inputStyle, maxWidth: 420 }}
                  defaultValue=""
                  onChange={(e) => {
                    const c = approverOptions.find((o) => String(o.id) === e.target.value);
                    if (c) applyContact(c);
                    e.target.value = "";
                  }}
                >
                  <option value="">— Choose existing approver or enter new below —</option>
                  {approverOptions.map((c) => {
                    const titlePart = c.title ? ` · ${c.title === "Other" && c.title_other ? c.title_other : c.title}` : "";
                    const phonePart = c.phone_work || c.phone ? ` · ${c.phone_work || c.phone}` : "";
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {titlePart}
                        {phonePart}
                      </option>
                    );
                  })}
                </select>
              </div>
            );
          })()}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
            <div>
              <label style={labelStyle}>FIRST NAME</label>
              <input style={inputStyle} value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="First" />
            </div>
            <div>
              <label style={labelStyle}>LAST NAME</label>
              <input style={inputStyle} value={approverLast} onChange={(e) => setApproverLast(e.target.value)} placeholder="Last" />
            </div>
            <div>
              <label style={labelStyle}>PHONE</label>
              <input style={inputStyle} value={approverPhone} onChange={(e) => setApproverPhone(formatPhone(e.target.value))} placeholder="555-555-5555" />
              <SmsConsentCheckbox
                phone={approverPhone}
                recipientType="customer_rep"
                consentIntent={approverConsentIntent}
                setConsentIntent={setApproverConsentIntent}
              />
            </div>
            <div>
              <label style={labelStyle}>EMAIL</label>
              <input
                style={{ ...inputStyle, borderColor: errors.approverEmail ? C.red : C.border }}
                value={approverEmail}
                onChange={(e) => {
                  setApproverEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, approverEmail: null }));
                }}
                placeholder="approver@company.com"
              />
              {errors.approverEmail && (
                <div data-error="approverEmail" style={{ fontSize: 11, color: C.red, marginTop: 3 }}>
                  {errors.approverEmail}
                </div>
              )}
            </div>
          </div>
        </div>

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

          {/* Google Pin — first */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>
              GOOGLE PIN <span style={{ fontSize: 10, color: C.muted, fontWeight: 400, letterSpacing: 0 }}>— Google Maps links only</span>
            </label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <input
                style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
                value={googlePin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="Paste Google Maps link..."
              />
              <button
                type="button"
                onClick={() => resolvePin(googlePin)}
                disabled={!googlePin.trim() || pinResolving}
                style={{
                  background: googlePin.trim() ? C.blue : C.steel,
                  color: googlePin.trim() ? C.white : C.muted,
                  border: "none",
                  borderRadius: 4,
                  padding: "8px 14px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: googlePin.trim() ? "pointer" : "default",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
              >
                {pinResolving ? "Resolving..." : "RESOLVE"}
              </button>
            </div>
            {pinError && <div style={{ fontSize: 11, color: C.red, marginTop: 4, fontWeight: 700 }}>⚠ {pinError}</div>}
            {pinLat && pinLng && (
              <div style={{ marginTop: 6, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>✓ PIN RESOLVED</span>
                <span style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
                  {parseFloat(pinLat).toFixed(6)}, {parseFloat(pinLng).toFixed(6)}
                </span>
                <a
                  href={`https://www.google.com/maps?q=${pinLat},${pinLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 10, color: C.blue, fontWeight: 600, textDecoration: "none" }}
                >
                  View on Google Maps ↗
                </a>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(googlePin || `${pinLat},${pinLng}`);
                  }}
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 3,
                    padding: "2px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: C.muted,
                    cursor: "pointer",
                  }}
                >
                  COPY PIN
                </button>
              </div>
            )}
          </div>

          {/* State / County — derived from pin, manually editable with warning */}
          {(stateLockedByPin || countyLockedByPin) && (
            <div
              style={{
                fontSize: 11,
                color: C.blue,
                background: "#e8f0fb",
                border: `1px solid ${C.blue}22`,
                borderRadius: 4,
                padding: "6px 10px",
                marginBottom: 8,
              }}
            >
              State and County are auto-filled from the pin. Editing them manually will break the pin association.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={labelStyle}>STATE *</label>
                {stateLockedByPin && (
                  <button
                    type="button"
                    onClick={() => setStateLockedByPin(false)}
                    style={{ background: "transparent", border: "none", fontSize: 10, color: C.muted, cursor: "pointer", padding: 0 }}
                  >
                    unlock
                  </button>
                )}
              </div>
              <input
                style={{ ...inputStyle, borderColor: errors.jobState ? C.red : stateLockedByPin ? C.blue : C.border }}
                value={jobState}
                onChange={(e) => !stateLockedByPin && setJobState(formatState(e.target.value))}
                readOnly={stateLockedByPin}
                placeholder="TX"
                maxLength={2}
              />
              {errors.jobState && (
                <div data-error="jobState" style={{ fontSize: 10, color: C.red, marginTop: 2 }}>
                  {errors.jobState}
                </div>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={labelStyle}>COUNTY *</label>
                {countyLockedByPin && (
                  <button
                    type="button"
                    onClick={() => setCountyLockedByPin(false)}
                    style={{ background: "transparent", border: "none", fontSize: 10, color: C.muted, cursor: "pointer", padding: 0 }}
                  >
                    unlock
                  </button>
                )}
              </div>
              <input
                style={{ ...inputStyle, borderColor: errors.county ? C.red : countyLockedByPin ? C.blue : C.border }}
                value={county}
                onChange={(e) => {
                  if (!countyLockedByPin) {
                    setCounty(e.target.value);
                    setShowCountyDrop(true);
                    setErrors((prev) => ({ ...prev, county: null }));
                  }
                }}
                onFocus={() => !countyLockedByPin && setShowCountyDrop(true)}
                onBlur={() => setTimeout(() => setShowCountyDrop(false), 150)}
                placeholder="Start typing..."
                readOnly={countyLockedByPin}
              />
              {errors.county && (
                <div data-error="county" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
                  ⚠ {errors.county}
                </div>
              )}
              {showCountyDrop && filteredCounties.length > 0 && !countyLockedByPin && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: C.cardBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 4,
                    boxShadow: "0 4px 16px #00000022",
                    maxHeight: 180,
                    overflowY: "auto",
                    marginTop: 2,
                  }}
                >
                  {filteredCounties.map((c) => (
                    <div
                      key={c}
                      onMouseDown={() => {
                        setCounty(c);
                        setShowCountyDrop(false);
                      }}
                      style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {c}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Wells */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>WELL NAME / LOCATION *</div>
              <label
                style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, fontWeight: 700, color: wellTBD ? C.blue : C.muted }}
              >
                <input
                  type="checkbox"
                  checked={wellTBD}
                  onChange={(e) => {
                    setWellTBD(e.target.checked);
                    if (e.target.checked) setErrors((prev) => ({ ...prev, wells: null }));
                  }}
                  style={{ width: 14, height: 14, accentColor: C.blue }}
                />
                TBD
              </label>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {wellList.length > 1 && (
                <span style={{ fontSize: 11, color: C.muted }}>
                  {wellList.filter((w) => w.trim()).length} of {wellList.length} named
                </span>
              )}
              {wellList.length < 10 && (
                <button
                  type="button"
                  onClick={addWell}
                  style={{
                    background: "transparent",
                    border: `1px solid ${C.border}`,
                    borderRadius: 3,
                    padding: "2px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.text,
                    cursor: "pointer",
                  }}
                >
                  + ADD WELL
                </button>
              )}
            </div>
          </div>
          {wellTBD ? (
            <div style={{ padding: "10px 0", fontSize: 12, color: C.muted, fontStyle: "italic" }}>
              Well name will be set to TBD — update via Edit Work Order when known.
            </div>
          ) : (
            <>
              {wellList.map((w, idx) => (
                <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 20, textAlign: "right" }}>{idx + 1}.</div>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={w}
                    onChange={(e) => updateWell(idx, e.target.value)}
                    placeholder="Well name or CTB name..."
                  />
                  {wellList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeWell(idx)}
                      style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "0 4px" }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
          {errors.wells && (
            <div data-error="wells" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
              ⚠ {errors.wells}
            </div>
          )}
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>AFE</label>
            <input style={{ ...inputStyle, maxWidth: 240 }} value={afe} onChange={(e) => setAfe(e.target.value)} placeholder="AFE number if applicable" />
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
          <textarea
            style={{ ...inputStyle, minHeight: 60, resize: "vertical", width: "100%", boxSizing: "border-box" }}
            value={jobNotes}
            onChange={(e) => setJobNotes(e.target.value)}
            placeholder="Internal notes — visible on work order only, not on field tickets"
          />
        </div>

        {/* Scheduling */}

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn onClick={validateAndCreate}>CREATE WORK ORDER</Btn>
          <Btn onClick={handleClose} variant="ghost">
            CANCEL
          </Btn>
        </div>

        {/* Unsaved changes confirmation */}
        {showUnsaved && (
          <div
            style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
            onClick={() => setShowUnsaved(false)}
          >
            <div
              style={{
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderTop: `4px solid ${C.red}`,
                borderRadius: 8,
                padding: 24,
                width: 380,
                maxWidth: "90vw",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
              <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
                You have unsaved information. Are you sure you want to close without creating this job?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={onClose}>YES, DISCARD</Btn>
                <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>
                  KEEP EDITING
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NewJobModal;
