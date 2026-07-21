import { useState, useEffect, useCallback } from "react";
import { C, E, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { Btn } from "./SharedUI.jsx";

// ─── ErrorLogPage (v28.368) — THE ERROR LOG viewer ──────────────────────────
// Owner/admin. Every captured failure with its story: who, severity, version,
// message — expand for the stack, the context, and the breadcrumb trail from
// login to the moment it broke. Feeds the same table the fix-agent will read.

const SEV = {
  crash: { label: "CRASH", color: () => C.red },
  api: { label: "API", color: () => C.orange },
  data: { label: "DATA", color: () => C.yellow },
  error: { label: "ERROR", color: () => C.muted },
};

function ErrorLogPage() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [open, setOpen] = useState(null);
  const [sevFilter, setSevFilter] = useState("all");

  const refresh = useCallback(() => {
    api
      .get(`/errors`)
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (err) return <div style={{ color: C.red, padding: SP.gutter }}>{err}</div>;
  if (!rows) return <div style={{ color: C.muted, padding: SP.gutter }}>Loading error log…</div>;

  const visible = sevFilter === "all" ? rows : rows.filter((r) => r.severity === sevFilter);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: `${SP.xxl + 2}px ${SP.xl + 2}px 60px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.lg, flexWrap: "wrap", marginBottom: SP.xs }}>
        <h1 style={{ fontSize: F.h1, margin: 0, color: C.text }}>ERROR LOG</h1>
        <Btn small variant="ghost" onClick={refresh}>
          REFRESH
        </Btn>
      </div>
      <div style={{ fontSize: F.body, color: C.muted, marginBottom: SP.xl }}>
        Every captured failure, with its story — who, what they did from login, and where it broke. Last 200, 30-day retention.
      </div>
      <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.xl, flexWrap: "wrap" }}>
        {["all", "crash", "api", "data", "error"].map((k) => (
          <button
            key={k}
            className="fti-btn"
            onClick={() => setSevFilter(k)}
            style={{
              padding: "5px 12px",
              fontSize: F.label,
              fontWeight: 700,
              borderRadius: 999,
              border: `1px solid ${sevFilter === k ? C.red : C.border}`,
              background: sevFilter === k ? `${C.red}22` : "transparent",
              color: C.text,
              cursor: "pointer",
              fontFamily: "'Arial', sans-serif",
            }}
          >
            {k.toUpperCase()}
            {k !== "all" ? ` (${rows.filter((r) => r.severity === k).length})` : ` (${rows.length})`}
          </button>
        ))}
      </div>

      {visible.length === 0 && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.card, color: C.green, fontWeight: 700 }}>
          ✓ Nothing captured. Quiet is good.
        </div>
      )}
      {visible.map((r) => {
        const sev = SEV[r.severity] || SEV.error;
        const isOpen = open === r.id;
        return (
          <div key={r.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, marginBottom: SP.sm, boxShadow: E.raised }}>
            <div
              onClick={() => setOpen(isOpen ? null : r.id)}
              style={{ display: "flex", alignItems: "center", gap: SP.md, padding: `${SP.lg}px ${SP.xl}px`, cursor: "pointer", flexWrap: "wrap" }}
            >
              <span
                style={{
                  fontSize: F.badge,
                  fontWeight: 800,
                  color: sev.color(),
                  border: `1px solid ${sev.color()}66`,
                  background: `${sev.color()}18`,
                  borderRadius: R.xl,
                  padding: "2px 7px",
                }}
              >
                {sev.label}
              </span>
              <span style={{ fontSize: F.body, fontWeight: 700, color: C.text, flex: "1 1 300px" }}>{r.message}</span>
              <span style={{ fontSize: F.label, color: C.muted, whiteSpace: "nowrap" }}>
                {r.user_name || "anonymous"} · {r.app_version || "?"} · {new Date(r.occurred_at).toLocaleString()}
              </span>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: `${SP.lg}px ${SP.xl}px`, fontSize: F.meta }}>
                {r.context && (
                  <div style={{ marginBottom: SP.md }}>
                    <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: 2 }}>CONTEXT</div>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: C.text, fontFamily: "monospace", fontSize: F.meta }}>
                      {JSON.stringify(r.context, null, 1)}
                    </pre>
                  </div>
                )}
                {Array.isArray(r.breadcrumbs) && r.breadcrumbs.length > 0 && (
                  <div style={{ marginBottom: SP.md }}>
                    <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: 2 }}>THE STORY — LOGIN TO FAILURE</div>
                    {r.breadcrumbs.map((b, i) => (
                      <div key={i} style={{ color: C.text, fontFamily: "monospace", fontSize: F.meta }}>
                        {String(b.t || "").slice(11, 19)} · {b.type} {b.data || ""}
                      </div>
                    ))}
                  </div>
                )}
                {r.stack && (
                  <div>
                    <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: 2 }}>STACK</div>
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        color: C.muted,
                        fontFamily: "monospace",
                        fontSize: F.badge,
                        maxHeight: 260,
                        overflowY: "auto",
                      }}
                    >
                      {r.stack}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ErrorLogPage;
