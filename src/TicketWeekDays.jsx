import { useState, useEffect } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import TimePicker from "./TimePicker.jsx";
import { Btn, inputStyle, TINT } from "./SharedUI.jsx";

// ─── TicketWeekDays (v28.267, master-ticket Phase 4) ────────────────────────
// The paper Tester ticket's DAYS / HOURS block, live: a Mon–Sun week of day
// cards, each with two IN/OUT pairs (24-hr; most days use only the first and
// last), an auto hours chip, and a note. Hours preview locally; the SERVER
// derives the number of record on save (tickets.days.js). SAVE WEEK saves the
// whole week atomically — a typo rejects the save with the day called out,
// nothing half-lands.
//
// NEXT WEEK creates the following Mon–Sun ticket on the same job, same well,
// same type (the paper flow: a new green sheet every Monday).
//
// accent = TICKET_TYPES[type].color, so a Tester week is green and a Pumper
// week is blue — the form tells you where you are (Reggie: dynamic, first
// class, intuitive for a hand who's never seen it).

const DAY_NAMES = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

const fmtMD = (iso) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
const addDays = (iso, n) => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Display-only mirror of the server's deriveDayHours (the server remains the
// authority on save). Returns { hours } or { err }.
function previewHours({ in1, out1, in2, out2 }) {
  const blank = (v) => !v || !String(v).trim();
  const mins = (t) => {
    const m = /^([01]?\d|2[0-4]):([0-5]\d)$/.exec(String(t).trim());
    if (!m) return null;
    const v = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return v > 1440 ? null : v;
  };
  const pairs = [];
  for (const [i, o] of [
    [in1, out1],
    [in2, out2],
  ]) {
    if (blank(i) && blank(o)) continue;
    if (blank(i) || blank(o)) return { err: "needs both IN and OUT" };
    const a = mins(i);
    const b = mins(o);
    if (a === null || b === null) return { err: "bad time" };
    if (b <= a) return { err: "OUT must be after IN" };
    pairs.push([a, b]);
  }
  if (!pairs.length) return { hours: null };
  if (pairs.length === 2 && pairs[1][0] < pairs[0][1]) return { err: "times overlap" };
  return { hours: Math.round((pairs.reduce((s, [a, b]) => s + (b - a), 0) / 60) * 100) / 100 };
}

