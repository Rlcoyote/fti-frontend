import { useState, useMemo } from "react";
import { C, API_URL } from "./config.js";
import { calcLineTotal, parseYards } from "./utils.js";
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
import TicketStatusBanners from "./TicketStatusBanners.jsx";
import TicketJobInfo from "./TicketJobInfo.jsx";
import TicketCrewManager from "./TicketCrewManager.jsx";
import TicketRigDownMissing from "./TicketRigDownMissing.jsx";
import { inputStyle, TICKET_TYPES } from "./SharedUI.jsx";
import useEditLock from "./useEditLock.js";
import useTicketState from "./useTicketState.js";
import useTicketJSA from "./useTicketJSA.js";
import useSignaturePolling from "./useSignaturePolling.js";
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
  const { qbItems, currentUser, settings } = useApp();
  const [isMobile] = useState(() => window.innerWidth <= 900);
  const yardsList = useMemo(() => parseYards(settings), [settings]);

  // Parent WO this ticket belongs to (needed before useTicketState so the
  // hook can derive contact email / customer contacts).
  const job = (jobs || []).find(j => j.id === ticket.jobId);

  // ── All ticket field state + dirty tracking + payload builder (v27.88) ──
  const s = useTicketState(ticket, job);

  // ── JSA lifecycle (v27.88) ──────────────────────────────────────────────
  const jsa = useTicketJSA(ticket, job, onUpdate);

  // ── Signature arrival polling (v27.88) ──────────────────────────────────
  // Fires every 30s while status === "emailed" and !signedBy. Flips local
  // state when the external signer lands on the /sign/:token page.
  useSignaturePolling(
    ticket.id,
    ticket.jobId,
    s.status,
    s.signedBy,
    ({ signedBy, signedAt, signatureImage }) => {
      s.setSignedBy(signedBy);
      s.setSignedAt(signedAt);
      s.setSignatureImage(signatureImage);
      s.setStatus("signed");
    }
  );

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
  const canApprove = ["owner", "admin", "manager", "lead"].includes(currentUser?.role);

  // Auto-save site manager as customer contact (upsert — backend deduplicates)
  const saveSiteMgrAsContact = () => {
    const custId = job?.customerId || job?.customer_id;
    const fullName = [s.siteMgrFirst, s.siteMgrLast].filter(Boolean).join(" ").trim();
    if (!fullName || !custId) return;
    fetch(`${API_URL}/customers/${custId}/contacts`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fullName, phone: s.siteMgrPhone || null, email: s.siteMgrEmail || null, role_tag: "site_manager" }),
    }).catch(() => {});
  };

  const save = (overrides = {}) => {
    if (!editable && !overrides.status) return; // Don't save if locked and no status override
    saveSiteMgrAsContact();
    const updates = { ...s.buildPayload(ticket.type), ...overrides };
    onUpdate(ticket.id, updates);
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
    // If ticket was approved, revert approval
    if (["approved", "sentToQB"].includes(s.status)) {
      s.setStatus("inField");
    }
  };

  const handleSign = ({ name, date, imageData }) => {
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

  const handleSave = () => {
    if (s.sigWiped) {
      save({ signedBy: null, signedAt: null, signatureImage: null, status: "inField" });
      s.setStatus("inField");
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
    s.setStatus("sigNotReq");
    setShowSigOptions(false);
    save({ status: "sigNotReq", sigNotReqReason: s.sigNotReqReason, sigNotReqNote: s.sigNotReqNote, signedBy: null, signedAt: null, signatureImage: null });
  };

  const handleApprove = () => {
    s.setStatus("approved");
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
        <TicketJsaBar ticket={ticket} jsaLoaded={jsa.jsaLoaded} existingJSA={jsa.existingJSA} onOpen={() => jsa.setShowJSA(true)} />

        {/* Header row — extracted to TicketHeaderRow (v27.83) */}
        <TicketHeaderRow
          ticket={ticket} status={s.status} total={total}
          isLocked={isLocked} isFullyLocked={isFullyLocked} editable={editable}
          job={job} isPageMode={isPageMode}
          ticketDate={s.ticketDate} onDateChange={handleDateChange}
          dueOnLoc={s.dueOnLoc} setDueOnLoc={s.setDueOnLoc}
          timeZone={s.timeZone} setTimeZone={s.setTimeZone}
          yardLocationIndex={s.yardLocationIndex} setYardLocationIndex={s.setYardLocationIndex}
          yardsList={yardsList}
        />

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

        {/* Ticket-level crew + lead designation (v28.06). Prereq for v28.07
            JSA biometric flow — JSA auto-populates required signers from
            this list. Hidden until ticket has an id (skip on the create
            flow before ticket exists in DB). */}
        {ticket?.id && (
          <TicketCrewManager
            ticketId={ticket.id}
            ticketIsClosed={isFullyLocked || !!ticket.voidedAt || !!ticket.deletedAt}
            editable={editable}
          />
        )}

        {/* Time & Mileage — extracted to TicketTimeAndMileage (v27.78) */}
        {!['Rental'].includes(ticket.type) && (
          <TicketTimeAndMileage
            editable={editable}
            values={{
              lvYard: s.lvYard, arrivalTime: s.arrivalTime,
              jobStartTime: s.jobStartTime, jobEndTime: s.jobEndTime,
              retYard: s.retYard, timeZone: s.timeZone,
              mileageBegin: s.mileageBegin, mileageEnd: s.mileageEnd,
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
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ destLat: s.ticketPinLat, destLng: s.ticketPinLng, yard_index: s.yardLocationIndex }),
              });
              if (r.ok) { const d = await r.json(); s.setDriveInfo(d); }
              else s.setDriveInfo({ error: "Could not calculate — check yard location in Settings" });
            } catch { s.setDriveInfo({ error: "Network error" }); }
            s.setDriveLoading(false);
          }}
        />

        {/* Body */}
        <div style={{ padding: "16px 24px" }}>

          {/* Status banners — extracted to TicketStatusBanners (v27.85) */}
          <TicketStatusBanners
            ticket={ticket} status={s.status}
            signedBy={s.signedBy} isEditing={s.isEditing} sigWiped={s.sigWiped}
          />

          {/* Rig Down missing-pieces — extracted to TicketRigDownMissing (v27.86) */}
          <TicketRigDownMissing
            ticketType={ticket.type}
            isLocked={isLocked}
            missingPieces={s.missingPieces}
            setMissingPieces={s.setMissingPieces}
          />

          {/* Line items */}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>LINE ITEMS</div>
          {!isLocked ? (
            <LineItemEditor lineItems={s.lineItems} setLineItems={s.setLineItems} ticketType={ticket.type} qbItems={qbItems} onSigWipe={handleSigWipe} jobId={ticket.jobId} />
          ) : (
            <ReadOnlyLineItems lineItems={s.lineItems} ticketType={ticket.type} total={total} />
          )}

          {/* Notes */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>NOTES</div>
            {!isFullyLocked ? (
              <textarea style={{ ...inputStyle, width: "100%", minHeight: 60, resize: "vertical", boxSizing: "border-box" }}
                value={s.notes} onChange={e => s.setNotes(e.target.value)} placeholder="Notes..." />
            ) : (
              <div style={{ fontSize: 12, color: C.text, padding: "8px 0" }}>{s.notes || "—"}</div>
            )}
          </div>

          {/* Photos */}
          <PhotoStrip ticketId={ticket.id} isLocked={isFullyLocked || !!ticket.voidedAt} />

          {/* Signature flow — extracted to TicketSignatureFlow (v27.84) */}
          <TicketSignatureFlow
            status={s.status}
            signedBy={s.signedBy} signedAt={s.signedAt} signatureImage={s.signatureImage}
            sigNotReqReason={s.sigNotReqReason} sigNotReqNote={s.sigNotReqNote}
            showSigOptions={showSigOptions}
            setSigNotReqReason={s.setSigNotReqReason} setSigNotReqNote={s.setSigNotReqNote}
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
          status={s.status}
          isLocked={isLocked} isFullyLocked={isFullyLocked} isEditing={s.isEditing}
          sigWiped={s.sigWiped} signedBy={s.signedBy}
          existingJSA={jsa.existingJSA} jsaLoaded={jsa.jsaLoaded}
          canApprove={canApprove}
          showSigPad={showSigPad} showSigOptions={showSigOptions}
          handleSave={handleSave} handleClose={handleClose}
          handleCancel={handleCancel} handleApprove={handleApprove}
          onClose={onClose}
          setIsEditing={s.setIsEditing}
          setShowSigPad={setShowSigPad} setShowSigOptions={setShowSigOptions}
          setShowJSA={jsa.setShowJSA}
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

        {/* JSA Modal — save handler lives in useTicketJSA (v27.88) */}
        {jsa.showJSA && job && (
          <JSAModal
            job={job}
            ticket={{ ...ticket, date: s.ticketDate, pinLat: s.ticketPinLat || ticket.pinLat, pinLng: s.ticketPinLng || ticket.pinLng, googlePin: s.ticketPin || ticket.googlePin }}
            existingJSA={jsa.existingJSA}
            onClose={() => jsa.setShowJSA(false)}
            onSave={jsa.handleJsaSave}
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
