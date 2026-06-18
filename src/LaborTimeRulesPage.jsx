import { useState, useEffect, useMemo } from "react";
import { useApp } from "./AppContext.jsx";
import { C, API_URL } from "./config.js";

// ─── LaborTimeRulesPage (v28.213, Labor Time Phase 4b) ──────────────────────
// Owner/admin-only. The two global dials that shape the JOB clock-in window:
//
//   GRACE   — how many minutes BEFORE the computed departure a crew member may
//             clock into the job with NO flag (legit prep/load-up time).
//   LOCKOUT — the outer bound. Clocking into the job earlier than this is
//             refused (they clock Yard/Shop time instead, still paid).
//
// The departure anchor itself is per-ticket: Location Time (due on loc) minus
// the yard→pin drive time. These dials are global — no per-ticket override.
// Stored in app_settings (labor_grace_minutes / labor_lockout_minutes).

function fmtMin(m) {
  const x = ((Math.round(m) % 1440) + 1440) % 1440;
  let h = Math.floor(x / 60);
  const mm = x % 60;
  const ap = h < 12 ? "AM" : "PM";
  h %= 12;
  if (h === 0) h = 12;
  return `${h}:${String(mm).padStart(2, "0")} ${ap}`;
}

export default function LaborTimeRulesPage() {
  const { settings, refreshSettings, currentUser } = useApp();
  const role = currentUser?.role;
  const isAdmin = role === "owner" || role === "admin";

  const [grace, setGrace] = useState("");
  const [lockout, setLockout] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Seed the inputs from current settings once they load.
  useEffect(() => {
    if (settings) {
      setGrace(String(settings.labor_grace_minutes ?? "45"));
      setLockout(String(settings.labor_lockout_minutes ?? "90"));
    }
  }, [settings]);

  const g = parseInt(grace, 10);
  const l = parseInt(lockout, 10);
  const valid = Number.isFinite(g) && Number.isFinite(l) && g >= 0 && l >= g;

  // Worked example: Location Time 7:00 AM, 45-min drive → departure 6:15 AM.
  // 6:15 AM = 375 minutes after midnight.
  const example = useMemo(() => {
    const DEP = 375; // 6:15 AM
    if (!valid) return null;
    return {
      departure: fmtMin(DEP),
      cleanFrom: fmtMin(DEP - g),
      flaggedFrom: fmtMin(DEP - l),
    };
  }, [g, l, valid]);

  const save = async () => {
    if (!valid) {
      setMsg({ kind: "error", text: "Lockout must be greater than or equal to Grace, and both must be 0 or more." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_URL}/settings`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labor_grace_minutes: String(g), labor_lockout_minutes: String(l) }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${r.status}`);
      }
      await refreshSettings();
      setMsg({ kind: "success", text: "Saved. New clock-ins use these rules immediately." });
    } catch (e) {
      setMsg({ kind: "error", text: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return <div style={{ padding: 24, color: C.muted }}>Labor Time Rules are owner/admin only.</div>;
  }

  const labelStyle = { fontSize: 12, fontWeight: 700, color: C.muted, letterSpacing: "0.04em", marginBottom: 6 };
  const inputStyle = {
    width: 120,
    padding: "10px 12px",
    fontSize: 18,
    fontWeight: 700,
    color: C.text,
    background: C.cardBg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 16px 64px" }}>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 800, margin: "4px 0 6px" }}>Labor Time Rules</h2>
      <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, margin: "0 0 18px" }}>
        These two global dials shape the <strong style={{ color: C.text }}>job clock-in window</strong>. The window is anchored per ticket to{" "}
        <strong style={{ color: C.text }}>Location Time − drive time</strong> (when the crew should leave the yard). Yard/Shop time is never gated.
      </p>

      {msg && (
        <div
          style={{
            marginBottom: 14,
            padding: "9px 13px",
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

      <div
        style={{ display: "flex", gap: 28, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px", marginBottom: 18 }}
      >
        <div>
          <div style={labelStyle}>GRACE (minutes)</div>
          <input type="number" min="0" value={grace} onChange={(e) => setGrace(e.target.value)} style={inputStyle} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, maxWidth: 180 }}>Clock in this close to departure with no flag (prep / load-up).</div>
        </div>
        <div>
          <div style={labelStyle}>LOCKOUT (minutes)</div>
          <input type="number" min="0" value={lockout} onChange={(e) => setLockout(e.target.value)} style={inputStyle} />
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6, maxWidth: 180 }}>
            Earlier than this before departure, the job clock-in is refused (Yard time only).
          </div>
        </div>
      </div>

      {/* Worked example so the numbers are concrete. */}
      {example && (
        <div style={{ background: "#0f3d22", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
          <div style={{ color: "#9ff0bd", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", marginBottom: 10 }}>HOW THIS PLAYS OUT</div>
          <div style={{ color: "#cfe9d8", fontSize: 13, marginBottom: 12 }}>
            Example — Location Time <strong style={{ color: "white" }}>7:00 AM</strong>, a <strong style={{ color: "white" }}>45-min</strong> drive ⟶ departure{" "}
            <strong style={{ color: "white" }}>{example.departure}</strong>:
          </div>
          <ol style={{ margin: 0, paddingLeft: 20, color: "white", fontSize: 13, lineHeight: 1.7 }}>
            <li>
              <strong>Clean</strong> clock-in: <strong>{example.cleanFrom}</strong> onward.
            </li>
            <li>
              <strong>Flagged</strong> (allowed, queued for review): <strong>{example.flaggedFrom}</strong> – {example.cleanFrom}.
            </li>
            <li>
              <strong>Blocked</strong> (Yard time only): before <strong>{example.flaggedFrom}</strong>.
            </li>
          </ol>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || !valid}
        style={{
          padding: "12px 28px",
          fontSize: 15,
          fontWeight: 800,
          color: "white",
          background: valid ? C.green : C.muted,
          border: "none",
          borderRadius: 8,
          cursor: saving || !valid ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving…" : "Save Rules"}
      </button>
    </div>
  );
}
