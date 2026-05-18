import { C } from "./config.js";
import { Btn } from "./SharedUI.jsx";

// ─── EditJobUnsavedModal (v28.145 — ship 5 of the EditJobModal split) ──────
// The "Unsaved Changes" confirm shown when EditJobModal is closed with a
// dirty form. onDiscard drops the edits (the parent releases the edit lock
// + closes); onClose keeps editing. The parent owns the showUnsaved flag and
// renders this conditionally.

function EditJobUnsavedModal({ onDiscard, onClose }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
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
          <Btn onClick={onDiscard}>YES, DISCARD</Btn>
          <Btn variant="ghost" onClick={onClose}>
            KEEP EDITING
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default EditJobUnsavedModal;
