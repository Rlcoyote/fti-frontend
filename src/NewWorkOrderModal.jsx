// ─── NewWorkOrderModal (v28.104 — final shell, 11 of 11 ships) ───────────────────
// Composition root for the "Create Work Order" modal. Was a 1306-line
// monolith pre-v28.94. The v28.94 → v28.104 file-split arc lifted ten
// coherent units into siblings:
//
//   Hooks                                      Components
//   ─────                                      ──────────
//   useNewWorkOrderMobileBack       (v28.96)         NewWorkOrderUnsavedConfirm    (v28.95)
//   useNewWorkOrderForm             (v28.104)        NewWorkOrderNotesField        (v28.97)
//                                              NewWorkOrderWellsPanel        (v28.98)
//                                              NewWorkOrderScheduleSalesman  (v28.99)
//                                              NewWorkOrderLocationPanel     (v28.100)
//                                              NewWorkOrderGooglePin         (v28.101)
//                                              NewWorkOrderContactsPanel     (v28.102)
//                                              NewWorkOrderCustomerPicker    (v28.103)
//
//   Constants: Geography.js — TX/NM counties + VALID_STATES
//
// What's left here is pure orchestration: useApp + useIsMobile +
// useNewWorkOrderMobileBack + useNewWorkOrderForm at the top, then JSX wiring the
// hook's bag into the sibling components.
//
// The Billing block remains inline (three small text inputs — splitting
// would fragment more than simplify). Same call from the Plan agent: a
// thin coherent unit can stay inline.

import useIsMobile from "./useIsMobile.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { C } from "./config.js";
import { Btn, inputStyle, labelStyle, Z_INDEX } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import useNewWorkOrderMobileBack from "./useNewWorkOrderMobileBack.js";
import useNewWorkOrderForm from "./useNewWorkOrderForm.js";
import NewWorkOrderUnsavedConfirm from "./NewWorkOrderUnsavedConfirm.jsx";
import NewWorkOrderNotesField from "./NewWorkOrderNotesField.jsx";
import NewWorkOrderWellsPanel from "./NewWorkOrderWellsPanel.jsx";
import NewWorkOrderScheduleSalesman from "./NewWorkOrderScheduleSalesman.jsx";
import NewWorkOrderLocationPanel from "./NewWorkOrderLocationPanel.jsx";
import NewWorkOrderGooglePin from "./NewWorkOrderGooglePin.jsx";
import NewWorkOrderContactsPanel from "./NewWorkOrderContactsPanel.jsx";
import NewWorkOrderCustomerPicker from "./NewWorkOrderCustomerPicker.jsx";

