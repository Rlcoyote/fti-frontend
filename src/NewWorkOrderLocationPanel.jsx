import { useState } from "react";
import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { ALL_COUNTIES } from "./Geography.js";

// ─── NewWorkOrderLocationPanel (v28.100 — ship 7 of NewWorkOrderModal split) ───────────
// State (2-letter) + County (autocomplete from TX+NM list) fields, plus
// the "auto-filled from pin" warning banner and per-field unlock
// buttons.
//
// Cross-concern with the pin resolver (ship 8): the pin geocodes to
// state/county and writes them via parent setters, then sets the
// stateLockedByPin / countyLockedByPin flags. This component reads
// those flags to:
//   - show the warning banner when either is true
//   - mark the inputs readOnly + tint the border blue
//   - show the "unlock" mini-button that flips the flag off
//
// State + county values + lock flags ALL live in parent (they're
// written from two places — this panel AND the pin resolver — so the
// storage stays up).
//
// Local state owned: showCountyDrop (the autocomplete open/close).
// filteredCounties is derived from ALL_COUNTIES + the county string;
// pre-sorted at module load (v28.94).

const formatState = (val) =>
  val
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();

export default function NewWorkOrderLocationPanel({
  jobState,
  setJobState,
  county,
  setCounty,
  stateLockedByPin,
  setStateLockedByPin,
  countyLockedByPin,
  setCountyLockedByPin,
  errors,
  clearError,
}) {
  const [showCountyDrop, setShowCountyDrop] = useState(false);
  const filteredCounties = county.length > 0 ? ALL_COUNTIES.filter((c) => c.toLowerCase().startsWith(county.toLowerCase())) : [];

  return (
    <>
      {(stateLockedByPin || countyLockedByPin) && (
        <div
          style={{
            fontSize: 11,
            color: C.blue,
            background: C.blueB,
            border: `1px solid ${C.blue}22`,
            borderRadius: 4,
            padding: "6px 10px",
            marginBottom: 8,
          }}
        >
          State and County are auto-filled from the pin. Editing them manually will break the pin association.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={labelStyle}>STATE *</label>
            {stateLockedByPin && (
              <button
                className="fti-btn"
                type="button"
                onClick={() => setStateLockedByPin(false)}
                style={{ background: "transparent", border: "none", fontSize: 10, color: C.muted, cursor: "pointer", padding: 0 }}
              >
                unlock
              </button>
            )}
          </div>
          <input
            style={{ ...inputStyle, borderColor: errors.jobState ? C.red : stateLockedByPin ? C.blue : C.border }}
            value={jobState}
            onChange={(e) => !stateLockedByPin && setJobState(formatState(e.target.value))}
            readOnly={stateLockedByPin}
            placeholder="TX"
            maxLength={2}
          />
          {errors.jobState && (
            <div data-error="jobState" style={{ fontSize: 10, color: C.red, marginTop: 2 }}>
              {errors.jobState}
            </div>
          )}
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={labelStyle}>COUNTY *</label>
            {countyLockedByPin && (
              <button
                className="fti-btn"
                type="button"
                onClick={() => setCountyLockedByPin(false)}
                style={{ background: "transparent", border: "none", fontSize: 10, color: C.muted, cursor: "pointer", padding: 0 }}
              >
                unlock
              </button>
            )}
          </div>
          <input
            style={{ ...inputStyle, borderColor: errors.county ? C.red : countyLockedByPin ? C.blue : C.border }}
            value={county}
            onChange={(e) => {
              if (!countyLockedByPin) {
                setCounty(e.target.value);
                setShowCountyDrop(true);
                if (clearError) clearError("county");
              }
            }}
            onFocus={() => !countyLockedByPin && setShowCountyDrop(true)}
            onBlur={() => setTimeout(() => setShowCountyDrop(false), 150)}
            placeholder="Start typing..."
            readOnly={countyLockedByPin}
          />
          {errors.county && (
            <div data-error="county" style={{ fontSize: 11, color: C.red, marginTop: 3, fontWeight: 700 }}>
              ⚠ {errors.county}
            </div>
          )}
          {showCountyDrop && filteredCounties.length > 0 && !countyLockedByPin && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 20,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                boxShadow: "0 4px 16px #00000022",
                maxHeight: 180,
                overflowY: "auto",
                marginTop: 2,
              }}
            >
              {filteredCounties.map((c) => (
                <div
                  key={c}
                  onMouseDown={() => {
                    setCounty(c);
                    setShowCountyDrop(false);
                  }}
                  style={{ padding: "6px 12px", cursor: "pointer", fontSize: 12 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.steel)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