function TimeCell({ value, onChange, disabled, accent, isOut }) {
  if (value === "24:00") {
    return (
      <span
        onClick={() => !disabled && onChange("")}
        title="Worked to midnight — tap to clear"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          border: `1px solid ${accent}`,
          background: `${accent}22`,
          color: accent,
          borderRadius: 6,
          padding: "6px 8px",
          fontSize: 12,
          fontWeight: 800,
          cursor: disabled ? "default" : "pointer",
          minWidth: 74,
        }}
      >
        24:00 ✕
      </span>
    );
  }
  // v28.412 (Reggie: "They all need the same flow. Standardized." + the AM/PM
  // cutoff): the day rows use THE TimePicker — the exact control RU/RD time
  // fields use — via 24h ↔ 12h adapters (storage stays HH:MM for the hours
  // math and the BE).
  const to12 = (v) => {
    if (!v) return "";
    const [H, M] = v.split(":").map(Number);
    if (!Number.isFinite(H)) return "";
    const p = H >= 12 ? "PM" : "AM";
    const h = H % 12 === 0 ? 12 : H % 12;
    return `${h}:${String(M).padStart(2, "0")} ${p}`;
  };
  const to24 = (v) => {
    if (!v) return "";
    const m = String(v).match(/^(\d{1,2}):(\d{2}) (AM|PM)$/);
    if (!m) return "";
    let H = Number(m[1]) % 12;
    if (m[3] === "PM") H += 12;
    return `${String(H).padStart(2, "0")}:${m[2]}`;
  };
  if (disabled) {
    return <span style={{ fontSize: 12, fontWeight: 700, minWidth: 74, display: "inline-block" }}>{value ? to12(value) : "—"}</span>;
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <TimePicker value={to12(value)} onChange={(v) => onChange(to24(v))} startHour={isOut ? 6 : 6} startPeriod={isOut ? "PM" : "AM"} />
      {isOut && (
        <span
          onClick={() => onChange("24:00")}
          title="Worked to midnight — sets this OUT to end-of-day 24:00"
          style={{
            fontSize: 9,
            fontWeight: 800,
            color: accent,
            border: `1px solid ${accent}55`,
            borderRadius: 4,
            padding: "2px 3px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          →24:00
        </span>
      )}
    </span>
  );
}

function TicketWeekDays({ ticket, accent, readOnly, onTotalHours, onWeekCreated, showNotice, onOpenJsa, onJsaGaps, jsaBump = 0 }) {
  // v28.273 — per-day JSA chips: one JSA per day (jsas UNIQUE(ticket_id,
  // date), live since Phase 1). jsaBump increments when the parent's JSA
  // modal closes so the chips refresh.
  const [jsaIndex, setJsaIndex] = useState({});
  const [days, setDays] = useState({}); // date -> { in1, out1, in2, out2, note }
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [splitOpen, setSplitOpen] = useState({}); // v28.414 — per-day split-pair reveal

  const weekStart = ticket.weekStart ? String(ticket.weekStart).slice(0, 10) : null;
  const dates = weekStart ? DAY_NAMES.map((_, i) => addDays(weekStart, i)) : [];

  useEffect(() => {
    if (!ticket.id) return;
    api
      .get(`/jsas/ticket/${ticket.id}/index`)
      .then((rows) => {
        const map = {};
        (rows || []).forEach((r) => {
          map[String(r.date).slice(0, 10)] = { id: r.id, complete: !!r.completed_at };
        });
        setJsaIndex(map);
      })
      .catch(() => {});
  }, [ticket.id, jsaBump]);

  useEffect(() => {
    if (!ticket.id) return;
    api
      .get(`/tickets/${ticket.id}/days`)
      .then((data) => {
        const map = {};
        (data.days || []).forEach((d) => {
          map[String(d.date).slice(0, 10)] = { in1: d.in1 || "", out1: d.out1 || "", in2: d.in2 || "", out2: d.out2 || "", note: d.note || "" };
        });
        setDays(map);
        setDirty(false);
        const worked = (data.days || []).filter((d) => d.in1 || d.out1 || d.in2 || d.out2).length;
        onTotalHours?.(data.total_hours || 0, { daysWorked: worked });
      })
      .catch((e) => setBanner({ kind: "error", text: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  // v28.418 — lift the sign-gate gap list (worked days lacking a COMPLETED
  // JSA) so TicketDetail can block the sign actions with the same truth the
  // red strips show. Computed from raw state (runs before the early return —
  // rules of hooks). Recomputed on every day edit and every JSA change.
  const jsaGapsKey = Object.entries(days)
    .filter(([, r]) => r.in1 || r.out1 || r.in2 || r.out2)
    .map(([d]) => d)
    .filter((d) => !jsaIndex[d]?.complete)
    .sort()
    .join(",");
  useEffect(() => {
    onJsaGaps?.(jsaGapsKey ? jsaGapsKey.split(",") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsaGapsKey]);

  if (!weekStart) return <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>This ticket has no week anchor — re-create it with a date.</div>;

  const rowFor = (date) => days[date] || { in1: "", out1: "", in2: "", out2: "", note: "" };
  const setField = (date, field, value) => {
    setDirty(true);
    setBanner(null);
    setDays((prev) => ({ ...prev, [date]: { ...rowFor(date), [field]: value } }));
  };

  const totals = dates.map((d) => previewHours(rowFor(d)));
  const weekTotal = Math.round(totals.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100;
  const anyErr = totals.some((t) => t.err);

  const saveWeek = async () => {
    setBusy(true);
    setBanner(null);
    try {
      const payload = dates.map((date) => ({ date, ...rowFor(date) })).filter((d) => d.in1 || d.out1 || d.in2 || d.out2 || (d.note && d.note.trim()));
      const result = await api.put(`/tickets/${ticket.id}/days`, { days: payload });
      setDirty(false);
      setBanner({ kind: "ok", text: `Week saved — ${result.total_hours} total test hours.` });
      onTotalHours?.(result.total_hours, { saved: true, daysWorked: Object.values(days).filter((d) => d.in1 || d.out1 || d.in2 || d.out2).length });
    } catch (e) {
      setBanner({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const nextWeek = async () => {
    const nextMonday = addDays(weekStart, 7);
    try {
      const r = await api.post(`/tickets`, {
        job_id: ticket.workOrderId,
        type: ticket.type,
        status: "incomplete",
        date: nextMonday,
        week_start: nextMonday,
        assigned_wells: ticket.assignedWells || [],
        notes: null,
        lineItems: [],
      });
      showNotice?.(
        "Next Week Created",
        `Ticket #${r.ticket_number || r.id} opened for the week of ${fmtMD(nextMonday)}. Find it on this work order.`,
        "success",
      );
      onWeekCreated?.(r);
    } catch (e) {
      showNotice?.("Next Week Failed", e.message, "error");
    }
  };

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Week banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          background: `linear-gradient(90deg, ${accent}22, transparent 70%)`,
          borderLeft: `4px solid ${accent}`,
          borderRadius: "0 8px 8px 0",
          padding: "8px 12px",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.08em", color: C.text }}>
            WEEK OF {fmtMD(dates[0])} – {fmtMD(dates[6])}
          </div>
          <div style={{ fontSize: 11, opacity: 0.65 }}>
            Monday 12:00am through Sunday midnight · fill each day you worked. One continuous shift = the FIRST pair only. The second pair is for SPLIT DAYS —
            off location and back on the same date. →24:00 stamps an OUT at end-of-day midnight.
          </div>
        </div>
        {!readOnly && (
          <Btn
            small
            variant="ghost"
            onClick={nextWeek}
            title="Open next Monday's ticket on this work order — same well, fresh week"
            style={{ borderColor: accent, color: accent }}
          >
            NEXT WEEK →
          </Btn>
        )}
      </div>

      {/* Day cards */}
      {dates.map((date, i) => {
        const r = rowFor(date);
        const t = totals[i];
        const has = t.hours !== null && t.hours !== undefined && !t.err;
        // v28.418 — sign-gate-per-day (Reggie: "Require it at the beginning of
        // the day. When time is logged or entered, a reminder flashes"): any
        // time on the row without a COMPLETED JSA for that date = standing red
        // strip. It appears the moment the first stamp is typed and clears
        // itself when the JSA completes. The strip is the reminder; the WALL
        // is at sign time (FE guard + BE 422 on emailed/signed/sigNotReq).
        const needsJsa = !!(r.in1 || r.out1 || r.in2 || r.out2) && !jsaIndex[date]?.complete;
        return (
          <div
            key={date}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              padding: "8px 10px",
              marginBottom: 6,
              borderRadius: 8,
              border: `1px solid ${has ? `${accent}66` : C.border}`,
              background: has ? `${accent}0d` : "transparent",
              transition: "border-color 0.2s, background 0.2s",
            }}
          >
            <div style={{ minWidth: 92 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: has ? accent : C.text, letterSpacing: "0.05em" }}>{DAY_NAMES[i]}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{fmtMD(date)}</div>
            </div>
            {/* v28.414 (Reggie: split days are the EXCEPTION — "it will not be
                a regular scenario") — one aligned pair by default; the second
                pair lives behind + SPLIT DAY and auto-shows when it has data. */}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", width: 22 }}>IN</span>
              <TimeCell value={r.in1} onChange={(v) => setField(date, "in1", v)} disabled={readOnly} accent={accent} />
              <span style={{ opacity: 0.4, fontSize: 11 }}>to</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.06em", width: 26 }}>OUT</span>
              <TimeCell value={r.out1} onChange={(v) => setField(date, "out1", v)} disabled={readOnly} accent={accent} isOut />
            </span>
            {splitOpen[date] || r.in2 || r.out2 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: accent, letterSpacing: "0.06em" }}>SPLIT · IN</span>
                <TimeCell value={r.in2} onChange={(v) => setField(date, "in2", v)} disabled={readOnly} accent={accent} />
                <span style={{ opacity: 0.4, fontSize: 11 }}>to</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.06em" }}>OUT</span>
                <TimeCell value={r.out2} onChange={(v) => setField(date, "out2", v)} disabled={readOnly} accent={accent} isOut />
                {!readOnly && !r.in2 && !r.out2 && (
                  <span
                    onClick={() => setSplitOpen((p) => ({ ...p, [date]: false }))}
                    style={{ fontSize: 10, color: C.muted, cursor: "pointer", fontWeight: 700 }}
                  >
                    ✕
                  </span>
                )}
              </span>
            ) : (
              !readOnly && (
                <span
                  onClick={() => setSplitOpen((p) => ({ ...p, [date]: true }))}
                  title="Off location and back on the same day? Add a second in/out pair."
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: C.muted,
                    border: `1px dashed ${C.border}`,
                    borderRadius: 4,
                    padding: "3px 8px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  + SPLIT DAY
                </span>
              )
            )}
            {onOpenJsa && (
              <span
                onClick={() => !readOnly && onOpenJsa(date)}
                title={
                  jsaIndex[date]?.complete
                    ? "JSA complete — tap to view"
                    : jsaIndex[date]
                      ? "JSA started — tap to finish"
                      : "No JSA for this day yet — tap to start one"
                }
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.03em",
                  padding: "3px 8px",
                  borderRadius: 6,
                  cursor: readOnly ? "default" : "pointer",
                  border: `1px solid ${jsaIndex[date]?.complete ? accent : jsaIndex[date] ? TINT.goldDraft : C.border}`,
                  background: jsaIndex[date]?.complete ? `${accent}22` : jsaIndex[date] ? `${TINT.goldDraft}22` : "transparent",
                  color: jsaIndex[date]?.complete ? accent : jsaIndex[date] ? TINT.goldDraft : C.text,
                  opacity: jsaIndex[date] ? 1 : 0.55,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {jsaIndex[date]?.complete ? "✓ JSA" : jsaIndex[date] ? "● JSA" : "+ JSA"}
              </span>
            )}
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                fontWeight: 800,
                color: t.err ? C.red : has ? accent : C.text,
                opacity: t.err || has ? 1 : 0.35,
                border: `1px solid ${t.err ? C.red : has ? `${accent}66` : C.border}`,
                borderRadius: 6,
                padding: "3px 9px",
                whiteSpace: "nowrap",
              }}
              title={t.err || "Hours for this day"}
            >
              {t.err ? t.err : has ? `${t.hours} hrs` : "— hrs"}
            </span>
            <input
              style={{ ...inputStyle, flex: "1 1 140px", minWidth: 120, padding: "5px 8px", fontSize: 12 }}
              placeholder="note (optional)"
              value={r.note}
              onChange={(e) => setField(date, "note", e.target.value)}
              disabled={readOnly}
            />
            {needsJsa && (
              <div
                style={{
                  flexBasis: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 8px",
                  borderRadius: 6,
                  background: `${C.red}14`,
                  border: `1px solid ${C.red}55`,
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 800, color: C.red, letterSpacing: "0.04em" }}>
                  ⚠ JSA MUST BE COMPLETED for this day — the week cannot be signed without it.
                </span>
                {onOpenJsa && !readOnly && (
                  <button
                    className="fti-btn"
                    type="button"
                    onClick={() => onOpenJsa(date)}
                    style={{
                      marginLeft: "auto",
                      background: C.red,
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      padding: "4px 10px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {jsaIndex[date] ? "FINISH JSA" : "START JSA"}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Footer: total + save */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: accent, letterSpacing: "0.04em" }}>TOTAL TEST HOURS: {weekTotal}</div>
        {!readOnly && (
          <Btn
            onClick={saveWeek}
            disabled={busy || anyErr || !dirty}
            style={{ background: accent }}
            title={anyErr ? "Fix the day marked in red first" : "Save the whole week"}
          >
            {busy ? "SAVING…" : dirty ? "SAVE WEEK" : "WEEK SAVED"}
          </Btn>
        )}
        {banner && <span style={{ fontSize: 12, fontWeight: 700, color: banner.kind === "error" ? C.red : C.green }}>{banner.text}</span>}
      </div>
    </div>
  );
}

export default TicketWeekDays;
