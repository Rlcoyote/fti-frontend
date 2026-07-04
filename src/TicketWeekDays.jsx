import { useState, useEffect } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, inputStyle } from "./SharedUI.jsx";

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
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      <input
        type="time"
        style={{ ...inputStyle, width: 96, padding: "5px 6px" }}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {isOut && !disabled && (
        <span
          onClick={() => onChange("24:00")}
          title="Set to midnight (end of day)"
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
          24:00
        </span>
      )}
    </span>
  );
}

function TicketWeekDays({ ticket, accent, readOnly, onTotalHours, onWeekCreated, showNotice }) {
  const [days, setDays] = useState({}); // date -> { in1, out1, in2, out2, note }
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const weekStart = ticket.weekStart ? String(ticket.weekStart).slice(0, 10) : null;
  const dates = weekStart ? DAY_NAMES.map((_, i) => addDays(weekStart, i)) : [];

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
        onTotalHours?.(data.total_hours || 0);
      })
      .catch((e) => setBanner({ kind: "error", text: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

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
      onTotalHours?.(result.total_hours, { saved: true });
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
        job_id: ticket.jobId,
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
          <div style={{ fontSize: 11, opacity: 0.65 }}>Monday 12:00am through Sunday midnight · fill each day you worked</div>
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
            <TimeCell value={r.in1} onChange={(v) => setField(date, "in1", v)} disabled={readOnly} accent={accent} />
            <span style={{ opacity: 0.4, fontSize: 11 }}>to</span>
            <TimeCell value={r.out1} onChange={(v) => setField(date, "out1", v)} disabled={readOnly} accent={accent} isOut />
            <span style={{ opacity: 0.3, fontSize: 11, fontWeight: 700 }}>+</span>
            <TimeCell value={r.in2} onChange={(v) => setField(date, "in2", v)} disabled={readOnly} accent={accent} />
            <span style={{ opacity: 0.4, fontSize: 11 }}>to</span>
            <TimeCell value={r.out2} onChange={(v) => setField(date, "out2", v)} disabled={readOnly} accent={accent} isOut />
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
