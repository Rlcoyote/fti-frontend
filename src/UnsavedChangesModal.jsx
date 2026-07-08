import { C } from "./config.js";
import { Btn, ModalWrap, Z_INDEX } from "./SharedUI.jsx";

// ─── UnsavedChangesModal (v28.165 — dedup of EditJobUnsavedModal + the ──────
// JSAModal inline "Unsaved Changes" block) ─────────────────────────────────
// The "Unsaved Changes" confirm shown when a modal is closed with a dirty
// form. `message` carries the surface-specific body text (work order vs.
// JSA); onDiscard drops the edits, onClose keeps editing. The parent owns
// the showUnsaved flag and renders this conditionally.

function UnsavedChangesModal({ message, onDiscard, onClose }) {
  // v28.287 (theme arc) — renders through the one shell.
  return (
    <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={400} accent={C.red} onClose={onClose}>
      <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 10 }}>Unsaved Changes</div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{message}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onDiscard}>YES, DISCARD</Btn>
        <Btn variant="ghost" onClick={onClose}>
          KEEP EDITING
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default UnsavedChangesModal;
