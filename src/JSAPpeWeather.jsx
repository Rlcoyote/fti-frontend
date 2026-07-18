import { C } from "./config.js";
import { labelStyle } from "./SharedUI.jsx";

// ─── JSAPpeWeather (v28.156 — ship 3 of the JSAModal split) ───────────────
// The side-by-side PPE CHECK + WEATHER CONDITIONS block. PPE is three
// toggle checkboxes; weather is a tag-picker. weatherData (the
// auto-detected temp / wind readout) and weatherAutoTags (which drives
// the dashed border on auto-applied tags) are display inputs.
//
// Controlled — JSAModal owns ppe + weather (both go into the JSA save
// payload and the dirty check); toggleWeather is the parent's mutator.

const weatherOpts = ["clear", "cloudy", "calm", "rain", "mud", "hot", "windy", "freezing", "ice", "snow"];

function JSAPpeWeather({ ppe, setPpe, weather, weatherData, weatherAutoTags, toggleWeather }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
      <div>
        <label style={labelStyle}>PPE CHECK</label>
        {[
          ["frClothing", "FR Clothing, H2S Monitor, Hard Hat, Safety Glasses, Steel Toed Footwear"],
          ["toolsTrained", "Trained in use of tools / equipment"],
          ["confinedSpace", "Confined space permit completed?"],
        ].map(([k, lbl]) => (
          <div
            key={k}
            style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }}
            onClick={() => setPpe((p) => ({ ...p, [k]: !p[k] }))}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                border: `2px solid ${ppe[k] ? C.green : C.muted}`,
                background: ppe[k] ? C.green : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {ppe[k] && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}
            </div>
            <span style={{ fontSize: 11, color: C.text }}>{lbl}</span>
          </div>
        ))}
      </div>
      <div>
        <label style={labelStyle}>WEATHER CONDITIONS</label>
        {weatherData && (
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
            {weatherData.temperature != null && <span style={{ fontWeight: 700, color: C.text }}>{Math.round(weatherData.temperature)}°F</span>}
            {weatherData.wind_speed > 0 && <span style={{ marginLeft: 10 }}>Wind: {Math.round(weatherData.wind_speed)} mph</span>}
            {weatherData.wind_gusts > 0 && <span style={{ marginLeft: 6 }}>Gusts: {Math.round(weatherData.wind_gusts)} mph</span>}
            <span style={{ marginLeft: 10, fontSize: 9, color: C.blue, fontWeight: 700 }}>auto-detected from pin — tap to override</span>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {weatherOpts.map((w) => {
            const isSelected = weather.includes(w);
            const isAuto = isSelected && weatherAutoTags.includes(w);
            return (
              <button
                className="fti-btn"
                key={w}
                onClick={() => toggleWeather(w)}
                style={{
                  background: isSelected ? C.blue : "transparent",
                  color: isSelected ? C.white : C.muted,
                  border: `1px solid ${isSelected ? C.blue : C.border}`,
                  borderStyle: isAuto ? "dashed" : "solid",
                  borderRadius: 4,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {w}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default JSAPpeWeather;
