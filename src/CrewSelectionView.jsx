import { C } from "./config.js";
import { Btn, inputStyle } from "./SharedUI.jsx";

// ─── CrewSelectionView (v28.13) ────────────────────────────────────────────
// Pure presentational component for the Crew Selection section.
//   - No data fetching
//   - No state management
//   - No backend calls
// The two consumers — `CrewSelectionManager` (post-save, live API data)
// and the staged pre-save block in `AddTicketModal` (local state) — wire
// their own callbacks. By centralizing the visuals here every future
// UX tweak (button styling, lead badge, empty-state copy, COPY CREW
// placement, dropdown labels) lands once instead of twice.
//
// Origin: v28.09 inlined the same dropdown + list + button JSX in both
// places. v28.13 (Reggie audit pass — "the wise man built his house upon
// a rock") factored it here. CAM Article XXIV in spirit: consistency
// across the codebase, one canonical implementation per UX concept.
//
// Props
// ─────
// crew                Array of crew rows. Each: { user_id, user_name,
//                       user_role, user_job_title?, is_lead }. The list
//                       can come from any source (live fetch, local stage).
// loading             bool — appends " — loading..." to the header.
// error               string — inline red message below the list.
// busy                bool — disable the dropdown and per-row buttons
//                       during in-flight mutations.
//
// canMutate           bool — show the dropdown + per-row mutate buttons.
//                       Hide everything when the caller has read-only
//                       access (closed ticket, insufficient role, etc.).
//
// addableUsers        [{ id, name, role }] — populates the dropdown.
//                       Caller is responsible for filtering out users
//                       already on the crew, inactive users, etc.
//
// hasCopySource       bool — show the COPY CREW FROM RIG UP button.
// onCopySource        () => void — fires when the COPY button is clicked.
//                       Caller decides what to do (mount a CopyCrewModal,
//                       inline-copy, etc.).
//
// onAdd               (userId, isLead) => void — dropdown selection
//                       handler. The view passes isLead = (crew.length === 0)
//                       so the first-added becomes lead by default; the
//                       caller can override by ignoring the second arg.
// onSetLead           (userId) => void
// onRemove            (userId, userName) => void — caller decides whether
//                       to confirm before removing. Live mode wraps this
//                       in window.confirm; staged mode does not (because
//                       nothing is persisted yet).
//
// headerSubtext       optional italic note next to the count, e.g.
//                       " — saved when you create the ticket".
// emptyMessage        optional override for the no-crew message.
// rowKeyFor           optional row-key extractor — defaults to user_id.
//                       Live mode uses (c) => c.id for the server PK.

function CrewSelectionView({
  crew = [],
  loading = false,
  error = "",
  busy = false,
  canMutate,
  addableUsers = [],
  hasCopySource = false,
  onCopySource,
  onAdd,
  onSetLead,
  onRemove,
  headerSubtext,
  emptyMessage,
  rowKeyFor,
}) {
  const sectionStyle = {
    background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6,
    padding: 14, marginBottom: 14,
  };
  const headerStyle = {
    fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.1em",
    textTransform: "uppercase",
  };
  const defaultEmpty = canMutate
    ? "No crew selected yet. Select an employee above to add — the first becomes lead."
    : "No crew assigned yet.";

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <div style={headerStyle}>
          Crew Selection{loading ? " — loading..." : ` (${crew.length})`}
          {headerSubtext && (
            <span style={{ marginLeft: 8, fontWeight: 400, fontStyle: "italic", color: C.muted, textTransform: "none", letterSpacing: 0 }}>
              {headerSubtext}
            </span>
          )}
        </div>
        {canMutate && hasCopySource && (
          <Btn small variant="ghost" onClick={onCopySource} disabled={busy}>
            📋 COPY CREW FROM RIG UP
          </Btn>
        )}
      </div>

      {/* Permanent select-to-add dropdown — no +ADD button. Selecting an
          employee fires onAdd immediately. The view passes a "first-added
          should be lead" hint via the second arg. */}
      {canMutate && (
        <div style={{ marginBottom: 10 }}>
          <select
            style={inputStyle}
            value=""
            disabled={busy || addableUsers.length === 0}
            onChange={e => {
              const id = e.target.value;
              if (!id) return;
              onAdd(id, crew.length === 0);
            }}
          >
            <option value="">
              {addableUsers.length === 0 ? "— all employees added —" : "— select employee —"}
            </option>
            {addableUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}{u.role ? ` (${u.role})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Crew list */}
      {!loading && crew.length === 0 && (
        <div style={{
          fontSize: 12, color: C.muted, fontStyle: "italic",
          padding: "10px 12px", background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4,
        }}>
          {emptyMessage || defaultEmpty}
        </div>
      )}

      {crew.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
          {crew.map((c, i) => (
            <div
              key={rowKeyFor ? rowKeyFor(c) : c.user_id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px",
                borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                background: c.is_lead ? "#fdf5d8" : C.cardBg,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {c.user_name}
                  {c.is_lead && (
                    <span style={{
                      marginLeft: 8, fontSize: 10, fontWeight: 800, color: "#8a6500",
                      background: "#ffffffaa", border: `1px solid #8a650044`,
                      padding: "1px 6px", borderRadius: 3, letterSpacing: "0.08em",
                    }}>LEAD</span>
                  )}
                </div>
                {(c.user_role || c.user_job_title) && (
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {c.user_role}{c.user_job_title ? ` · ${c.user_job_title}` : ""}
                  </div>
                )}
              </div>
              {canMutate && (
                <div style={{ display: "flex", gap: 6 }}>
                  {!c.is_lead && (
                    <button
                      onClick={() => onSetLead(c.user_id)}
                      disabled={busy}
                      title="Designate as lead"
                      style={{
                        background: "transparent", border: `1px solid ${C.muted}55`,
                        color: C.muted, fontSize: 10, fontWeight: 700,
                        padding: "3px 8px", borderRadius: 3,
                        cursor: busy ? "default" : "pointer", letterSpacing: "0.06em",
                      }}
                    >MAKE LEAD</button>
                  )}
                  <button
                    onClick={() => onRemove(c.user_id, c.user_name)}
                    disabled={busy}
                    title="Remove from ticket"
                    style={{
                      background: "transparent", border: `1px solid ${C.red}33`,
                      color: C.red, fontSize: 10, fontWeight: 700,
                      padding: "3px 8px", borderRadius: 3,
                      cursor: busy ? "default" : "pointer", letterSpacing: "0.06em",
                    }}
                  >REMOVE</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, color: C.red, fontSize: 12, fontWeight: 700 }}>
          {error}
        </div>
      )}
    </div>
  );
}

export default CrewSelectionView;
