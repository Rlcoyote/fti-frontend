import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── NewJobWellsPanel (v28.98 — ship 5 of NewJobModal split) ───────────────
// The Wells + AFE panel from the New Job form. Owns its own list
// management (add / update / remove / TBD checkbox / auto-grow on
// last-row fill) but stays a controlled component — the parent owns
// the underlying wellList / wellTBD / afe state since those feed the
// create payload.
//
// v28.42 behaviors preserved exactly:
//   - List starts with 2 pre-seeded blanks (most WOs have ≥2 wells)
//   - Auto-grow: typing into the LAST empty row spawns a new blank
//     below, up to a 10-row cap
//   - Empty rows drop on submit (in parent's cleanWells)
//   - TBD checkbox short-circuits the list; submission sends ["TBD"]
//
// Validation:
//   - Parent computes `errors.wells` and passes it in
//   - Checking TBD clears `errors.wells` via the clearError callback
//   - The wells error message preserves its `data-error="wells"`
//     attribute so the parent's scroll-to-error in validateAndCreate
//     still finds it via document.querySelector

export default function NewJobWellsPanel({ wellList, setWellList, wellTBD, setWellTBD, afe, setAfe, wellsError, clearWellsError }) {
  const addWell = () => {
    if (wellList.length < 10) setWellList((prev) => [...prev, ""]);
  };

  // v28.42 auto-grow logic. Preserve verbatim from the inline version.
  const updateWell = (idx, val) =>
    setWellList((prev) => {
      const next = prev.map((w, i) => (i === idx ? val : w));
      const isLastRow = idx === prev.length - 1;
      const wasEmpty = !prev[idx]?.trim();
      const becameNonEmpty = !!val.trim();
      if (isLastRow && wasEmpty && becameNonEmpty && next.length < 10) {
        next.push("");
      }
      return next;
    });

  const removeWell = (idx) => setWellList((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>WELL NAME / LOCATION *</div>
          <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, fontWeight: 700, color: wellTBD ? C.blue : C.muted }}>
            <input
              type="checkbox"
              checked={wellTBD}
              onChange={(e) => {
                setWellTBD(e.target.checked);
                if (e.target.checked && clearWellsError) clearWellsError();
              }}
              style={{ width: 14, height: 14, accentColor: C.blue }}
            />
            TBD
          </label>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {wellList.length > 1 && (
            <span style={{ fontSize: 11, color: C.muted }}>
              {wellList.filter((w) => w.trim()).length} of {wellList.length} named
            </span>
          )}
          {wellList.length < 10 && (
            <button
              type="button"
              onClick={addWell}
              style={{
                background: "transparent",
                border: `1px solid ${C.border}`,
                borderRadius: 3,
                padding: "2px 8px",
                fontSize: 11,
                fontWeight: 700,
                color: C.text,
                cursor: "pointer",
              }}
            >
              + ADD WELL
            </button>
          )}
        </div>
      </div>
      {wellTBD ? (
        <div style={{ padding: "10px 0", fontSize: 12, color: C.muted, fontStyle: "italic" }}>
          Well name will be set to TBD — update via Edit Work Order when known.
        </div>
      ) : (
        <>
          {wellList.map((w, idx) => (
            <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 20, textAlign: "right" }}>{idx + 1}.</div>
              <input style={{ ...inputStyle, flex: 1 }} value={w} onChange={(e) => updateWell(idx, e.target.value)} placeholder="Well name or CTB name..." />
              {wellList.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeWell(idx)}
                  style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700, padding: "0 4px" }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </>
      )}
      {wellsError && (
        <div data-error="wells" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
          ⚠ {wellsError}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <label style={labelStyle}>AFE</label>
        <input style={{ ...inputStyle, maxWidth: 240 }} value={afe} onChange={(e) => setAfe(e.target.value)} placeholder="AFE number if applicable" />
      </div>
    </div>
  );
}
