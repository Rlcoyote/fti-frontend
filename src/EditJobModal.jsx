import { useState, useEffect, useRef } from "react";
import useIsMobile from "./useIsMobile.js";
import { C, API_URL } from "./config.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";
import useEditLock from "./useEditLock.js";
import { useApp } from "./AppContext.jsx";
import SmsConsentCheckbox from "./SmsConsentCheckbox.jsx";
import { VALID_STATES, ALL_COUNTIES } from "./Geography.js";
import EditJobLockBanner from "./EditJobLockBanner.jsx";

function EditJobModal({ job, onSave, onClose }) {
  const { currentUser } = useApp();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;
    window.history.pushState({ editJobOpen: true }, "");
    const handlePop = () => {
      onClose();
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [isMobile, onClose]);
  // Edit lock for concurrent access
  const editLock = useEditLock("jobs", job.id, currentUser, () => {
    // Auto-save on timeout — save current state
    onSave({
      customer,
      jobState,
      county,
      wells: wellList.filter((w) => w.trim()),
      afe,
      contact_first: contactFirst,
      contact_last: contactLast,
      poc_phone: pocPhone,
      poc_email: pocEmail,
      approver,
      approver_last: approverLast,
      approver_phone: approverPhone,
      approver_email: approverEmail,
      company_code: companyCode,
      cost_center: costCenter,
      po_number: po,
      status,
      google_pin: editGooglePin,
      pin_lat: editPinLat,
      pin_lng: editPinLng,
    });
  });
  const [customer, setCustomer] = useState(job.customer || "");
  const [jobState, setJobState] = useState(job.jobState || "");
  const [county, setCounty] = useState(job.county || "");
  const [showCountyDrop, setShowCountyDrop] = useState(false);
  const [wellList, setWellList] = useState(() => {
    if (!job.wells || job.wells.length === 0) return [""];
    return job.wells.map((w) => w.well_name || w);
  });
  const [afe, setAfe] = useState(job.afe || "");
  const [contactFirst, setContactFirst] = useState(job.contactFirst || job.contact_first || "");
  const [contactLast, setContactLast] = useState(job.contactLast || job.contact_last || "");
  const [pocPhone, setPocPhone] = useState(job.pocPhone || job.poc_phone || "");
  const [pocEmail, setPocEmail] = useState(job.pocEmail || job.poc_email || "");
  const [approver, setApprover] = useState(job.approver || "");
  const [approverLast, setApproverLast] = useState(job.approverLast || job.approver_last || "");
  const [approverPhone, setApproverPhone] = useState(job.approverPhone || job.approver_phone || "");
  const [approverEmail, setApproverEmail] = useState(job.approverEmail || job.approver_email || "");
  // v28.54 — consent intents for SMS consent capture during edit. Triggered
  // when the user changes a phone number to one that has no existing
  // consent. Posted by useJobActions.handleUpdateJob after the PUT succeeds.
  const [pocConsentIntent, setPocConsentIntent] = useState(false);
  const [approverConsentIntent, setApproverConsentIntent] = useState(false);
  const [companyCode, setCompanyCode] = useState(job.companyCode || job.company_code || "");
  const [costCenter, setCostCenter] = useState(job.costCenter || job.cost_center || "");
  const [po, setPo] = useState(job.po || job.po_number || "");
  const [status, _setStatus] = useState(job.status || "Scheduled");
  const [editGooglePin, setEditGooglePin] = useState(job.googlePin || job.google_pin || "");
  const [editPinLat, setEditPinLat] = useState(job.pinLat || job.pin_lat || null);
  const [editPinLng, setEditPinLng] = useState(job.pinLng || job.pin_lng || null);
  const [editPinResolving, setEditPinResolving] = useState(false);
  const [editPinError, setEditPinError] = useState("");
  const [jobNotes, setJobNotes] = useState(job.notes || "");
  const [showUnsaved, setShowUnsaved] = useState(false);

  // Dirty state detection
  const origRef = useRef({
    customer: job.customer || "",
    jobState: job.jobState || "",
    county: job.county || "",
    wells: !job.wells || job.wells.length === 0 ? [""] : job.wells.map((w) => w.well_name || w),
    afe: job.afe || "",
    contactFirst: job.contactFirst || job.contact_first || "",
    contactLast: job.contactLast || job.contact_last || "",
    pocPhone: job.pocPhone || job.poc_phone || "",
    pocEmail: job.pocEmail || job.poc_email || "",
    approver: job.approver || "",
    approverLast: job.approverLast || job.approver_last || "",
    approverPhone: job.approverPhone || job.approver_phone || "",
    approverEmail: job.approverEmail || job.approver_email || "",
    companyCode: job.companyCode || job.company_code || "",
    costCenter: job.costCenter || job.cost_center || "",
    po: job.po || job.po_number || "",
    status: job.status || "Scheduled",
    googlePin: job.googlePin || job.google_pin || "",
  });
  const isDirty = () => {
    const o = origRef.current;
    return (
      customer !== o.customer ||
      jobState !== o.jobState ||
      county !== o.county ||
      JSON.stringify(wellList) !== JSON.stringify(o.wells) ||
      afe !== o.afe ||
      contactFirst !== o.contactFirst ||
      contactLast !== o.contactLast ||
      pocPhone !== o.pocPhone ||
      pocEmail !== o.pocEmail ||
      approver !== o.approver ||
      approverLast !== o.approverLast ||
      approverPhone !== o.approverPhone ||
      approverEmail !== o.approverEmail ||
      companyCode !== o.companyCode ||
      costCenter !== o.costCenter ||
      po !== o.po ||
      status !== o.status ||
      editGooglePin !== o.googlePin
    );
  };
  const handleClose = () => {
    if (isDirty()) {
      setShowUnsaved(true);
    } else {
      editLock.releaseLock();
      onClose();
    }
  };

  const filteredCounties = county.length > 0 ? ALL_COUNTIES.filter((c) => c.toLowerCase().startsWith(county.toLowerCase())) : [];

  const formatPhone = (val) => {
    const d = val.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  };
  const formatState = (val) =>
    val
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, 2)
      .toUpperCase();

  const addWell = () => {
    if (wellList.length < 10) setWellList((prev) => [...prev, ""]);
  };
  const updateWell = (idx, val) => setWellList((prev) => prev.map((w, i) => (i === idx ? val : w)));
  const removeWell = (idx) => setWellList((prev) => prev.filter((_, i) => i !== idx));

  const sectionHead = (label) => (
    <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8, marginTop: 4 }}>{label}</div>
  );

  return (
    <ModalWrap title={`Edit Work Order #${job.id}`} onClose={handleClose} width={600}>
      {/* Edit-lock banners — extracted to EditJobLockBanner (v28.142) */}
      <EditJobLockBanner editLock={editLock} />
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
              padding: 28,
              width: 400,
              maxWidth: "90vw",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This work order has unsaved changes. Are you sure you want to close?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn
                onClick={() => {
                  editLock.releaseLock();
                  onClose();
                }}
              >
                YES, DISCARD
              </Btn>
              <Btn variant="ghost" onClick={() => setShowUnsaved(false)}>
                KEEP EDITING
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Customer + Status */}
      <div style={{ marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CUSTOMER</label>
          <input style={inputStyle} value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>
      </div>

      {/* Location */}
      {sectionHead("LOCATION")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>STATE</label>
          <input style={inputStyle} value={jobState} onChange={(e) => setJobState(formatState(e.target.value))} placeholder="TX" maxLength={2} />
        </div>
        <div style={{ position: "relative" }}>
          <label style={labelStyle}>COUNTY</label>
          <input
            style={inputStyle}
            value={county}
            onChange={(e) => {
              setCounty(e.target.value);
              setShowCountyDrop(true);
            }}
            onFocus={() => setShowCountyDrop(true)}
            onBlur={() => setTimeout(() => setShowCountyDrop(false), 150)}
            placeholder="Start typing..."
          />
          {showCountyDrop && filteredCounties.length > 0 && (
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
                maxHeight: 160,
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

      {/* Wells */}
      {sectionHead("WELL NAME / LOCATION")}
      {wellList.map((w, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 18 }}>{idx + 1}.</div>
          <input style={{ ...inputStyle, flex: 1 }} value={w} onChange={(e) => updateWell(idx, e.target.value)} placeholder="Well or CTB name..." />
          {wellList.length > 1 && (
            <button
              type="button"
              onClick={() => removeWell(idx)}
              style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700 }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {wellList.length < 10 && (
        <button
          type="button"
          onClick={addWell}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: C.text,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          + ADD WELL
        </button>
      )}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>AFE</label>
        <input style={{ ...inputStyle, maxWidth: 220 }} value={afe} onChange={(e) => setAfe(e.target.value)} placeholder="AFE number if applicable" />
      </div>

      {/* Point of Contact */}
      {sectionHead("POINT OF CONTACT")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
        <div>
          <label style={labelStyle}>FIRST</label>
          <input style={inputStyle} value={contactFirst} onChange={(e) => setContactFirst(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>LAST</label>
          <input style={inputStyle} value={contactLast} onChange={(e) => setContactLast(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>PHONE</label>
          <input style={inputStyle} value={pocPhone} onChange={(e) => setPocPhone(formatPhone(e.target.value))} placeholder="555-555-5555" />
          <SmsConsentCheckbox phone={pocPhone} recipientType="customer_rep" consentIntent={pocConsentIntent} setConsentIntent={setPocConsentIntent} />
        </div>
        <div>
          <label style={labelStyle}>EMAIL</label>
          <input style={inputStyle} value={pocEmail} onChange={(e) => setPocEmail(e.target.value)} placeholder="email@co.com" />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}></div>

      {/* Approver */}
      {sectionHead("APPROVER")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 4 }}>
        <div>
          <label style={labelStyle}>FIRST</label>
          <input style={inputStyle} value={approver} onChange={(e) => setApprover(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>LAST</label>
          <input style={inputStyle} value={approverLast} onChange={(e) => setApproverLast(e.target.value)} />
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
          <input style={inputStyle} value={approverEmail} onChange={(e) => setApproverEmail(e.target.value)} placeholder="email@co.com" />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}></div>

      {/* Billing */}
      {sectionHead("BILLING")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>COMPANY CODE</label>
          <input style={inputStyle} value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>COST CENTER</label>
          <input style={inputStyle} value={costCenter} onChange={(e) => setCostCenter(e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>PO NUMBER</label>
          <input style={inputStyle} value={po} onChange={(e) => setPo(e.target.value)} />
        </div>
      </div>

      {/* Google Pin */}
      {sectionHead("GOOGLE PIN")}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Google Maps links only. Resolving will auto-fill State and County.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
          <input
            style={{ ...inputStyle, flex: 1, fontFamily: "monospace", fontSize: 11 }}
            value={editGooglePin}
            onChange={(e) => {
              setEditGooglePin(e.target.value);
              setEditPinLat(null);
              setEditPinLng(null);
              setEditPinError("");
            }}
            placeholder="Paste Google Maps link..."
          />
          <button
            type="button"
            onClick={async () => {
              if (!editGooglePin.trim()) return;
              setEditPinResolving(true);
              setEditPinError("");
              try {
                const r = await fetch(`${API_URL}/jobs/resolve-map-pin`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url: editGooglePin.trim() }),
                });
                if (!r.ok) {
                  setEditPinError("Could not resolve pin.");
                  setEditPinResolving(false);
                  return;
                }
                const { lat, lng } = await r.json();
                setEditPinLat(lat);
                setEditPinLng(lng);
                // Geocode to state/county
                const geoR = await fetch(`${API_URL}/jobs/geocode`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ lat, lng }),
                });
                if (geoR.ok) {
                  const { state, county: geoCounty } = await geoR.json();
                  if (state) setJobState(state);
                  if (geoCounty) setCounty(geoCounty);
                }
              } catch {
                setEditPinError("Network error.");
              }
              setEditPinResolving(false);
            }}
            disabled={!editGooglePin.trim() || editPinResolving}
            style={{
              background: editGooglePin.trim() ? C.blue : C.steel,
              color: editGooglePin.trim() ? C.white : C.muted,
              border: "none",
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 11,
              fontWeight: 700,
              cursor: editGooglePin.trim() ? "pointer" : "default",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {editPinResolving ? "Resolving..." : "RESOLVE"}
          </button>
          {editGooglePin && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(editGooglePin)}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                padding: "8px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              COPY
            </button>
          )}
        </div>
        {editPinError && <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>⚠ {editPinError}</div>}
        {editPinLat && editPinLng && (
          <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
            ✓ {parseFloat(editPinLat).toFixed(6)}, {parseFloat(editPinLng).toFixed(6)}
          </div>
        )}
        {!editPinLat && editGooglePin && <div style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>Resolve to update coordinates</div>}
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>NOTES</div>
        <textarea
          style={{
            width: "100%",
            padding: "8px 10px",
            border: `1px solid ${C.border}`,
            borderRadius: 4,
            fontSize: 12,
            color: C.text,
            background: C.cardBg,
            minHeight: 60,
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "'Arial', sans-serif",
          }}
          value={jobNotes}
          onChange={(e) => setJobNotes(e.target.value)}
          placeholder="Internal notes — visible on work order only, not on field tickets"
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          onClick={() => {
            if (jobState && !VALID_STATES.includes(jobState)) return;
            const cleanWells = wellList.map((w) => w.trim()).filter(Boolean);
            onSave({
              customer,
              status,
              job_state: jobState,
              county,
              location: [county, jobState].filter(Boolean).join(", ") || job.location,
              wells: cleanWells.length > 0 ? cleanWells.map((w) => ({ well_name: w })) : [{ well_name: "TBD" }],
              afe: afe || null,
              contact_first: contactFirst,
              contact_last: contactLast,
              poc_phone: pocPhone,
              poc_email: pocEmail,
              approver: approver,
              approver_last: approverLast,
              approver_phone: approverPhone,
              approver_email: approverEmail,
              // v28.54 — consent intents passed through to handleUpdateJob
              // for post-save consent recording.
              pocConsentIntent,
              approverConsentIntent,
              company_code: companyCode,
              cost_center: costCenter,
              po_number: po,
              google_pin: editGooglePin || null,
              pin_lat: editPinLat || null,
              pin_lng: editPinLng || null,
              notes: jobNotes || null,
            });
            editLock.releaseLock();
          }}
          disabled={!editLock.hasLock}
        >
          SAVE
        </Btn>
        <Btn
          onClick={() => {
            editLock.releaseLock();
            onClose();
          }}
          variant="ghost"
        >
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default EditJobModal;
