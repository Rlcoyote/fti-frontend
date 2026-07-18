import { useState, useEffect, useCallback, useMemo } from "react";
import { C } from "./config.js";
import { getMine, fmtDur, requestCorrection } from "./clock.js";

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
// ISO → "YYYY-MM-DDTHH:MM" in the device's local time, for <input type=datetime-local>.
// Field employees' devices are on Central, so the round-trip (input → new Date → ISO) is correct.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function MyHoursPage() {
  const today = ctToday();
  const [from, setFrom] = useState(addDaysStr(today, -6));
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  // 5B — inline correction request
  const [fixId, setFixId] = useState(null);
  const [fixStart, setFixStart] = useState("");
  const [fixEnd, setFixEnd] = useState("");
  const [fixNote, setFixNote] = useState("");
  const [fixBusy, setFixBusy] = useState(false);

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

  const openFix = (r) => {
    setFixId(r.id);
    setFixStart(toLocalInput(r.start_at));
    setFixEnd(r.end_at ? toLocalInput(r.end_at) : "");
    setFixNote("");
    setMsg(null);
  };

  const submitFix = async (r) => {
    setFixBusy(true);
    setMsg(null);
    try {
      const body = { note: fixNote };
      const curStart = toLocalInput(r.start_at);
      const curEnd = r.end_at ? toLocalInput(r.end_at) : "";
      if (fixStart && fixStart !== curStart) body.requested_start_at = new Date(fixStart).toISOString();
      if (fixEnd && fixEnd !== curEnd) body.requested_end_at = new Date(fixEnd).toISOString();
      if (!body.requested_start_at && !body.requested_end_at) {
        setMsg({ kind: "error", text: "Change the start or end time before submitting." });
        return;
      }
      await requestCorrection(r.id, body);
      setMsg({ kind: "success", text: "Correction requested — a manager will review it." });
      setFixId(null);
      await load();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setFixBusy(false);
    }
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
            className="fti-btn"
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
            background: C.redB,
            color: C.red,
            border: `1px solid ${C.red}44`,
          }}
        >
          {err}
        </div>
      )}

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: msg.kind === "error" ? C.redB : C.greenB,
            color: msg.kind === "error" ? C.red : C.green,
            border: `1px solid ${msg.kind === "error" ? C.red : C.green}44`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Summary */}
      <div style={{ background: C.greenB, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ color: C.green, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 4 }}>
          TOTAL — {from} → {to}
        </div>
        <div style={{ color: "white", fontSize: 34, fontWeight: 800 }}>{fmtDur(totalSecs)}</div>
        <div style={{ color: C.text, fontSize: 12.5, marginTop: 4 }}>
          {dayCount} day{dayCount === 1 ? "" : "s"} worked · {jobCount} job{jobCount === 1 ? "" : "s"}
        </div>
        {byCategory.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
            {byCategory.map(([k, v]) => (
              <div key={k}>
                <span style={{ color: C.green, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{k}</span>{" "}
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
                .map((r) => {
                  const pending = r.requested_start_at || r.requested_end_at;
                  const inp = {
                    marginTop: 3,
                    padding: "5px 7px",
                    fontSize: 13,
                    color: C.text,
                    background: C.cardBg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 5,
                  };
                  return (
                    <div
                      key={r.id}
                      style={{ marginBottom: 5, background: C.cardBg, border: `1px solid ${r.flagged ? `${C.yellow}66` : C.border}`, borderRadius: 6 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 12px", fontSize: 13 }}>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ color: C.text, fontWeight: 700 }}>{r.ticket_number ? `#${r.ticket_number}` : "Shop/Yard"}</span>{" "}
                          <span style={{ color: C.muted }}>· {r.category}</span>
                          {pending ? (
                            <span style={{ color: C.yellow, fontWeight: 700 }}> · ✎ fix requested</span>
                          ) : (
                            r.flagged && <span style={{ color: C.yellow, fontWeight: 700 }}> · ⚑ under review</span>
                          )}
                          <div style={{ color: C.muted, fontSize: 12, marginTop: 1 }}>
                            {fmtClock(r.start_at)} → {r.end_at ? fmtClock(r.end_at) : <span style={{ color: C.green, fontWeight: 700 }}>open</span>}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
                          <span style={{ color: C.text, fontWeight: 700 }}>{fmtDur(r.elapsed_seconds)}</span>
                          {!pending && fixId !== r.id && (
                            <button
                              className="fti-btn"
                              onClick={() => openFix(r)}
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: C.muted,
                                background: "transparent",
                                border: `1px solid ${C.border}`,
                                borderRadius: 5,
                                padding: "3px 8px",
                                cursor: "pointer",
                              }}
                            >
                              Request fix
                            </button>
                          )}
                        </div>
                      </div>
                      {fixId === r.id && (
                        <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                            <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                              Start
                              <br />
                              <input type="datetime-local" value={fixStart} onChange={(e) => setFixStart(e.target.value)} style={inp} />
                            </label>
                            {r.end_at && (
                              <label style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>
                                End
                                <br />
                                <input type="datetime-local" value={fixEnd} onChange={(e) => setFixEnd(e.target.value)} style={inp} />
                              </label>
                            )}
                          </div>
                          <input
                            placeholder="Reason (e.g. forgot to clock in; started at 6)"
                            value={fixNote}
                            onChange={(e) => setFixNote(e.target.value)}
                            style={{ padding: "6px 8px", fontSize: 13, color: C.text, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 5 }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="fti-btn"
                              onClick={() => submitFix(r)}
                              disabled={fixBusy}
                              style={{
                                padding: "6px 14px",
                                fontSize: 13,
                                fontWeight: 800,
                                color: "white",
                                background: C.green,
                                border: "none",
                                borderRadius: 6,
                                cursor: fixBusy ? "wait" : "pointer",
                              }}
                            >
                              {fixBusy ? "…" : "Submit request"}
                            </button>
                            <button
                              className="fti-btn"
                              onClick={() => setFixId(null)}
                              disabled={fixBusy}
                              style={{
                                padding: "6px 14px",
                                fontSize: 13,
                                fontWeight: 700,
                                color: C.muted,
                                background: "transparent",
                                border: `1px solid ${C.border}`,
                                borderRadius: 6,
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })
      )}
    </div>
  );
}
