import { C } from "./config.js";
import { Btn, ModalWrap, Z_INDEX } from "./SharedUI.jsx";

// ─── ContactSoftDeleteModal (v28.152 — ship 3 of the ContactsPage split) ──
// The batch "mark inactive" confirm, shown from select mode. Purely
// presentational — ContactsPage owns the selection and the open flag and
// runs the batch soft-delete in onConfirm.

function ContactSoftDeleteModal({ count, onConfirm, onClose }) {
  // v28.287 (theme arc) — one shell; the hardcoded #8a6500 accent becomes
  // C.yellow (it WAS the light-palette yellow — dark mode never got it).
  return (
    <ModalWrap variant="dialog" z={Z_INDEX.overlay} width={460} accent={C.yellow} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>
        Mark {count} contact{count !== 1 ? "s" : ""} inactive?
      </div>
      <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
        Inactive contacts are hidden from pickers but preserved in historical references on tickets and audit rows. Reversible — toggle "Show inactive" to view
        them later.
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={onConfirm}>MARK {count} INACTIVE</Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default ContactSoftDeleteModal;
