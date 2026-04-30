import { useState } from "react";
import { C } from "./config.js";

function TimePicker({ value, onChange, startHour = 6, startPeriod = "AM" }) {
  // Parse existing value like "8:20 AM" into parts
  const parse = (v) => {
    if (!v) return { hr: "", min: "00", period: startPeriod };
    const m = String(v).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return { hr: "", min: "00", period: startPeriod };
    return { hr: String(parseInt(m[1])), min: m[2], period: m[3].toUpperCase() };
  };
  const { hr, min, period } = parse(value);

  const assemble = (h, m, p) => {
    if (!h) { onChange(""); return; }
    onChange(`${h}:${m} ${p}`);
  };

  // Build hour options starting from startHour
  const hours = [];
  const startH24 = startPeriod === "PM" && startHour !== 12 ? startHour + 12 : startHour === 12 && startPeriod === "AM" ? 0 : startHour;
  for (let i = 0; i < 12; i++) {
    const h24 = (startH24 + i) % 24;
    const h12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
    hours.push(h12);
  }
  // Dedupe while preserving order
  const seen = new Set();
  const uniqueHours = hours.filter(h => { if (seen.has(h)) return false; seen.add(h); return true; });

  const minutes = ["00", "10", "20", "30", "40", "50"];
  // v28.20 — bumped select widths so iOS Safari's native chevron doesn't
  // overlap the displayed value. Original 48px was just enough for the digits
  // but iOS adds ~12px of chevron padding on top, which on a narrow phone
  // column made the "—", ":", "00", "AM" elements visually collide.
  const selBase = {
    border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 8px",
    fontSize: 13, color: C.text, background: C.cardBg,
    minWidth: 0, // let flex-shrink work if container is very tight
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
      <select value={hr} onChange={e => assemble(e.target.value, min, period)} style={{ ...selBase, width: 64 }}>
        <option value="">—</option>
        {uniqueHours.map(h => <option key={h} value={String(h)}>{h}</option>)}
      </select>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.muted, flexShrink: 0 }}>:</span>
      <select value={min} onChange={e => assemble(hr, e.target.value, period)} style={{ ...selBase, width: 64 }}>
        {minutes.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
      <span onClick={() => assemble(hr, min, period === "AM" ? "PM" : "AM")} style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 38, height: 30, fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
        color: period === "AM" ? C.blue : C.red,
        background: period === "AM" ? "#e8f0fb" : "#fdecea",
        border: `1px solid ${period === "AM" ? C.blue + "44" : C.red + "44"}`,
        borderRadius: 4, cursor: "pointer", userSelect: "none", flexShrink: 0,
      }}>{period}</span>
    </div>
  );
}


export default TimePicker;
