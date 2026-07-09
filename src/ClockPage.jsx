import { useState, useEffect, useCallback } from "react";
import { C } from "./config.js";
import { getCurrent, getMine, getClockable, clockIn, clockOut, fmtDur } from "./clock.js";

// ─── ClockPage (v28.204, Labor Time Phase 2) ────────────────────────────────
// The single place every employee clocks in/out. Mobile-first, dummy-proof
// (Article XIV): one big status, one big button, today's tickets to pick from,
// the day's segments adding up. Self-scoped — shows only the caller's time.
//
// Live duration ticks every second off the open segment's start_at (no decimal —
// always Hh Mm). Phase 4 adds the fine yard/drive/job split + lead lifecycle.

function ClockPage() {
  const [open, setOpen] = useState(null); // current open segment
  const [tickets, setTickets] = useState([]); // today's clockable tickets
  const [segments, setSegments] = useState([]); // today's segments
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      const [cur, clk, mine] = await Promise.all([getCurrent(), getClockable(), getMine()]);
      setOpen(cur.open || null);
      setTickets(clk || []);
      setSegments(mine || []);
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // tick the live duration every second while clocked in
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);

  const doClockIn = async (ticket_id) => {
    setBusy(true);
    setMsg(null);
    try {
      await clockIn({ ticket_id });
      setMsg({ kind: "success", text: "Clocked in." });
      await refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const doClockOut = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await clockOut();
      setMsg({ kind: "success", text: `Clocked out — ${fmtDur(r.closed?.elapsed_seconds)} logged.` });
      await refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  };

  const liveSeconds = open ? Math.max(0, Math.floor((nowTick - new Date(open.start_at).getTime()) / 1000)) : 0;

  if (loading) return <div style={{ padding: 24, color: C.muted }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 14px 60px" }}>
      <h2 style={{ color: C.text, fontSize: 20, fontWeight: 800, margin: "4px 0 14px" }}>Clock</h2>

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

      {/* BIG STATUS */}
      <div
        style={{
          background: open ? "#0f3d22" : C.cardBg,
          border: `2px solid ${open ? C.green : C.border}`,
          borderRadius: 12,
          padding: "20px 16px",
          textAlign: "center",
          marginBottom: 18,
        }}
      >
        {open ? (
          <>
            <div style={{ color: "#9ff0bd", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>CLOCKED IN</div>
            <div style={{ color: "white", fontSize: 34, fontWeight: 800, margin: "6px 0" }}>{fmtDur(liveSeconds)}</div>
            <div style={{ color: "#cfe9d8", fontSize: 13, marginBottom: 14 }}>
              {open.ticket_number ? `Ticket #${open.ticket_number}${open.ticket_type ? ` · ${open.ticket_type}` : ""}` : "Shop / Yard"}
            </div>
            <button
              onClick={doClockOut}
              disabled={busy}
              style={{
                width: "100%",
                padding: "16px",
                fontSize: 17,
                fontWeight: 800,
                color: "white",
                background: C.red,
                border: "none",
                borderRadius: 8,
                cursor: busy ? "wait" : "pointer",
              }}
            >
              CLOCK OUT
            </button>
          </>
        ) : (
          <>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>CLOCKED OUT</div>
            <div style={{ color: C.text, fontSize: 15, margin: "10px 0 4px" }}>Pick today's ticket below to clock in.</div>
          </>
        )}
      </div>

      {/* v28.211 — Phase 4a in-app alert: surfaced when the post-trip auto-clocked
          you out of the job (the SMS is the push; this is the in-app half). */}
      {!open && segments[0] && (segments[0].notes || "").includes("post-trip") && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            background: C.yellowB,
            color: C.yellow,
            border: `1px solid ${C.yellow}55`,
          }}
        >
          You were clocked out of {segments[0].ticket_number ? `ticket #${segments[0].ticket_number}` : "the job"} by the post-trip. If you're still working,
          clock into Yard/Shop below.
        </div>
      )}

      {/* TODAY'S TICKETS (clock into one) */}
      {!open && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8 }}>TODAY'S TICKETS</div>
          {tickets.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>No tickets assigned to you today.</div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => doClockIn(t.id)}
                disabled={busy}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "14px",
                  marginBottom: 8,
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  cursor: busy ? "wait" : "pointer",
                  color: C.text,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  #{t.ticket_number} {t.ticket_type ? `· ${t.ticket_type}` : ""}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{[t.customer_name, t.location].filter(Boolean).join(" — ") || "—"}</div>
              </button>
            ))
          )}
        </div>
      )}

      {/* TODAY'S SEGMENTS */}
      <div>
        <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 8 }}>TODAY</div>
        {segments.length === 0 ? (
          <div style={{ color: C.muted, fontSize: 13, fontStyle: "italic" }}>No time logged yet today.</div>
        ) : (
          segments.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 12px",
                marginBottom: 6,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              <span style={{ color: C.text, fontWeight: 600 }}>
                {s.ticket_number ? `#${s.ticket_number}` : "Shop/Yard"} <span style={{ color: C.muted, fontWeight: 400 }}>· {s.category}</span>
                {s.end_at ? "" : <span style={{ color: C.green, fontWeight: 700 }}> · open</span>}
              </span>
              <span style={{ color: C.muted }}>{fmtDur(s.elapsed_seconds)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ClockPage;
