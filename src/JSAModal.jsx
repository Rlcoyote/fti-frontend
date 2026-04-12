import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { today } from "./utils.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";

function JSAModal({ job, ticket, onClose, onSave, existingJSA }) {
  const jsa = existingJSA;
  const ticketNum = ticket ? `${job.id}${ticket.ticketNumber ? `-${ticket.ticketNumber}` : ""}` : job.id;
  const wellsList = ticket?.assignedWells?.length > 0
    ? ticket.assignedWells
    : (job.wells || []).map(w => typeof w === "string" ? w : w.well_name || w);
  const [date, setDate] = useState(jsa?.date || ticket?.date?.slice(0, 10) || today());
  const [operator, setOperator] = useState(jsa?.operator || job.customer);
  // Auto-populate all wells from the ticket's assigned wells (not editable — Article X).
  const wellName = jsa?.wellName || jsa?.well_name || wellsList.join(", ") || "—";
  const [time, setTime] = useState(jsa?.time || "");
  const [designatedDriver, setDesignatedDriver] = useState(jsa?.designatedDriver || "");
  const [lat, setLat] = useState(jsa?.lat || jsa?.latitude || ticket?.pinLat || ticket?.pin_lat || job?.pinLat || job?.pin_lat || "");
  const [lng, setLng] = useState(jsa?.lng || jsa?.longitude || ticket?.pinLng || ticket?.pin_lng || job?.pinLng || job?.pin_lng || "");
  const [mapLink, setMapLink] = useState(() => {
    const la = jsa?.lat || jsa?.latitude || ticket?.pinLat || ticket?.pin_lat || job?.pinLat || job?.pin_lat;
    const ln = jsa?.lng || jsa?.longitude || ticket?.pinLng || ticket?.pin_lng || job?.pinLng || job?.pin_lng;
    return (la && ln) ? `${la}, ${ln}` : "";
  });
  const [mapResolving, setMapResolving] = useState(false);
  const [weather, setWeather] = useState(jsa?.weather || []);
  const [ppe, setPpe] = useState(jsa?.ppe || { frClothing: false, toolsTrained: false, confinedSpace: false });
  const [signatures, setSignatures] = useState(jsa?.signatures || [""]);
  const [presenterReview, setPresenterReview] = useState(jsa?.presenterReview ||
    "STOP WORK AUTHORITY. Slips Trips Falls. Keep Walkways Clear. Confined Spaces & Pinch Points. Hands Visible at all times. Eye Safety. 100% Tie Off Policy. Location of Emergency First Aid Kit and how to find the nearest hospital. Importance of a good attitude. Good Communication is key!"
  );
  const [additionalSteps, setAdditionalSteps] = useState(jsa?.additionalSteps || [{ step: "", hazard: "", procedure: "" }]);

  const weatherOpts = ["clear", "cloudy", "calm", "rain", "mud", "hot", "windy", "freezing", "ice", "snow"];

  const PRE_FILLED_STEPS = [
    { step: "Driving to/from or in and around location", hazard: "Driving too fast. Backing without a spotter. Being unaware of surroundings. Using a cell phone while operating a vehicle.", procedure: "Communicate with those around you using signals/lights/horn. Do not use cell phone while driving. Eliminate distractions." },
    { step: "SDS", hazard: "Chemical Exposure", procedure: "SDS electronically or physically available on site." },
    { step: "Worksite & PPE inspection of all equipment", hazard: "Slips, trips, falls, pinch points, enclosed areas, poor lighting, H2S. Defective, absent, or dirty PPE.", procedure: "Repair, replace or clean necessary items. Remove debris. Identify PPE needed & safe handling procedures." },
    { step: "Receive authorization to begin work", hazard: "Onsite Operations Supervisor not aware of work being performed or permits not completed.", procedure: "Receive authorization from the person in charge. Complete all applicable Permits to Work." },
    { step: "Conduct Safety Meeting with all onsite workers", hazard: "Jobsite workers not knowing what activity is about to take place. Hazardous conditions not observed by personnel.", procedure: "Review with all personnel & sign off on safety meeting sheet. Allow others to voice concerns, comments, questions." },
    { step: "Begin job slowly. Watch for personnel not paying attention.", hazard: "Quick movements can result in poor awareness of surrounding personnel and can easily cause unintentional reactions.", procedure: "Work slow and steady. If situations require quick movements, alert everyone before moving." },
  ];

  const toggleWeather = (w) => setWeather(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.text}`, borderRadius: 8, padding: 0, width: 900, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.06em" }}>FLO-TEST, INC. — JSA</div>
            <div style={{ fontSize: 11, color: C.muted }}>#{ticketNum} — Tailgate Safety Meeting · {job.customer}{ticket ? ` · ${ticket.type}` : ""}</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>AIRLIFE: 800-627-2376</div>
        </div>

        <div style={{ padding: "16px 24px" }}>
          {/* Top fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DATE</label><input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} /></div>
            <div><label style={labelStyle}>TIME</label><input style={inputStyle} value={time} onChange={e => setTime(e.target.value)} placeholder="07:00" /></div>
            <div><label style={labelStyle}>OPERATOR</label><input style={inputStyle} value={operator} onChange={e => setOperator(e.target.value)} /></div>
            <div><label style={labelStyle}>WELL NAME & #</label><div style={{ fontSize: 13, fontWeight: 600, color: C.text, paddingTop: 4, lineHeight: 1.5 }}>{wellName}</div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
            <div><label style={labelStyle}>DESIGNATED DRIVER</label><input style={inputStyle} value={designatedDriver} onChange={e => setDesignatedDriver(e.target.value)} /></div>
            <div>
              <label style={labelStyle}>LOCATION PIN (Paste Google Maps link or coordinates)</label>
              <input style={inputStyle} value={mapLink} onChange={e => {
                const val = e.target.value;
                setMapLink(val);
                // Try local parsing first
                let matched = false;
                const patterns = [
                  /[?&@]q?=?([-\d.]+)[,\s]+([-\d.]+)/,
                  /@([-\d.]+),([-\d.]+)/,
                  /\/([-]?\d{1,3}\.\d+),([-]?\d{1,3}\.\d+)/,
                ];
                for (const p of patterns) {
                  const m = val.match(p);
                  if (m) { setLat(m[1]); setLng(m[2]); matched = true; break; }
                }
                const rawMatch = val.trim().match(/^([-]?\d{1,3}\.\d+)[,\s]+([-]?\d{1,3}\.\d+)$/);
                if (!matched && rawMatch) { setLat(rawMatch[1]); setLng(rawMatch[2]); matched = true; }
                // If it's a URL but no coords found, call backend resolver
                if (!matched && (val.includes("maps.app.goo.gl") || val.includes("goo.gl/maps") || val.includes("google.com/maps"))) {
                  setMapResolving(true);
                  fetch(`${API_URL}/jobs/resolve-map-pin`, {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: val }),
                  })
                    .then(r => r.json())
                    .then(data => {
                      if (data.lat && data.lng) { setLat(data.lat); setLng(data.lng); }
                      setMapResolving(false);
                    })
                    .catch(() => setMapResolving(false));
                }
              }} placeholder="Paste Google Maps link or lat, lon" />
              {mapResolving && <div style={{ fontSize: 11, color: C.blue, marginTop: 4, fontWeight: 600 }}>Resolving location...</div>}
              {!mapResolving && lat && lng && (
                <div style={{ marginTop: 6, display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓ Lat: {lat} &nbsp; Lon: {lng}</span>
                  <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: C.blue, fontWeight: 600, textDecoration: "none" }}>
                    View on Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Crew Signatures */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>CREW SIGNATURES (By signing, each person acknowledges STOP WORK AUTHORITY)</label>
            {signatures.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={s} onChange={e => { const ns = [...signatures]; ns[i] = e.target.value; setSignatures(ns); }} placeholder={`Crew member ${i + 1}`} />
                {signatures.length > 1 && <button onClick={() => setSignatures(prev => prev.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 16 }}>×</button>}
              </div>
            ))}
            <Btn small variant="ghost" onClick={() => setSignatures(prev => [...prev, ""])}>+ ADD SIGNATURE</Btn>
          </div>

          {/* Presenter Review */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>PRESENTER REVIEW</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 60, fontSize: 11 }} value={presenterReview} onChange={e => setPresenterReview(e.target.value)} />
          </div>

          {/* PPE & Weather */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>PPE CHECK</label>
              {[["frClothing", "FR Clothing, H2S Monitor, Hard Hat, Safety Glasses, Steel Toed Footwear"], ["toolsTrained", "Trained in use of tools / equipment"], ["confinedSpace", "Confined space permit completed?"]].map(([k, lbl]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer" }} onClick={() => setPpe(p => ({ ...p, [k]: !p[k] }))}>
                  <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${ppe[k] ? C.green : C.muted}`, background: ppe[k] ? C.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ppe[k] && <span style={{ color: C.white, fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 11, color: C.text }}>{lbl}</span>
                </div>
              ))}
            </div>
            <div>
              <label style={labelStyle}>WEATHER CONDITIONS</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {weatherOpts.map(w => (
                  <button key={w} onClick={() => toggleWeather(w)} style={{
                    background: weather.includes(w) ? C.blue : "transparent",
                    color: weather.includes(w) ? C.white : C.muted,
                    border: `1px solid ${weather.includes(w) ? C.blue : C.border}`,
                    borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                  }}>{w}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Pre-filled Job Steps */}
          <label style={labelStyle}>BASIC JOB STEPS / POTENTIAL HAZARDS / SAFE PROCEDURES</label>
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", background: C.darkBlue, padding: "8px 10px" }}>
              {["#", "Basic Job Step", "Potential Hazards", "Recommended Safe Procedures"].map(h => (
                <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>{h}</div>
              ))}
            </div>
            {PRE_FILLED_STEPS.map((s, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "6px 10px", borderBottom: `1px solid ${C.border}22`, background: i % 2 === 0 ? C.cardBg : C.steel }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{i + 1}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.step}</div>
                <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.hazard}</div>
                <div style={{ fontSize: 10, color: C.text }}>{s.procedure}</div>
              </div>
            ))}
            {/* Additional blank steps */}
            {additionalSteps.map((s, i) => (
              <div key={`a${i}`} style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "4px 10px", borderBottom: `1px solid ${C.border}22`, gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{PRE_FILLED_STEPS.length + i + 1}</div>
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.step} onChange={e => { const ns = [...additionalSteps]; ns[i].step = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.hazard} onChange={e => { const ns = [...additionalSteps]; ns[i].hazard = e.target.value; setAdditionalSteps(ns); }} />
                <input style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }} value={s.procedure} onChange={e => { const ns = [...additionalSteps]; ns[i].procedure = e.target.value; setAdditionalSteps(ns); }} />
              </div>
            ))}
          </div>
          <Btn small variant="ghost" onClick={() => setAdditionalSteps(prev => [...prev, { step: "", hazard: "", procedure: "" }])}>+ ADD STEP</Btn>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
          <Btn onClick={() => {
            onSave({
              jobId: job.id, ticketId: ticket?.id || null, date, time, operator, wellName, designatedDriver,
              lat, lng, weather, ppe, signatures: signatures.filter(Boolean),
              presenterReview, additionalSteps: additionalSteps.filter(s => s.step || s.hazard || s.procedure),
              savedAt: new Date().toISOString(),
            });
            onClose();
          }}>SAVE JSA</Btn>
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
        </div>
      </div>
    </div>
  );
}


export default JSAModal;
