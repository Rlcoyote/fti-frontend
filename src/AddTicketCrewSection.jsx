import CrewSelectionManager from "./CrewSelectionManager.jsx";
import CrewSelectionView from "./CrewSelectionView.jsx";
import CopyCrewModal from "./CopyCrewModal.jsx";

// ─── AddTicketCrewSection (v28.65 — extracted from AddTicketModal) ────────────
// Crew selection block. Two-mode by design (v28.09):
//   - savedTicketId present → CrewSelectionManager (live, fetches from
//     /tickets/:id/crew, mutations land server-side immediately)
//   - savedTicketId null → CrewSelectionView fed by local crewSelection
//     state; bulk-POSTed by the parent on CREATE TICKET
//
// Both modes render via the same CrewSelectionView under the hood
// (v28.13 — single visual implementation, UX tweaks land once).
//
// CopyCrewModal portal is included here because it only mounts in the
// pre-save branch — the manager has its own equivalent post-save.

export default function AddTicketCrewSection({
  savedTicketId,
  type,
  jobId,
  users,
  crewSelection,
  setCrewSelection,
  hasRigUpForCopy,
  showCopyCrew,
  setShowCopyCrew,
}) {
  if (savedTicketId) {
    return <CrewSelectionManager ticketId={savedTicketId} ticketIsClosed={false} editable={true} ticketType={type} jobId={jobId} />;
  }

  const addableUsers = (users || [])
    .filter((u) => u.is_active !== false)
    .filter((u) => !crewSelection.some((s) => s.user_id === u.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <>
      <CrewSelectionView
        crew={crewSelection}
        canMutate={true}
        addableUsers={addableUsers}
        hasCopySource={hasRigUpForCopy}
        onCopySource={() => setShowCopyCrew(true)}
        onAdd={(userId, isLead) => {
          const u = (users || []).find((x) => x.id === userId);
          if (!u) return;
          setCrewSelection((prev) => [...prev, { user_id: u.id, user_name: u.name, user_role: u.role, is_lead: !!isLead }]);
        }}
        onSetLead={(userId) => {
          setCrewSelection((prev) => prev.map((s) => ({ ...s, is_lead: s.user_id === userId })));
        }}
        onRemove={(userId) => {
          setCrewSelection((prev) => {
            const removed = prev.find((s) => s.user_id === userId);
            const next = prev.filter((s) => s.user_id !== userId);
            if (removed?.is_lead && next.length > 0 && !next.some((s) => s.is_lead)) {
              next[0] = { ...next[0], is_lead: true };
            }
            return next;
          });
        }}
        headerSubtext="— saved when you create the ticket"
        emptyMessage="No crew selected yet. Pick an employee above to add — the first becomes lead."
      />

      {showCopyCrew && (
        <CopyCrewModal
          jobId={jobId}
          excludeTicketId={savedTicketId}
          existingCrewUserIds={new Set(crewSelection.map((c) => c.user_id))}
          onClose={() => setShowCopyCrew(false)}
          onCopy={(members) => {
            setCrewSelection((prev) => {
              const next = [...prev];
              for (const m of members) {
                if (next.some((x) => x.user_id === m.user_id)) continue;
                next.push({
                  user_id: m.user_id,
                  user_name: m.user_name,
                  user_role: m.user_role || null,
                  is_lead: !!m.is_lead && !next.some((x) => x.is_lead),
                });
              }
              if (next.length > 0 && !next.some((x) => x.is_lead)) {
                next[0] = { ...next[0], is_lead: true };
              }
              return next;
            });
            setShowCopyCrew(false);
          }}
        />
      )}
    </>
  );
}
