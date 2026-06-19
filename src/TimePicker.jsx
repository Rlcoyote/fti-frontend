import { C } from "./config.js";
import { useEffect, useState } from "react";

function TimePicker({ value, onChange, startHour = 6, startPeriod = "AM" }) {
  // Parse existing value like "8:23 AM" into parts
  const parse = (v) => {
    if (!v) return { hr: "", min: "00", period: startPeriod };
    const m = String(v).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return { hr: "", min: "00", period: startPeriod };
    return { hr: String(parseInt(m[1])), min: m[2], period: m[3].toUpperCase() };
  };
  const { hr, min, period } = parse(value);

  // v28.221 — minutes are now typed for exact entry (was a fixed 6-slot
  // dropdown of 00/10/.../50, too coarse next to GPS minute-exact stamps).
  // Local text state keeps typing smooth; the stored value stays 2-digit.
  // We only re-sync from the parsed value when the field isn't focused, so a
  // keystroke isn't fought by the controlled re-render padding "5"→"05".
  const [minText, setMinText] = useState(min);
  const [minFocused, setMinFocused] = useState(false);
  useEffect(() => {
    if (!minFocused) setMinText(min);
  }, [min, minFocused]);

  const assemble = (h, m, p) => {
    if (!h) {
      onChange("");
      return;
    }
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
  const uniqueHours = hours.filter((h) => {
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });

  // Typed-minute handlers. Accept up to 2 digits, clamp 0–59, store 2-digit.
  const onMinChange = (raw) => {
    const digits = String(raw).replace(/\D/g, "").slice(0, 2);
    setMinText(digits);
    const n = digits === "" ? 0 : Math.min(59, parseInt(digits, 10));
    assemble(hr, String(n).padStart(2, "0"), period);
  };
  const onMinBlur = () => {
    setMinFocused(false);
    const digits = minText.replace(/\D/g, "");
    const n = digits === "" ? 0 : Math.min(59, parseInt(digits, 10));
    setMinText(String(n).padStart(2, "0"));
  };

  // v28.20 — bumped select widths so iOS Safari's native chevron doesn't
  // overlap the displayed value. Original 48px was just enough for the digits
  // but iOS adds ~12px of chevron padding on top, which on a narrow phone
  // column made the "—", ":", "00", "AM" elements visually collide.
  const selBase = {
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    padding: "3px 8px",
    fontSize: 13,
    color: C.text,
    background: C.cardBg,
    minWidth: 0, // let flex-shrink work if container is very tight
  };

  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "nowrap" }}>
      <select value={hr} onChange={(e) => assemble(e.target.value, min, period)} style={{ ...selBase, width: 64 }}>
        <option value="">—</option>
        {uniqueHours.map((h) => (
          <option key={h} value={String(h)}>
            {h}
          </option>
        ))}
      </select>
      <span style={{ fontSize: 14, fontWeight: 600, color: C.muted, flexShrink: 0 }}>:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={minText}
        onFocus={() => setMinFocused(true)}
        onChange={(e) => onMinChange(e.target.value)}
        onBlur={onMinBlur}
        aria-label="minutes"
        style={{ ...selBase, width: 48, textAlign: "center" }}
      />
      <span
        onClick={() => assemble(hr, min, period === "AM" ? "PM" : "AM")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 38,
          height: 30,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.04em",
          color: period === "AM" ? C.blue : C.red,
          background: period === "AM" ? "#e8f0fb" : "#fdecea",
          border: `1px solid ${period === "AM" ? C.blue + "44" : C.red + "44"}`,
          borderRadius: 4,
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
        }}
      >
        {period}
      </span>
    </div>
  );
}

export default TimePicker;
