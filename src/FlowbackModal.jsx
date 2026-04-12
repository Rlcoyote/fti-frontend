import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle } from "./SharedUI.jsx";


function FlowbackModal({ job, onClose }) {
  const [dayNum, setDayNum] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const HOURS = ["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00","02:00","03:00","04:00","05:00","06:00"];
  const COLS = ["Choke", "FL PSI", "Tbg PSI", "Csg PSI", "Temp", "H2O/Hr", "OIL/Hr", "Gas/Hr", "Remarks"];

  const emptyRow = () => ({ choke: "", flPsi: "", tbgPsi: "", csgPsi: "", temp: "", h2oHr: "", oilHr: "", gasHr: "", remarks: "" });
  const [rows, setRows] = useState(HOURS.map(() => emptyRow()));
  const [allDays, setAllDays] = useState({});

  const loadDay = (day) => {
    if (allDays[day]) { setRows(allDays[day]); return; }
    fetch(`${API_URL}/flowback/${job.id}/${day}`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data) && data.length > 0) {
          const loaded = HOURS.map(hr => {
            const match = data.find(d => d.hour === hr);
            if (match) {
              return {
                choke: match.choke || "", flPsi: match.fl_psi != null ? String(match.fl_psi) : "",
                tbgPsi: match.tbg_psi != null ? String(match.tbg_psi) : "", csgPsi: match.csg_psi != null ? String(match.csg_psi) : "",
                temp: match.temp != null ? String(match.temp) : "", h2oHr: match.h2o_hr != null ? String(match.h2o_hr) : "",
                oilHr: match.oil_hr != null ? String(match.oil_hr) : "", gasHr: match.gas_hr != null ? String(match.gas_hr) : "",
                remarks: match.remarks || "",
              };
            }
            return emptyRow();
          });
          setRows(loaded);
          setAllDays(prev => ({ ...prev, [day]: loaded }));
        } else {
          setRows(HOURS.map(() => emptyRow()));
        }
      })
      .catch(() => setRows(HOURS.map(() => emptyRow())));
  };

  useState(() => { loadDay(1); });
  const changeDay = (newDay) => {
    setAllDays(prev => ({ ...prev, [dayNum]: rows }));
    setDayNum(newDay);
    loadDay(newDay);
  };

  const updateRow = (idx, field, val) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
    setSaveMsg("");
  };

  const saveDay = () => {
    setSaving(true); setSaveMsg("");
    const payload = {
      rows: HOURS.map((hr, idx) => ({
        hour: hr, choke: rows[idx].choke || null, fl_psi: rows[idx].flPsi || null,
        tbg_psi: rows[idx].tbgPsi || null, csg_psi: rows[idx].csgPsi || null,
        temp: rows[idx].temp || null, h2o_hr: rows[idx].h2oHr || null,
        oil_hr: rows[idx].oilHr || null, gas_hr: rows[idx].gasHr || null,
        remarks: rows[idx].remarks || null,
      }))
    };
    fetch(`${API_URL}/flowback/${job.id}/${dayNum}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(r => r.json())
      .then(data => {
        if (data.saved) { setSaveMsg("Saved"); setAllDays(prev => ({ ...prev, [dayNum]: rows })); }
        else { setSaveMsg("Error saving"); }
      })
      .catch(() => setSaveMsg("Error — check connection"))
      .finally(() => setSaving(false));
  };

  const fields = ["choke", "flPsi", "tbgPsi", "csgPsi", "temp", "h2oHr", "oilHr", "gasHr", "remarks"];
  const totalH2O = rows.reduce((s, r) => s + (Number(r.h2oHr) || 0), 0);
  const totalOil = rows.reduce((s, r) => s + (Number(r.oilHr) || 0), 0);
  const totalGas = rows.reduce((s, r) => s + (Number(r.gasHr) || 0), 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 0, width: 960, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Flowback Data — Day {dayNum}</div>
            <div style={{ fontSize: 11, color: C.muted }}>Work Order #{job.id} — {job.customer} · {job.wells[0]}</div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>DAY:</span>
            <button onClick={() => changeDay(Math.max(1, dayNum - 1))} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>◀</button>
            <span style={{ fontSize: 16, fontWeight: 800, minWidth: 30, textAlign: "center" }}>{dayNum}</span>
            <button onClick={() => changeDay(Math.min(31, dayNum + 1))} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>▶</button>
          </div>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 16, padding: "10px 24px", background: C.steel, borderBottom: `1px solid ${C.border}` }}>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>H2O TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.blue }}>{totalH2O}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>OIL TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{totalOil}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>GAS TODAY: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.orange }}>{totalGas}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>MCF</span></div>
          <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>TOTAL FLUID: </span><span style={{ fontSize: 13, fontWeight: 800 }}>{totalH2O + totalOil}</span><span style={{ fontSize: 9, fontWeight: 700, color: C.muted, marginLeft: 3 }}>bbls</span></div>
          {(totalH2O + totalOil) > 0 && <div><span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>OIL CUT: </span><span style={{ fontSize: 13, fontWeight: 800, color: C.red }}>{((totalOil / (totalH2O + totalOil)) * 100).toFixed(1)}%</span></div>}
        </div>

        {/* Data table */}
        <div style={{ padding: "0 24px 16px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, fontFamily: "'Arial', sans-serif", marginTop: 8 }}>
            <thead>
              <tr style={{ background: C.darkBlue }}>
                <th style={{ padding: "6px 8px", color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", borderBottom: `2px solid ${C.red}`, textAlign: "left" }}>TIME</th>
                {COLS.map(c => (
                  <th key={c} style={{ padding: "6px 6px", color: C.white, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", borderBottom: `2px solid ${C.red}`, textAlign: "left" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hr, idx) => (
                <tr key={hr} style={{ background: idx % 2 === 0 ? C.cardBg : C.steel, borderBottom: `1px solid ${C.border}22` }}>
                  <td style={{ padding: "3px 8px", fontWeight: 700, color: C.muted, fontSize: 11, whiteSpace: "nowrap" }}>{hr}</td>
                  {fields.map(f => (
                    <td key={f} style={{ padding: "2px 2px" }}>
                      <input
                        style={{ ...inputStyle, padding: "3px 4px", fontSize: 11, textAlign: f === "remarks" ? "left" : "right", width: f === "remarks" ? 120 : 55 }}
                        value={rows[idx][f]}
                        onChange={e => updateRow(idx, f, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, alignItems: "center" }}>
          <Btn onClick={saveDay}>{saving ? "SAVING..." : `SAVE DAY ${dayNum}`}</Btn>
          <Btn onClick={onClose} variant="ghost">CLOSE</Btn>
          {saveMsg && <span style={{ fontSize: 12, fontWeight: 700, color: saveMsg === "Saved" ? C.green : C.red, marginLeft: 8 }}>{saveMsg === "Saved" ? "✓ " : "✗ "}{saveMsg}</span>}
        </div>
      </div>
    </div>
  );
}


export default FlowbackModal;
