import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { useNavigate } from "react-router-dom";

// ─── InspectionsListPage (v28.186) ───────────────────────────────────────────
// Driver: sees their own inspections (BE enforces).
// Mechanic / HSE / Manager / Admin / Owner: sees all (BE returns mode='all').
//
// First slice = simple chronological list. v28.187+ adds filters, defect-queue
// dashboard, and mechanic repair-completion flow.

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

function InspectionsListPage() {
  const { can } = useApp();
  const navigate = useNavigate();
  const canPerform = can("perform_inspections");
  const canViewAll = can("view_vehicle_defects");
  const canSee = canPerform || canViewAll;

  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("own");

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/inspections?limit=200`);
        if (!r.ok) {
          if (!cancelled) setError(`HTTP ${r.status}`);
          return;
        }
        const body = await r.json();
        if (!cancelled) {
          setInspections(body.inspections || []);
          setMode(body.mode || "own");
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canSee]);

  if (!canSee) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text }}>Inspections</h2>
        <p style={{ color: C.muted }}>You do not have permission to view inspections.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: C.text }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: C.text, fontSize: 20, fontWeight: 800 }}>{mode === "own" ? "My Inspections" : "All Inspections"}</h2>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
            {loading ? "Loading…" : error ? `Error: ${error}` : `${inspections.length} record${inspections.length !== 1 ? "s" : ""}`}
          </div>
        </div>
        {canPerform && <Btn onClick={() => navigate("/inspection/new")}>+ NEW INSPECTION</Btn>}
      </div>

      {!loading && inspections.length === 0 && (
        <div
          style={{
            padding: 24,
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            textAlign: "center",
            color: C.muted,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>No inspections yet.</div>
          {canPerform && (
            <div style={{ fontSize: 12 }}>
              Tap <strong>+ NEW INSPECTION</strong> above to record a pre-trip or post-trip DVIR.
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {inspections.map((insp) => {
          const isPass = insp.result === "pass";
          const hasRedTag = insp.active_red_tag_count > 0;
          return (
            <div
              key={insp.id}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 1fr 100px 100px",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderLeft: `4px solid ${hasRedTag ? C.red : isPass ? C.green : C.yellow}`,
                borderRadius: 5,
              }}
            >
              <div style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{formatDate(insp.inspection_date)}</div>
              <div style={{ fontSize: 13, color: C.text }}>
                <strong>{insp.vehicle_number || insp.vehicle_id?.slice(0, 8)}</strong>{" "}
                <span style={{ color: C.muted, fontSize: 11 }}>{[insp.year, insp.make, insp.model].filter(Boolean).join(" ")}</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>
                {insp.driver_name} • {insp.inspection_type === "pre_trip" ? "Pre-Trip" : "Post-Trip"}
              </div>
              <div>
                <span
                  style={{
                    background: isPass ? C.greenB : C.yellowB,
                    color: isPass ? C.green : C.yellow,
                    borderRadius: 3,
                    padding: "2px 8px",
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                  }}
                >
                  {isPass ? "PASS" : `${insp.defect_count} DEFECT${insp.defect_count !== 1 ? "S" : ""}`}
                </span>
              </div>
              <div>
                {hasRedTag ? (
                  <span
                    style={{
                      background: C.redB,
                      color: C.red,
                      borderRadius: 3,
                      padding: "2px 8px",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    RED-TAGGED
                  </span>
                ) : (
                  <span style={{ fontSize: 10, color: C.muted }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default InspectionsListPage;
