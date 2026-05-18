import { C } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── JSAJobSteps (v28.155 — ship 2 of the JSAModal split) ─────────────────
// The "Basic Job Steps / Potential Hazards / Safe Procedures" table: six
// read-only pre-filled rows followed by any number of editable blank rows,
// plus the + ADD STEP button. The pre-filled rows are the standard FTI
// tailgate-meeting steps and live here with the table that renders them.
//
// Controlled — JSAModal owns additionalSteps (it goes into the JSA save
// payload and the dirty check); this component just renders + edits it.

const PRE_FILLED_STEPS = [
  {
    step: "Driving to/from or in and around location",
    hazard: "Driving too fast. Backing without a spotter. Being unaware of surroundings. Using a cell phone while operating a vehicle.",
    procedure: "Communicate with those around you using signals/lights/horn. Do not use cell phone while driving. Eliminate distractions.",
  },
  { step: "SDS", hazard: "Chemical Exposure", procedure: "SDS electronically or physically available on site." },
  {
    step: "Worksite & PPE inspection of all equipment",
    hazard: "Slips, trips, falls, pinch points, enclosed areas, poor lighting, H2S. Defective, absent, or dirty PPE.",
    procedure: "Repair, replace or clean necessary items. Remove debris. Identify PPE needed & safe handling procedures.",
  },
  {
    step: "Receive authorization to begin work",
    hazard: "Onsite Operations Supervisor not aware of work being performed or permits not completed.",
    procedure: "Receive authorization from the person in charge. Complete all applicable Permits to Work.",
  },
  {
    step: "Conduct Safety Meeting with all onsite workers",
    hazard: "Jobsite workers not knowing what activity is about to take place. Hazardous conditions not observed by personnel.",
    procedure: "Review with all personnel & sign off on safety meeting sheet. Allow others to voice concerns, comments, questions.",
  },
  {
    step: "Begin job slowly. Watch for personnel not paying attention.",
    hazard: "Quick movements can result in poor awareness of surrounding personnel and can easily cause unintentional reactions.",
    procedure: "Work slow and steady. If situations require quick movements, alert everyone before moving.",
  },
];

function JSAJobSteps({ additionalSteps, setAdditionalSteps }) {
  return (
    <>
      <label style={labelStyle}>BASIC JOB STEPS / POTENTIAL HAZARDS / SAFE PROCEDURES</label>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", background: C.darkBlue, padding: "8px 10px" }}>
          {["#", "Basic Job Step", "Potential Hazards", "Recommended Safe Procedures"].map((h) => (
            <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.white, letterSpacing: "0.08em" }}>
              {h}
            </div>
          ))}
        </div>
        {PRE_FILLED_STEPS.map((s, i) => (
          <div
            key={i}
            style={{
              display: "grid",
              gridTemplateColumns: "40px 1fr 1fr 1fr",
              padding: "6px 10px",
              borderBottom: `1px solid ${C.border}22`,
              background: i % 2 === 0 ? C.cardBg : C.steel,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{i + 1}</div>
            <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.step}</div>
            <div style={{ fontSize: 10, color: C.text, paddingRight: 8 }}>{s.hazard}</div>
            <div style={{ fontSize: 10, color: C.text }}>{s.procedure}</div>
          </div>
        ))}
        {/* Additional blank steps */}
        {additionalSteps.map((s, i) => (
          <div
            key={`a${i}`}
            style={{ display: "grid", gridTemplateColumns: "40px 1fr 1fr 1fr", padding: "4px 10px", borderBottom: `1px solid ${C.border}22`, gap: 4 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{PRE_FILLED_STEPS.length + i + 1}</div>
            <input
              style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }}
              value={s.step}
              onChange={(e) => {
                const ns = [...additionalSteps];
                ns[i].step = e.target.value;
                setAdditionalSteps(ns);
              }}
            />
            <input
              style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }}
              value={s.hazard}
              onChange={(e) => {
                const ns = [...additionalSteps];
                ns[i].hazard = e.target.value;
                setAdditionalSteps(ns);
              }}
            />
            <input
              style={{ ...inputStyle, padding: "3px 6px", fontSize: 10 }}
              value={s.procedure}
              onChange={(e) => {
                const ns = [...additionalSteps];
                ns[i].procedure = e.target.value;
                setAdditionalSteps(ns);
              }}
            />
          </div>
        ))}
      </div>
      <Btn small variant="ghost" onClick={() => setAdditionalSteps((prev) => [...prev, { step: "", hazard: "", procedure: "" }])}>
        + ADD STEP
      </Btn>
    </>
  );
}

export default JSAJobSteps;
