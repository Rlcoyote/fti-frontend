import { C } from "./config.js";

// ─── EditJobLockBanner (v28.142 — ship 2 of the EditJobModal split) ────────
// The two edit-lock banners for EditJobModal:
//   1. "This job is being edited by X" + REQUEST EDIT — shown to a non-holder
//      while someone else holds the lock.
//   2. "X is requesting access" + dismiss — shown to the holder when another
//      user has pressed REQUEST EDIT.
// Display-only: all state + handlers come from the editLock object
// (useEditLock) the parent passes in.
//
// TicketEditLockBanner is the ticket-side equivalent — a near-twin, but not
// identical (tickets carry an owner/admin FORCE UNLOCK; jobs don't). Kept
// separate; merging the two is a dedup for another day.

function EditJobLockBanner({ editLock }) {
  return (
    <>
      {editLock.isLocked && !editLock.hasLock && (
        <div
          style={{
            background: C.yellowB,
            borderBottom: `1px solid ${C.yellow}44`,
            padding: "10px 16px",
            marginBottom: 8,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: C.yellow }}>
            This job is being edited by <strong>{editLock.lockedByName}</strong>. As soon as they are done, you may edit.
          </div>
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
        </div>
      )}
      {editLock.hasLock && editLock.requestedByName && (
        <div
          style={{
            background: C.blueB,
            borderBottom: `1px solid ${C.blue}33`,
            padding: "10px 16px",
            marginBottom: 8,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>
            <strong>{editLock.requestedByName}</strong> is requesting access to this job.
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
      )}
    </>
  );
}

export default EditJobLockBanner;
