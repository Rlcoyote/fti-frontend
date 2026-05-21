import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import WellPinPaste from "./WellPinPaste.jsx";

// ─── NewJobWellsPanel ───────────────────────────────────────────────────────
// The Wells + AFE panel from the New Job form. Owns the visible add/remove
// + auto-grow behavior; the wellList/wellOverrides/wellTBD/afe state lives
// in useNewJobForm so it can flow into the create payload.
//
// v28.181 — Per-well location override added. Each well row carries a "use
// same location" checkbox (default checked → well inherits the WO's primary
// pin). When unchecked, the well exposes its own pin_lat + pin_lng inputs;
// the backend creates a separate Samsara geofence for that well on dispatch.
// Most WOs are one location with multiple wells (the common case), so the
// default keeps the form short.
//
// Labels renamed per Reggie's UX direction:
//   "WELL NAME / LOCATION"  →  "LOCATION / WELL NAME"
//   "+ ADD WELL"            →  "+ ADD"
//
// v28.42 auto-grow preserved exactly:
//   - List starts with 2 pre-seeded blanks (wellList) + matching overrides
//   - Auto-grow: typing into the LAST empty row spawns a new blank below,
//     up to a 10-row cap, AND grows wellOverrides in lockstep.
//   - Empty rows drop on submit (via cleanWells in useNewJobForm).
//   - TBD checkbox short-circuits the list; submission sends ["TBD"].

export default function NewJobWellsPanel({
  wellList,
  setWellList,
  wellOverrides,
  setWellOverrides,
  wellTBD,
  setWellTBD,
  afe,
  setAfe,
  wellsError,
  clearWellsError,
}) {
  const addWell = () => {
    if (wellList.length >= 10) return;
    setWellList((prev) => [...prev, ""]);
    setWellOverrides((prev) => [...prev, { useSameLocation: true }]);
  };

  const updateWell = (idx, val) => {
    const prev = wellList;
    setWellList((p) => {
      const next = p.map((w, i) => (i === idx ? val : w));
      const isLast = idx === p.length - 1;
      const wasEmpty = !p[idx]?.trim();
      const becameNonEmpty = !!val.trim();
      if (isLast && wasEmpty && becameNonEmpty && next.length < 10) next.push("");
      return next;
    });
    // Sync wellOverrides when auto-grow fires
    const isLast = idx === prev.length - 1;
    const wasEmpty = !prev[idx]?.trim();
    const becameNonEmpty = !!val.trim();
    if (isLast && wasEmpty && becameNonEmpty && prev.length < 10) {
      setWellOverrides((o) => (o.length < prev.length + 1 ? [...o, { useSameLocation: true }] : o));
    }
  };

  const removeWell = (idx) => {
    setWellList((p) => p.filter((_, i) => i !== idx));
    setWellOverrides((o) => o.filter((_, i) => i !== idx));
  };

  const updateOverride = (idx, field, value) => {
    setWellOverrides((p) => {
      const next = [...p];
      while (next.length < idx + 1) next.push({ useSameLocation: true });
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  return (
    <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: "0.08em" }}>LOCATION / WELL NAME *</div>
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
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
              + ADD
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
          {wellList.map((w, idx) => {
            const ov = wellOverrides[idx] || { useSameLocation: true };
            const usesSame = ov.useSameLocation !== false;
            return (
              <div
                key={idx}
                style={{
                  marginBottom: 8,
                  padding: usesSame ? 0 : "8px 10px",
                  background: usesSame ? "transparent" : C.cardBg,
                  border: usesSame ? "none" : `1px solid ${C.border}`,
                  borderRadius: 4,
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 20, textAlign: "right" }}>{idx + 1}.</div>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={w}
                    onChange={(e) => updateWell(idx, e.target.value)}
                    placeholder="Well name or CTB name..."
                  />
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginLeft: 26 }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      cursor: "pointer",
                      fontSize: 10,
                      fontWeight: 600,
                      color: usesSame ? C.muted : C.text,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={usesSame}
                      onChange={(e) => updateOverride(idx, "useSameLocation", e.target.checked)}
                      style={{ width: 12, height: 12, accentColor: C.blue }}
                    />
                    Use same location as the work order pin
                  </label>
                </div>
                {!usesSame && (
                  <div style={{ marginTop: 8, marginLeft: 26 }}>
                    <WellPinPaste
                      pinLat={ov.pinLat}
                      pinLng={ov.pinLng}
                      setPinLat={(v) => updateOverride(idx, "pinLat", v)}
                      setPinLng={(v) => updateOverride(idx, "pinLng", v)}
                    />
                  </div>
                )}
              </div>
            );
          })}
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
