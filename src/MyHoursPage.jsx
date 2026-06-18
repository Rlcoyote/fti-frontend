import { useState, useEffect, useCallback, useMemo } from "react";
import { C } from "./config.js";
import { getMine, fmtDur } from "./clock.js";

// ─── MyHoursPage (v28.216, Labor Time Phase 6) ──────────────────────────────
// Every employee's own read-only timesheet over a date range. Self-scoped
// (GET /api/time/mine). Timestamp-native — exact minutes, never decimal
// (the payroll view). Grouped by Central-time day, with a per-category roll-up
// and a range total. Corrections to a wrong/missed punch are Phase 5B.

const TZ = "America/Chicago";

// YYYY-MM-DD in Central time (the business day), regardless of device tz.
function ctToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
// Pure UTC date arithmetic on a YYYY-MM-DD string (no tz drift).
function addDaysStr(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function ctDateOf(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}
function fmtDayLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(Date.UTC(y, m - 1, d)));
}
function fmtClock(iso) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

export default function MyHoursPage() {
  const today = ctToday();
  const [from, setFrom] = useState(addDaysStr(today, -6));
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await getMine(from, to);
      setRows(r || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const preset = (days) => {
    setFrom(addDaysStr(today, -(days - 1)));
    setTo(today);
  };

  // Roll-ups + day grouping.
  const { totalSecs, byCategory, byDay, dayCount, jobCount } = useMemo(() => {
    const cat = {};
    const days = {};
    const jobs = new Set();
    let total = 0;
    for (const r of rows) {
      const secs = r.elapsed_seconds || 0;
      total += secs;
      cat[r.category] = (cat[r.category] || 0) + secs;
      if (r.ticket_number) jobs.add(r.ticket_number);
      const day = ctDateOf(r.start_at);
      (days[day] = days[day] || []).push(r);
    }
    return {
      totalSecs: total,
      byCategory: Object.entries(cat).sort((a, b) => b[1] - a[1]),
      byDay: Object.entries(days).sort((a, b) => (a[0] < b[0] ? 1 : -1)),
      dayCount: Object.keys(days).length,
      jobCount: jobs.size,
    };
  }, [rows]);

  const dateInput = {
    padding: "6px 8px",
    fontSize: 13,
    color: C.text,
    background: C.cardBg,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 14px 64px" }}>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "4px 0 12px" }}>My Hours</h2>

      {/* Range controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14 }}>
        {[
          [7, "7 days"],
          [14, "14 days"],
          [30, "30 days"],
        ].map(([d, label]) => (
          <button
            key={d}
            onClick={() => preset(d)}
            style={{
              padding: "6px 12px",
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 6,
              cursor: "pointer",
              color: C.muted,
              background: C.cardBg,
              border: `1px solid ${C.border}`,
            }}
          >
            {label}
          </button>
        ))}
        <span style={{ color: C.muted, fontSize: 12 }}>from</span>
        <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={dateInput} />
        <span style={{ color: C.muted, fontSize: 12 }}>to</span>
        <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} style={dateInput} />
      </div>

      {err && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: "#fdecec",
            color: C.red,
            border: `1px solid ${C.red}44`,
          }}
        >
          {err}
        </div>
      )}

      {/* Summary */}
      <div style={{ background: "#0f3d22", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ color: "#9ff0bd", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 4 }}>
          TOTAL — {from} → {to}
        </div>
        <div style={{ color: "white", fontSize: 34, fontWeight: 800 }}>{fmtDur(totalSecs)}</div>
        <div style={{ color: "#cfe9d8", fontSize: 12.5, marginTop: 4 }}>
          {dayCount} day{dayCount === 1 ? "" : "s"} worked · {jobCount} job{jobCount === 1 ? "" : "s"}
        </div>
        {byCategory.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12, paddingTop: 12, borderTop: "1px solid #ffffff22" }}>
            {byCategory.map(([k, v]) => (
              <div key={k}>
                <span style={{ color: "#9ff0bd", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{k}</span>{" "}
                <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{fmtDur(v)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Per-day breakdown */}
      {loading ? (
        <div style={{ color: C.muted, padding: 16 }}>Loading…</div>
      ) : byDay.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 14, fontStyle: "italic", padding: 16 }}>No time logged in this range.</div>
      ) : (
        byDay.map(([day, segs]) => {
          const dayTotal = segs.reduce((s, r) => s + (r.elapsed_seconds || 0), 0);
          return (
            <div key={day} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ color: C.text, fontSize: 14, fontWeight: 800 }}>{fmtDayLabel(day)}</span>
                <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>{fmtDur(dayTotal)}</span>
              </div>
              {segs
                .slice()
                .sort((a, b) => (a.start_at < b.start_at ? -1 : 1))
                .map((r) => (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "9px 12px",
                      marginBottom: 5,
                      background: C.cardBg,
                      border: `1px solid ${r.flagged ? `${C.yellow}66` : C.border}`,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <span style={{ color: C.text, fontWeight: 700 }}>{r.ticket_number ? `#${r.ticket_number}` : "Shop/Yard"}</span>{" "}
                      <span style={{ color: C.muted }}>· {r.category}</span>
                      {r.flagged && <span style={{ color: "#8a6500", fontWeight: 700 }}> · ⚑ under review</span>}
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                        {fmtClock(r.start_at)} → {r.end_at ? fmtClock(r.end_at) : <span style={{ color: C.green, fontWeight: 700 }}>open</span>}
                      </div>
                    </div>
                    <span style={{ color: C.text, fontWeight: 700, whiteSpace: "nowrap" }}>{fmtDur(r.elapsed_seconds)}</span>
                  </div>
                ))}
            </div>
          );
        })
      )}
    </div>
  );
}
