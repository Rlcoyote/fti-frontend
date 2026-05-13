import { C } from "./config.js";
import { Btn } from "./SharedUI.jsx";

// ─── AddTicketUnsavedConfirm (v28.58 — extracted from AddTicketModal) ─────────
// Renders the "Unsaved Changes — are you sure you want to close?" overlay.
// Mounted by AddTicketModal when the user attempts to close with dirty state.
//
// Per CAM XXV (File Split Protocol): self-contained, no React state of its
// own, no useEffect — pure presentational. The only inputs are the two
// callbacks the parent owns: discard (which closes the underlying modal)
// and dismiss (which closes only this confirm overlay).
//
// Surface is invariant: always-light overlay (#00000088 backdrop, C.cardBg
// modal) with red top accent. Not theme-aware below the backdrop because
// the confirm is a stop-the-world prompt — its surface should look the
// same regardless of the parent modal's pastel tint.

export default function AddTicketUnsavedConfirm({ onDiscard, onDismiss }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onDismiss}
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
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>This ticket has not been saved. Are you sure you want to close?</div>
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
