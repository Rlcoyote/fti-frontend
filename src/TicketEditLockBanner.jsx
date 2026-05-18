import { C } from "./config.js";

// ─── TicketEditLockBanner (v27.81) ──────────────────────────────────────────
// Extracted from TicketDetail.jsx. Two edit-lock-related banners combined
// into one module since they share the underlying `editLock` object and
// render mutually-exclusively (you're either the lock holder or someone
// else is):
//
//   1. LockedOut banner — shown when another user holds the lock. Surfaces
//      the holder name, lock timestamp, REQUEST EDIT button, and — for
//      owner/admin — a red FORCE UNLOCK override (for orphan/stale locks).
//
//   2. EditRequestNotification — shown to the lock holder when a different
//      user has pressed REQUEST EDIT. Explains the situation and offers a
//      dismiss button.
//
// Both panels are display-only — all state comes from the useEditLock()
// output the parent passes in. No new state in this component.
//
// Props:
//   editLock — object from useEditLock() hook (isLocked, hasLock,
//              lockedByName, lockedAt, requestedByName, requestEdit,
//              forceUnlock, dismissRequest)
//   currentUserRole — for owner/admin force-unlock visibility

function TicketEditLockBanner({ editLock, currentUserRole }) {
  // Someone else holds the lock
  if (editLock.isLocked && !editLock.hasLock) {
    const nameUnknown = editLock.lockedByName === "Another user";
    const isOwnerOrAdmin = ["owner", "admin"].includes(currentUserRole);
    const lockedAtStr = editLock.lockedAt
      ? new Date(editLock.lockedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      : null;
    return (
      <div
        style={{
          background: "#fdf5d8",
          borderBottom: `1px solid #e6c20044`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#8a6500" }}>
          This ticket is being edited by <strong>{editLock.lockedByName}</strong>.
          {lockedAtStr && <span style={{ fontWeight: 500, marginLeft: 6 }}>Locked at {lockedAtStr}.</span>}
          {!nameUnknown && <span style={{ marginLeft: 6, fontWeight: 500 }}>As soon as they are done, you may edit.</span>}
          {nameUnknown && isOwnerOrAdmin && (
            <span style={{ display: "block", fontSize: 11, fontWeight: 500, marginTop: 4, color: "#8a6500" }}>
              Holder not in user records (orphan / stale lock). Auto-expires after 5 minutes — or force-unlock now.
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={editLock.requestEdit}
            style={{
              background: C.blue,
              color: C.white,
              border: "none",
              borderRadius: 4,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            REQUEST EDIT
          </button>
          {isOwnerOrAdmin && (
            <button
              onClick={editLock.forceUnlock}
              aria-label="Owner/admin override — clears the lock and gives you edit access"
              style={{
                background: "transparent",
                color: C.red,
                border: `1px solid ${C.red}`,
                borderRadius: 4,
                padding: "5px 12px",
                fontSize: 11,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "'Arial', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fdecea";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              FORCE UNLOCK
            </button>
          )}
        </div>
      </div>
    );
  }

  // You hold the lock and someone else is waiting
  if (editLock.hasLock && editLock.requestedByName) {
    return (
      <div
        style={{
          background: "#e8f0fb",
          borderBottom: `1px solid ${C.blue}33`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>
          <strong>{editLock.requestedByName}</strong> is requesting access to this ticket.
        </div>
        <button
          onClick={editLock.dismissRequest}
          style={{
            background: "transparent",
            border: `1px solid ${C.blue}44`,
            color: C.blue,
            borderRadius: 4,
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          THE CURRENT USER WILL BE FINISHED SHORTLY
        </button>
      </div>
    );
  }

  return null;
}

export default TicketEditLockBanner;
