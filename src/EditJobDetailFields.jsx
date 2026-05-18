import { C } from "./config.js";
import { inputStyle, labelStyle } from "./SharedUI.jsx";
import { ALL_COUNTIES } from "./Geography.js";

// ─── EditJobDetailFields (v28.145 — ship 5 of the EditJobModal split) ──────
// The work-order detail fields for EditJobModal: Customer, Location (State +
// County autocomplete), the Wells list, and AFE. Presentational/controlled —
// every value + setter is a prop; EditJobModal still owns the state for the
// save payload and dirty detection.
//
// formatState, the well-list mutators, and the county-autocomplete filter
// are field-local logic and live here. (Billing + Notes stay inline in
// EditJobModal — small enough not to warrant their own files; POC / Approver
// / Google-pin are already their own components and render between these
// sections, which is why this panel stops at AFE.)

function formatState(val) {
  return val
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase();
}

function sectionHead(label) {
  return <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.08em", marginBottom: 8, marginTop: 4 }}>{label}</div>;
}

function EditJobDetailFields({
  customer,
  setCustomer,
  jobState,
  setJobState,
  county,
  setCounty,
  showCountyDrop,
  setShowCountyDrop,
  wellList,
  setWellList,
  afe,
  setAfe,
}) {
  const filteredCounties = county.length > 0 ? ALL_COUNTIES.filter((c) => c.toLowerCase().startsWith(county.toLowerCase())) : [];
  const addWell = () => {
    if (wellList.length < 10) setWellList((prev) => [...prev, ""]);
  };
  const updateWell = (idx, val) => setWellList((prev) => prev.map((w, i) => (i === idx ? val : w)));
  const removeWell = (idx) => setWellList((prev) => prev.filter((_, i) => i !== idx));

  return (
    <>
      {/* Customer */}
      <div style={{ marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>CUSTOMER</label>
          <input style={inputStyle} value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>
      </div>

      {/* Location */}
      {sectionHead("LOCATION")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>STATE</label>
          <input style={inputStyle} value={jobState} onChange={(e) => setJobState(formatState(e.target.value))} placeholder="TX" maxLength={2} />
        </div>
        <div style={{ position: "relative" }}>
          <label style={labelStyle}>COUNTY</label>
          <input
            style={inputStyle}
            value={county}
            onChange={(e) => {
              setCounty(e.target.value);
              setShowCountyDrop(true);
            }}
            onFocus={() => setShowCountyDrop(true)}
            onBlur={() => setTimeout(() => setShowCountyDrop(false), 150)}
            placeholder="Start typing..."
          />
          {showCountyDrop && filteredCounties.length > 0 && (
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
                maxHeight: 160,
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

      {/* Wells */}
      {sectionHead("WELL NAME / LOCATION")}
      {wellList.map((w, idx) => (
        <div key={idx} style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 18 }}>{idx + 1}.</div>
          <input style={{ ...inputStyle, flex: 1 }} value={w} onChange={(e) => updateWell(idx, e.target.value)} placeholder="Well or CTB name..." />
          {wellList.length > 1 && (
            <button
              type="button"
              onClick={() => removeWell(idx)}
              style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16, fontWeight: 700 }}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {wellList.length < 10 && (
        <button
          type="button"
          onClick={addWell}
          style={{
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 3,
            padding: "3px 10px",
            fontSize: 11,
            fontWeight: 700,
            color: C.text,
            cursor: "pointer",
            marginBottom: 12,
          }}
        >
          + ADD WELL
        </button>
      )}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>AFE</label>
        <input style={{ ...inputStyle, maxWidth: 220 }} value={afe} onChange={(e) => setAfe(e.target.value)} placeholder="AFE number if applicable" />
      </div>
    </>
  );
}

export default EditJobDetailFields;
