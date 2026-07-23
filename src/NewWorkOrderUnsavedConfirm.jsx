import UnsavedChangesModal from "./UnsavedChangesModal.jsx";

// ─── NewWorkOrderUnsavedConfirm (v28.95 — ship 2 of NewWorkOrderModal split) ───────────
// "You have unsaved information" confirmation modal for the New Job flow.
// v28.289 (theme arc): the twin-consolidation this file's comment promised —
// it was a body-text variant of AddTicketUnsavedConfirm; both now delegate
// to UnsavedChangesModal, which renders through the one shell.
//
// Props:
//   open       — boolean. Parent's showUnsaved flag.
//   onDiscard  — () => void. Confirmed discard (usually = onClose).
//   onDismiss  — () => void. Keep editing (close just this modal).

export default function NewWorkOrderUnsavedConfirm({ open, onDiscard, onDismiss }) {
  if (!open) return null;
  return (
    <UnsavedChangesModal
      message="You have unsaved information. Are you sure you want to close without creating this job?"
      onDiscard={onDiscard}
      onClose={onDismiss}
    />
  );
}
