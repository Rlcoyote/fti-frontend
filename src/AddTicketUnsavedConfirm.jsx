import UnsavedChangesModal from "./UnsavedChangesModal.jsx";

// ─── AddTicketUnsavedConfirm (v28.58 — extracted from AddTicketModal) ─────────
// The "Unsaved Changes — are you sure you want to close?" confirm for the
// ticket form. v28.287 (theme arc): this was a byte-for-byte copy of
// UnsavedChangesModal with a fixed message — now it delegates. discard
// closes the underlying modal; dismiss closes only this confirm.

export default function AddTicketUnsavedConfirm({ onDiscard, onDismiss }) {
  return <UnsavedChangesModal message="This ticket has not been saved. Are you sure you want to close?" onDiscard={onDiscard} onClose={onDismiss} />;
}
