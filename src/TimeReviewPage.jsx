import { useState, useEffect, useCallback } from "react";
import { C } from "./config.js";
import { getFlagged, approveEntry, fmtDur } from "./clock.js";

// ─── TimeReviewPage (v28.215, Labor Time Phase 5A) ──────────────────────────
// Owner/Admin/Manager (approve_time_corrections) review the time entries the
// clock-in gate flagged — early clock-ins, drive-unresolved. "Approve" accepts
// the entry and clears the flag (stamps approved_by/at). Adjusting a time or
// removing a bogus entry is the correction flow (Phase 5B), not here.

const TZ = "America/Chicago";
function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function TimeReviewPage() {
  const [status, setStatus] = useState("open");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getFlagged(status);
      setRows(r || []);
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const doApprove = async (id) => {
    setBusyId(id);
    setMsg(null);
    try {
      await approveEntry(id);
      setMsg({ kind: "success", text: "Approved — flag cleared." });
      await refresh();
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setBusyId(null);
    }
  };

  const TABS = [
    ["open", "Open"],
    ["resolved", "Resolved"],
    ["all", "All"],
  ];

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "18px 14px 64px" }}>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "4px 0 4px" }}>Time Review</h2>
      <p style={{ color: C.muted, fontSize: 13, margin: "0 0 14px" }}>
        Time entries the clock-in gate flagged for a look. Approve to accept and clear the flag.
      </p>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 6,
              cursor: "pointer",
              color: status === key ? "white" : C.muted,
              background: status === key ? C.green : C.cardBg,
              border: `1px solid ${status === key ? C.green : C.border}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: msg.kind === "error" ? "#fdecec" : "#e6f5ec",
            color: msg.kind === "error" ? C.red : C.green,
            border: `1px solid ${msg.kind === "error" ? C.red : C.green}44`,
          }}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: C.muted, padding: 16 }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: C.muted, fontSize: 14, fontStyle: "italic", padding: 16 }}>
          {status === "open" ? "Nothing flagged — all clear." : "No entries."}
        </div>
      ) : (
        rows.map((r) => {
          const resolved = !!r.approved_at;
          return (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "12px 14px",
                marginBottom: 8,
                background: C.cardBg,
                border: `1px solid ${resolved ? C.border : `${C.yellow}66`}`,
                borderRadius: 8,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>
                  {r.user_name} <span style={{ color: C.muted, fontWeight: 600 }}>· {r.ticket_number ? `Ticket #${r.ticket_number}` : "Shop/Yard"}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                  {fmtWhen(r.start_at)} → {r.end_at ? fmtWhen(r.end_at) : <span style={{ color: C.green, fontWeight: 700 }}>open</span>} ·{" "}
                  {fmtDur(r.elapsed_seconds)} · {r.category}
                </div>
                {r.flag_reason && <div style={{ fontSize: 12.5, color: resolved ? C.muted : "#8a6500", marginTop: 4, fontWeight: 600 }}>⚑ {r.flag_reason}</div>}
                {resolved && (
                  <div style={{ fontSize: 11.5, color: C.green, marginTop: 3 }}>
                    ✓ approved by {r.approved_by_name || "—"} · {fmtWhen(r.approved_at)}
                  </div>
                )}
              </div>
              {!resolved && (
                <button
                  onClick={() => doApprove(r.id)}
                  disabled={busyId === r.id}
                  style={{
                    flexShrink: 0,
                    padding: "9px 18px",
                    fontSize: 13,
                    fontWeight: 800,
                    color: "white",
                    background: C.green,
                    border: "none",
                    borderRadius: 7,
                    cursor: busyId === r.id ? "wait" : "pointer",
                  }}
                >
                  {busyId === r.id ? "…" : "Approve"}
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
