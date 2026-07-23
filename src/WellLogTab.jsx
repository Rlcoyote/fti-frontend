import { useState, useEffect, useCallback } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, inputStyle } from "./SharedUI.jsx";

// ─── WellLogTab (v28.267; ledger upgrade v28.278) ───────────────────────────
// The tester's WELL LOG, now carrying the master workbook's full layer
// (FT - MASTER - Flowback Data Multiple Wells): hourly readings per well +
// real date, PLUS the recovery ledger — LOAD TO RECOVER (frac load, barrels,
// tester-entered, lives on the WO's well), today's totals, overall
// cumulatives, oil cut %, and FLUID LEFT TO RECOVER. All rollups computed
// SERVER-side (GET /well-readings/:workOrderId/summary) — the spreadsheet's
// INDIRECT carry-over chain became a live SUM.
//
// The field day starts at the OPERATOR'S hour (06/07/08:00 all exist) —
// jobs.field_day_start drives the grid order and is editable here.
// PRINT gives the POC a PDF via the browser; EMAIL sends the print-quality
// HTML summary to any list of addresses (they don't need a login).

const COLS = [
  ["choke", "CHOKE", 60],
  ["fl_psi", "FL PSI", 64],
  ["tbg_psi", "TBG PSI", 64],
  ["csg_psi", "CSG PSI", 64],
  ["interm_psi", "INT PSI", 64],
  ["surf_psi", "SURF PSI", 64],
  ["temp", "TEMP", 56],
  ["h2o_hr", "H2O/HR", 64],
  ["oil_hr", "OIL/HR", 64],
  ["gas_hr", "GAS/HR", 64],
  ["remarks", "REMARKS", 150],
];
const hoursFrom = (start) => Array.from({ length: 24 }, (_, i) => `${String((i + start) % 24).padStart(2, "0")}:00`);

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
const emptyRow = () => Object.fromEntries(COLS.map(([k]) => [k, ""]));

function Stat({ label, value, accent, big }) {
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", opacity: 0.6 }}>{label}</div>
      <div style={{ fontSize: big ? 20 : 14, fontWeight: 900, color: accent || C.text }}>{value ?? "—"}</div>
    </div>
  );
}

