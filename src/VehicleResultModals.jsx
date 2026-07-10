import { C } from "./config.js";
import { Btn, ModalWrap } from "./SharedUI.jsx";

// ─── Vehicle import / GPS-sync result modals (extracted from VehiclesPage v28.235) ─

function Stat({ label, value, tone }) {
  const colors = {
    ok: { fg: C.green, bg: C.greenB },
    warn: { fg: C.yellow, bg: C.yellowB },
    error: { fg: C.red, bg: C.redB },
  };
  const c = colors[tone] || { fg: C.text, bg: C.steel };
  return (
    <div style={{ padding: 12, background: c.bg, borderRadius: 4, textAlign: "center", border: `1px solid ${c.fg}22` }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: c.fg }}>{value}</div>
      <div style={{ fontSize: 9, fontWeight: 800, color: c.fg, letterSpacing: "0.1em", marginTop: 2 }}>{label.toUpperCase()}</div>
    </div>
  );
}

export function ImportResultModal({ result, onClose }) {
  return (
    <ModalWrap title="Import complete" onClose={onClose} width={560}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Stat label="Processed" value={result.processed || 0} />
        <Stat label="Inserted" value={result.inserted || 0} tone="ok" />
        <Stat label="Skipped" value={result.skipped || 0} tone="warn" />
        <Stat label="Errors" value={(result.errors || []).filter((x) => x.level === "error").length} tone="error" />
      </div>
      {result.inserted_numbers?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>VEHICLE # INSERTED</div>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: C.text, lineHeight: 1.6 }}>{result.inserted_numbers.join(", ")}</div>
        </div>
      )}
      {result.errors?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>NOTES</div>
          <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 4, padding: 8, background: C.steel }}>
            {result.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 11, color: err.level === "error" ? C.red : err.level === "warn" ? C.yellow : C.muted, marginBottom: 4 }}>
                Row {err.row}: {err.message}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Btn onClick={onClose}>CLOSE</Btn>
      </div>
    </ModalWrap>
  );
}

export function GpsSyncResultModal({ result, onClose }) {
  return (
    <ModalWrap title="GPS sync complete" onClose={onClose} width={620}>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
        GPS provider fleet: {result.provider_total} · FTI active fleet: {result.our_total}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
        <Stat label="Linked now" value={result.linked_now || 0} tone="ok" />
        <Stat label="Already linked" value={result.already_linked || 0} />
        <Stat label="No match" value={result.vin_no_match || 0} tone="warn" />
        <Stat label="Errors" value={(result.errors || []).filter((x) => x.level === "error").length} tone="error" />
      </div>
      {(result.no_vin_ours > 0 || result.no_vin_provider > 0 || result.mismatch > 0) && (
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, padding: 10, background: C.steel, borderRadius: 4 }}>
          {result.no_vin_ours > 0 && <div>· {result.no_vin_ours} FTI vehicle(s) have no VIN — cannot match by VIN</div>}
          {result.no_vin_provider > 0 && <div>· {result.no_vin_provider} provider vehicle(s) have no VIN — skipped</div>}
          {result.mismatch > 0 && <div>· {result.mismatch} VIN(s) currently linked to a GPS ID that the provider no longer reports — see notes</div>}
        </div>
      )}
      {result.errors?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginBottom: 6 }}>NOTES</div>
          <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${C.border}`, borderRadius: 4, padding: 8, background: C.steel }}>
            {result.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 11, color: err.level === "error" ? C.red : err.level === "warn" ? C.yellow : C.muted, marginBottom: 4 }}>
                {err.vehicle_number ? `#${err.vehicle_number}` : `Vehicle ${err.vehicle_id}`} (VIN {err.vin}): {err.message}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Btn onClick={onClose}>CLOSE</Btn>
      </div>
    </ModalWrap>
  );
}