function NewWorkOrderModal({ onClose, onCreateJob }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  const { customers, users, refreshCustomers } = useApp();
  const isMobile = useIsMobile();
  useNewWorkOrderMobileBack(onClose);
  const f = useNewWorkOrderForm({ onClose, onCreateJob });
  const salesmen = users.filter((u) => u.role === "salesman");

  return (
    <div
      className="fti-modal-selectable"
      style={
        isMobile
          ? { position: "fixed", inset: 0, background: C.cardBg, zIndex: Z_INDEX.modal, overflowY: "auto", WebkitOverflowScrolling: "touch" }
          : { position: "fixed", inset: 0, background: C.scrim, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }
      }
      onClick={isMobile ? undefined : f.handleClose}
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

        <NewWorkOrderScheduleSalesman
          schedDate={f.schedDate}
          setSchedDate={f.setSchedDate}
          salesman={f.salesman}
          setSalesman={f.setSalesman}
          salesmenList={salesmen}
          isMobile={isMobile}
          error={f.errors.salesman}
          clearError={() => f.clearError("salesman")}
        />

        <NewWorkOrderCustomerPicker
          customers={customers}
          refreshCustomers={refreshCustomers}
          custSearch={f.custSearch}
          setCustSearch={f.setCustSearch}
          selectedCust={f.selectedCust}
          setSelectedCust={f.setSelectedCust}
          setKnownContacts={f.setKnownContacts}
          error={f.errors.customer}
          clearError={() => f.clearError("customer")}
        />

        <NewWorkOrderContactsPanel
          knownContacts={f.knownContacts}
          contactFirst={f.contactFirst}
          setContactFirst={f.setContactFirst}
          contactLast={f.contactLast}
          setContactLast={f.setContactLast}
          phone={f.phone}
          setPhone={f.setPhone}
          email={f.email}
          setEmail={f.setEmail}
          pocConsentIntent={f.pocConsentIntent}
          setPocConsentIntent={f.setPocConsentIntent}
          approver={f.approver}
          setApprover={f.setApprover}
          approverLast={f.approverLast}
          setApproverLast={f.setApproverLast}
          approverPhone={f.approverPhone}
          setApproverPhone={f.setApproverPhone}
          approverEmail={f.approverEmail}
          setApproverEmail={f.setApproverEmail}
          approverConsentIntent={f.approverConsentIntent}
          setApproverConsentIntent={f.setApproverConsentIntent}
          errors={f.errors}
          clearError={f.clearError}
          formatPhone={f.formatPhone}
        />

        {/* Billing — three small fields, kept inline per Plan-agent recommendation */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>BILLING INFORMATION</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <div>
              <label style={labelStyle}>COMPANY CODE</label>
              <input style={inputStyle} value={f.companyCode} onChange={(e) => f.setCompanyCode(e.target.value)} placeholder="e.g. 0064" />
            </div>
            <div>
              <label style={labelStyle}>COST CENTER</label>
              <input style={inputStyle} value={f.costCenter} onChange={(e) => f.setCostCenter(e.target.value)} placeholder="Cost center" />
            </div>
            <div>
              <label style={labelStyle}>PO NUMBER</label>
              <input style={inputStyle} value={f.po} onChange={(e) => f.setPo(e.target.value)} placeholder="Optional" />
            </div>
          </div>
        </div>

        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 10 }}>LOCATION</div>
          <NewWorkOrderGooglePin
            googlePin={f.googlePin}
            setGooglePin={f.setGooglePin}
            pinLat={f.pinLat}
            setPinLat={f.setPinLat}
            pinLng={f.pinLng}
            setPinLng={f.setPinLng}
            onResolveSuccess={({ state, county: geoCounty }) => {
              if (state) {
                f.setJobState(state);
                f.setStateLockedByPin(true);
              }
              if (geoCounty) {
                f.setCounty(geoCounty);
                f.setCountyLockedByPin(true);
              }
            }}
            onResolveClear={() => {
              f.setStateLockedByPin(false);
              f.setCountyLockedByPin(false);
            }}
          />
          <NewWorkOrderLocationPanel
            jobState={f.jobState}
            setJobState={f.setJobState}
            county={f.county}
            setCounty={f.setCounty}
            stateLockedByPin={f.stateLockedByPin}
            setStateLockedByPin={f.setStateLockedByPin}
            countyLockedByPin={f.countyLockedByPin}
            setCountyLockedByPin={f.setCountyLockedByPin}
            errors={{ jobState: f.errors.jobState, county: f.errors.county }}
            clearError={f.clearError}
          />
          {/* v28.181 — Geofence radius around the primary pin. 300ft default
              covers a typical well pad + GPS drift margin. Editable for unusual
              sites (large frac sites, pipeline yards, etc.). */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>GEOFENCE RADIUS (FT)</label>
            <input
              type="number"
              style={{ ...inputStyle, width: 100 }}
              value={f.locationRadiusFt}
              onChange={(e) => f.setLocationRadiusFt(e.target.value)}
              min={50}
              max={5000}
            />
            <span style={{ fontSize: 11, color: C.muted, fontStyle: "italic" }}>
              Default 300ft. Crew arrival/departure events fire when a vehicle crosses this circle around the WO pin.
            </span>
          </div>
        </div>

        <NewWorkOrderWellsPanel
          wellList={f.wellList}
          setWellList={f.setWellList}
          wellOverrides={f.wellOverrides}
          setWellOverrides={f.setWellOverrides}
          wellTBD={f.wellTBD}
          setWellTBD={f.setWellTBD}
          afe={f.afe}
          setAfe={f.setAfe}
          wellsError={f.errors.wells}
          clearWellsError={() => f.clearError("wells")}
        />

        <NewWorkOrderNotesField value={f.jobNotes} onChange={f.setJobNotes} />

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <Btn onClick={f.validateAndCreate}>CREATE WORK ORDER</Btn>
          <Btn onClick={f.handleClose} variant="ghost">
            CANCEL
          </Btn>
        </div>

        <NewWorkOrderUnsavedConfirm open={f.showUnsaved} onDiscard={onClose} onDismiss={() => f.setShowUnsaved(false)} />
      </div>
    </div>
  );
}

export default NewWorkOrderModal;