function WellLogTab({ ticket, accent, readOnly, showNotice, onSummary }) {
  const wells = ticket.assignedWells?.length ? ticket.assignedWells : [];
  const [well, setWell] = useState(wells[0] || "");
  const weekStart = ticket.weekStart ? String(ticket.weekStart).slice(0, 10) : null;
  const dates = weekStart ? DAY_ABBR.map((_, i) => addDays(weekStart, i)) : [];
  const [date, setDate] = useState(() => {
    const today = new Date().toLocaleDateString("en-CA");
    return dates.includes(today) ? today : dates[0] || today;
  });
  const [dayStart, setDayStart] = useState(7);
  const [rows, setRows] = useState(hoursFrom(7).map(() => emptyRow()));
  const [summary, setSummary] = useState(null);
  const [loadInput, setLoadInput] = useState("");
  const [haveData, setHaveData] = useState({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState("");

  const HOURS = hoursFrom(dayStart);

  const loadIndex = useCallback(() => {
    api
      .get(`/well-readings/${ticket.workOrderId}`)
      .then((idx) => {
        const map = {};
        (idx || []).forEach((r) => {
          map[`${r.well}|${String(r.date).slice(0, 10)}`] = true;
        });
        setHaveData(map);
        // v28.400 — lift the count of THIS ticket's week-days that carry well
        // readings (any well) for the WEEK SYNOPSIS strip.
        if (onSummary && ticket.weekStart) {
          const ws = String(ticket.weekStart).slice(0, 10);
          const weekDates = new Set(Array.from({ length: 7 }, (_, i) => addDays(ws, i)));
          const loggedDates = new Set((idx || []).map((r) => String(r.date).slice(0, 10)).filter((d) => weekDates.has(d)));
          onSummary(loggedDates.size);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.workOrderId, ticket.weekStart]);

  const loadSummary = useCallback(() => {
    if (!well || !date) return;
    api
      .get(`/well-readings/${ticket.workOrderId}/summary?well=${encodeURIComponent(well)}&date=${date}`)
      .then((s) => {
        setSummary(s);
        setDayStart(s.field_day_start ?? 7);
        setLoadInput(s.load_to_recover != null ? String(s.load_to_recover) : "");
      })
      .catch(() => setSummary(null));
  }, [ticket.workOrderId, well, date]);

  useEffect(loadIndex, [loadIndex]);
  useEffect(loadSummary, [loadSummary]);

  useEffect(() => {
    if (!well || !date) return;
    api
      .get(`/well-readings/${ticket.workOrderId}?well=${encodeURIComponent(well)}&date=${date}`)
      .then((data) => {
        const byHour = {};
        (data || []).forEach((r) => {
          byHour[r.hour.padStart(5, "0")] = r;
        });
        setRows(
          hoursFrom(dayStart).map((h) => {
            const r = byHour[h] || {};
            return Object.fromEntries(COLS.map(([k]) => [k, r[k] ?? ""]));
          }),
        );
        setDirty(false);
        setBanner(null);
      })
      .catch((e) => setBanner({ kind: "error", text: e.message }));
  }, [well, date, ticket.workOrderId, dayStart]);

  const setCell = (i, field, value) => {
    setDirty(true);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const saveDay = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const payload = rows.map((r, i) => ({ hour: HOURS[i], ...r }));
      const result = await api.put(`/well-readings/${ticket.workOrderId}`, { well, date, rows: payload });
      setDirty(false);
      setBanner({ kind: "ok", text: `${fmtMD(date)} saved — ${result.saved} hourly entries.` });
      loadIndex();
      loadSummary();
    } catch (e) {
      setBanner({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const saveLoad = async () => {
    try {
      await api.put(`/well-readings/${ticket.workOrderId}/meta`, { well, load_to_recover: loadInput === "" ? null : loadInput });
      loadSummary();
      showNotice?.("Saved", `Load to recover set for ${well}.`, "success");
    } catch (e) {
      showNotice?.("Save Failed", e.message, "error");
    }
  };

  const saveDayStart = async (h) => {
    setDayStart(h);
    try {
      await api.put(`/well-readings/${ticket.workOrderId}/meta`, { field_day_start: h });
    } catch (e) {
      showNotice?.("Save Failed", e.message, "error");
    }
  };

  const sendEmail = async () => {
    const to = emailTo
      .split(/[,;\s]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (!to.length) return;
    try {
      await api.post(`/well-readings/${ticket.workOrderId}/email-summary`, { well, date, to });
      setEmailOpen(false);
      showNotice?.("Summary Sent", `${fmtMD(date)} summary for ${well} emailed to ${to.length} recipient${to.length === 1 ? "" : "s"}.`, "success");
    } catch (e) {
      showNotice?.("Email Failed", e.message, "error");
    }
  };

  if (!weekStart) return null;

  const num = (v) => (v == null ? "—" : Number(v).toLocaleString());

  return (
    <div style={{ marginBottom: 18 }} className="well-log-print">
      <style>{`@media print { .no-print { display: none !important; } .well-log-print, .well-log-print * { color: #000 !important; background: #fff !important; border-color: #999 !important; } @page { size: letter landscape; margin: 0.4in; } }`}</style>

      {/* Well + day pickers + actions */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
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
        <span style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 10, fontWeight: 700, opacity: 0.6 }} title="The operator's field-day start — the grid runs 24 hours from here">
            DAY STARTS
          </label>
          <select
            value={dayStart}
            onChange={(e) => saveDayStart(parseInt(e.target.value, 10))}
            disabled={readOnly}
            style={{ ...inputStyle, width: 82, padding: "4px 6px", fontSize: 12 }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <Btn small variant="ghost" onClick={() => window.print()} title="Print / save this day's log and ledger as a PDF">
            PRINT
          </Btn>
          <Btn small variant="blue" onClick={() => setEmailOpen((o) => !o)} title="Email this day's summary — no login needed on their end">
            EMAIL
          </Btn>
        </span>
      </div>

      {emailOpen && (
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 10,
            padding: "8px 10px",
            border: `1px solid ${C.blue}55`,
            borderRadius: 8,
            background: `${C.blue}11`,
          }}
        >
          <input
            style={{ ...inputStyle, flex: "1 1 280px" }}
            placeholder="Email addresses — separate with commas"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
          />
          <Btn small variant="blue" onClick={sendEmail}>
            SEND {fmtMD(date)} SUMMARY
          </Btn>
        </div>
      )}

      {/* The recovery ledger — the workbook's computed layer */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 18,
          flexWrap: "wrap",
          padding: "10px 12px",
          marginBottom: 10,
          borderLeft: `4px solid ${accent}`,
          borderRadius: "0 8px 8px 0",
          background: `linear-gradient(90deg, ${accent}18, transparent 75%)`,
        }}
      >
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", opacity: 0.6 }}>LOAD TO RECOVER (BBL)</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <input
              style={{ ...inputStyle, width: 100, fontWeight: 800 }}
              value={loadInput}
              onChange={(e) => setLoadInput(e.target.value)}
              disabled={readOnly}
              placeholder="frac load"
              className="no-print-border"
            />
            {!readOnly && loadInput !== String(summary?.load_to_recover ?? "") && (
              <Btn small variant="ghost" onClick={saveLoad} style={{ borderColor: accent, color: accent }}>
                SET
              </Btn>
            )}
          </div>
        </div>
        <Stat label="FLUID LEFT TO RECOVER (BBL)" value={num(summary?.fluid_left)} accent={accent} big />
        <Stat label="H2O TODAY" value={num(summary?.today?.h2o)} />
        <Stat label="OIL TODAY" value={num(summary?.today?.oil)} />
        <Stat label="GAS TODAY (MCF)" value={num(summary?.today?.gas)} />
        <Stat label="OIL CUT" value={summary?.oil_cut_today != null ? `${summary.oil_cut_today}%` : "—"} />
        <Stat label="TOTAL H2O REC" value={num(summary?.cumulative?.h2o)} />
        <Stat label="TOTAL OIL REC" value={num(summary?.cumulative?.oil)} />
        <Stat label="TOTAL GAS REC" value={num(summary?.cumulative?.gas)} />
      </div>

      {/* Hourly grid */}
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
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
                      value={rows[i]?.[k] ?? ""}
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

      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
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
