import { C } from "./config.js";
import { Btn, Z_INDEX } from "./SharedUI.jsx";

// ─── NewJobUnsavedConfirm (v28.95 — ship 2 of NewJobModal split) ───────────
// "You have unsaved information" confirmation modal for the New Job
// flow. Pure presentation; parent owns the dirty-state flag and the
// discard action.
//
// Direct twin of AddTicketUnsavedConfirm (v28.58). The body text differs
// ("creating this job" vs "creating this ticket"); everything else is
// identical. The user said "one battle at a time" re: consolidating
// twin modals — a future shared-primitive arc can pull these together;
// today they sit beside each other so the divergence stays visible.
//
// v28.95 also swaps the hardcoded `zIndex: 200` to `Z_INDEX.overlay`
// — the inline modal predated the SharedUI Z_INDEX policy.
//
// Props:
//   open       — boolean. Parent's showUnsaved flag.
//   onDiscard  — () => void. Confirmed discard (usually = onClose).
//   onDismiss  — () => void. Keep editing (close just this modal).

export default function NewJobUnsavedConfirm({ open, onDiscard, onDismiss }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000088",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: Z_INDEX.overlay,
      }}
      onClick={onDismiss}
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
          <Btn onClick={onDiscard}>YES, DISCARD</Btn>
          <Btn variant="ghost" onClick={onDismiss}>
            KEEP EDITING
          </Btn>
        </div>
      </div>
    </div>
  );
}
