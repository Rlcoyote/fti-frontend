import { C } from "./config.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { Btn } from "./SharedUI.jsx";

// ─── ContactSoftDeleteModal (v28.152 — ship 3 of the ContactsPage split) ──
// The batch "mark inactive" confirm, shown from select mode. Purely
// presentational — ContactsPage owns the selection and the open flag and
// runs the batch soft-delete in onConfirm.

function ContactSoftDeleteModal({ count, onConfirm, onClose }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderTop: `4px solid #8a6500`,
          borderRadius: 8,
          padding: 28,
          width: 460,
          maxWidth: "90vw",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 10 }}>
          Mark {count} contact{count !== 1 ? "s" : ""} inactive?
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
          Inactive contacts are hidden from pickers but preserved in historical references on tickets and audit rows. Reversible — toggle "Show inactive" to
          view them later.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onConfirm}>MARK {count} INACTIVE</Btn>
          <Btn variant="ghost" onClick={onClose}>
            CANCEL
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default ContactSoftDeleteModal;
