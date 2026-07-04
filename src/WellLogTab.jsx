import { useState, useEffect, useCallback } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, inputStyle } from "./SharedUI.jsx";

// ─── WellLogTab (v28.267, master-ticket Phase 4) ────────────────────────────
// The tester's WELL LOG: choke / pressures / rates, hourly, per well + real
// calendar date. Replaces the buried job-level FlowbackModal (relative Day
// 1/2/3, no well, no dates — retired this version). Keyed job+well+date on
// the server (well_readings), so the day tester and the night tester — each
// on their own weekly ticket — write ONE continuous stream for the well.
//
// Day picker = the ticket's week; a green dot marks days that already have
// entries. Save is per day, whole-day replace (server validates numbers).

const COLS = [
  ["choke", "CHOKE", 64],
  ["fl_psi", "FL PSI", 70],
  ["tbg_psi", "TBG PSI", 70],
  ["csg_psi", "CSG PSI", 70],
  ["temp", "TEMP", 60],
  ["h2o_hr", "H2O/HR", 70],
  ["oil_hr", "OIL/HR", 70],
  ["gas_hr", "GAS/HR", 70],
  ["remarks", "REMARKS", 170],
];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String((i + 7) % 24).padStart(2, "0")}:00`); // 07:00 → 06:00, the field day

const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtMD = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const DAY_ABBR = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function WellLogTab({ ticket, accent, readOnly }) {
  const wells = ticket.assignedWells?.length ? ticket.assignedWells : [];
  const [well, setWell] = useState(wells[0] || "");
  const weekStart = ticket.weekStart ? String(ticket.weekStart).slice(0, 10) : null;
  const dates = weekStart ? DAY_ABBR.map((_, i) => addDays(weekStart, i)) : [];
  const [date, setDate] = useState(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return dates.includes(today) ? today : dates[0] || today;
  });
  const [rows, setRows] = useState(HOURS.map(() => ({})));
  const [haveData, setHaveData] = useState({}); // "well|date" -> true
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const loadIndex = useCallback(() => {
    api
      .get(`/well-readings/${ticket.jobId}`)
      .then((idx) => {
        const map = {};
        (idx || []).forEach((r) => {
          map[`${r.well}|${String(r.date).slice(0, 10)}`] = true;
        });
        setHaveData(map);
      })
      .catch(() => {});
  }, [ticket.jobId]);

  useEffect(loadIndex, [loadIndex]);

  useEffect(() => {
    if (!well || !date) return;
    api
      .get(`/well-readings/${ticket.jobId}?well=${encodeURIComponent(well)}&date=${date}`)
      .then((data) => {
        const byHour = {};
        (data || []).forEach((r) => {
          byHour[r.hour.padStart(5, "0")] = r;
        });
        setRows(
          HOURS.map((h) => {
            const r = byHour[h] || {};
            return {
              choke: r.choke || "",
              fl_psi: r.fl_psi ?? "",
              tbg_psi: r.tbg_psi ?? "",
              csg_psi: r.csg_psi ?? "",
              temp: r.temp ?? "",
              h2o_hr: r.h2o_hr ?? "",
              oil_hr: r.oil_hr ?? "",
              gas_hr: r.gas_hr ?? "",
              remarks: r.remarks || "",
            };
          }),
        );
        setDirty(false);
        setBanner(null);
      })
      .catch((e) => setBanner({ kind: "error", text: e.message }));
     
  }, [well, date, ticket.jobId]);

  const setCell = (i, field, value) => {
    setDirty(true);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const saveDay = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const payload = rows.map((r, i) => ({ hour: HOURS[i], ...r }));
      const result = await api.put(`/well-readings/${ticket.jobId}`, { well, date, rows: payload });
      setDirty(false);
      setBanner({ kind: "ok", text: `${fmtMD(date)} saved — ${result.saved} hourly entries.` });
      loadIndex();
    } catch (e) {
      setBanner({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  if (!weekStart) return null;

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Well + day pickers */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        {wells.length > 1 ? (
          <select value={well} onChange={(e) => setWell(e.target.value)} style={{ ...inputStyle, width: "auto", fontWeight: 700 }}>
            {wells.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        ) : (
          <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>{well || "— no well assigned —"}</div>
        )}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {dates.map((d, i) => {
            const active = d === date;
            const has = haveData[`${well}|${d}`];
            return (
              <span
                key={d}
                onClick={() => setDate(d)}
                title={`${DAY_ABBR[i]} ${fmtMD(d)}${has ? " — has entries" : ""}`}
                style={{
                  position: "relative",
                  padding: "5px 10px",
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  border: `1px solid ${active ? accent : C.border}`,
                  background: active ? accent : "transparent",
                  color: active ? "#fff" : C.text,
                  transition: "background 0.15s, border-color 0.15s",
                }}
              >
                {DAY_ABBR[i]} {fmtMD(d)}
                {has && (
                  <span
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: C.green,
                      border: `1px solid ${C.cardBg}`,
                    }}
                  />
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Hourly grid — the paper flowback sheet */}
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 780 }}>
          <thead>
            <tr style={{ background: `${accent}18` }}>
              <th
                style={{
                  padding: "6px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  color: accent,
                  textAlign: "left",
                  position: "sticky",
                  left: 0,
                  background: C.cardBg,
                }}
              >
                HOUR
              </th>
              {COLS.map(([k, label]) => (
                <th key={k} style={{ padding: "6px 4px", fontSize: 10, fontWeight: 800, color: accent, textAlign: "left" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h, i) => (
              <tr key={h} style={{ borderTop: `1px solid ${C.border}33` }}>
                <td style={{ padding: "3px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", position: "sticky", left: 0, background: C.cardBg }}>
                  {h}
                </td>
                {COLS.map(([k, , w]) => (
                  <td key={k} style={{ padding: 2 }}>
                    <input
                      style={{ ...inputStyle, width: w, padding: "4px 6px", fontSize: 12 }}
                      value={rows[i][k] ?? ""}
                      onChange={(e) => setCell(i, k, e.target.value)}
                      disabled={readOnly}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        {!readOnly && (
          <Btn
            onClick={saveDay}
            disabled={busy || !dirty || !well}
            style={{ background: accent }}
            title={!well ? "Assign a well to this ticket first" : "Save this day's readings"}
          >
            {busy ? "SAVING…" : dirty ? `SAVE ${fmtMD(date)}` : "DAY SAVED"}
          </Btn>
        )}
        {banner && <span style={{ fontSize: 12, fontWeight: 700, color: banner.kind === "error" ? C.red : C.green }}>{banner.text}</span>}
      </div>
    </div>
  );
}

export default WellLogTab;
