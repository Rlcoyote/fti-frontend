import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, Z_INDEX } from "./SharedUI.jsx";
import { calcLineTotal } from "./utils.js";

// ─── CopyLineItemsModal (v28.11) ───────────────────────────────────────────
// Copy line items from a sibling Rig Up ticket onto the current ticket.
// Mirrors CopyCrewModal (v28.09) and TicketDuplicateModal progressive-
// disclosure pattern: defaults to the newest non-voided Rig Up that has
// items; "(change)" link reveals the source picker only when multiple
// item-bearing Rig Ups exist (avoids adding clicks for the common
// single-RU case).
//
// Props:
//   jobId           — current ticket's job, for sibling-RU lookup
//   excludeTicketId — current ticket's own id (excluded from sources)
//   onClose         — dismiss
//   onCopy(items)   — parent commits the array (each: { qbCode, desc,
//                     rate, qty, um, days })

function CopyLineItemsModal({ jobId, excludeTicketId, onClose, onCopy }) {
  const [rigUps, setRigUps] = useState([]); // eligible sources
  const [sourceId, setSourceId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 1: load eligible Rig Up tickets on this job, newest first.
  // Tickets carry their lineItems on the list response (no second fetch
  // needed). Empty Rig Ups are eligible but dimmed in the picker.
  useEffect(() => {
    if (!jobId) return;
    setLoading(true); setError("");
    fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const eligible = (data || [])
          .filter(tk => tk.type === "Rig Up" && !tk.voided_at)
          .filter(tk => tk.id !== excludeTicketId)
          .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setRigUps(eligible);
        // Default source = newest RU that actually has line items. Falls
        // back to newest overall if every RU is empty (the user will see
        // the empty preview and bail).
        const firstWithItems = eligible.find(tk => (tk.lineItems || tk.line_items || []).length > 0);
        setSourceId((firstWithItems || eligible[0])?.id || null);
      })
      .catch(() => setError("Could not load Rig Up tickets on this job."))
      .finally(() => setLoading(false));
  }, [jobId, excludeTicketId]);

  const source = rigUps.find(t => t.id === sourceId);
  const sourceItems = (source?.lineItems || source?.line_items || []).map(li => ({
    qbCode: li.qb_code || li.qbCode || "",
    desc: li.description || li.desc || "",
    rate: Number(li.rate) || 0,
    qty: Number(li.qty) || 0,
    um: li.unit_measure || li.um || "DAY",
    days: Number(li.days) || 1,
  }));

  const handleSubmit = async () => {
    if (sourceItems.length === 0) { onClose(); return; }
    setSubmitting(true);
    try {
      await onCopy(sourceItems);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "#00000088",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: Z_INDEX.nested,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.cardBg, border: `1px solid ${C.border}`,
          borderTop: `4px solid ${C.blue}`, borderRadius: 8, padding: 28,
          width: 500, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>Copy Line Items from Rig Up</div>

        {loading && (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Loading Rig Up tickets...</div>
        )}

        {!loading && rigUps.length === 0 && (
          <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "10px 12px", background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4 }}>
            No Rig Up tickets exist on this Work Order yet.
          </div>
        )}

        {!loading && rigUps.length > 0 && source && (
          <>
            {/* Source — progressive disclosure (mirrors TicketDuplicateModal +
                CopyCrewModal). */}
            <div style={{ marginBottom: 16, padding: "10px 12px", background: C.steel, borderRadius: 6 }}>
              {!pickerOpen ? (
                <div style={{ fontSize: 12, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, color: C.muted, letterSpacing: "0.08em" }}>COPYING FROM:</span>
                  <span style={{ color: C.text, fontWeight: 600 }}>
                    Rig Up #{source.jobId}{source.ticketNumber ? `-${source.ticketNumber}` : ""}
                  </span>
                  {source.date && <span style={{ color: C.muted }}>· {String(source.date).slice(0, 10)}</span>}
                  {rigUps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      style={{ marginLeft: "auto", background: "transparent", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline" }}
                    >
                      (change)
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>COPYING FROM</div>
                  <select
                    value={sourceId}
                    onChange={e => setSourceId(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}
                  >
                    {rigUps.map(t => {
                      const itemCount = (t.lineItems || t.line_items || []).length;
                      return (
                        <option key={t.id} value={t.id}>
                          Rig Up #{t.jobId}{t.ticketNumber ? `-${t.ticketNumber}` : ""} · {String(t.date || "").slice(0, 10)} · {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    style={{ background: "transparent", border: "none", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "8px 0 0", textDecoration: "underline" }}
                  >
                    done
                  </button>
                </div>
              )}
            </div>

            {/* Source items preview */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.08em", marginBottom: 6 }}>
              ITEMS ON SOURCE TICKET ({sourceItems.length})
            </div>
            {sourceItems.length === 0 && (
              <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "10px 12px", background: C.steel, border: `1px solid ${C.border}`, borderRadius: 4, marginBottom: 16 }}>
                Source Rig Up has no line items. Pick a different source or add items directly.
              </div>
            )}
            {sourceItems.length > 0 && (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
                {sourceItems.map((li, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px",
                      borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                      background: C.cardBg,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                        {li.qbCode || "—"}
                        <span style={{ marginLeft: 8, fontWeight: 400, color: C.muted }}>{li.desc}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                        ${Number(li.rate).toLocaleString()} × {li.qty} {li.um}
                        {li.days > 1 ? ` × ${li.days}d` : ""}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>
                      ${calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Btn
            variant="blue"
            onClick={handleSubmit}
            disabled={submitting || sourceItems.length === 0}
          >
            {submitting ? "COPYING..." : `COPY ${sourceItems.length} ITEM${sourceItems.length !== 1 ? "S" : ""}`}
          </Btn>
          <Btn variant="ghost" onClick={onClose} disabled={submitting}>CANCEL</Btn>
        </div>
      </div>
    </div>
  );
}

export default CopyLineItemsModal;
