import { useState } from "react";
import { useSiblingRigUps } from "./useSiblingRigUps.js";
import useBodyScrollLock from "./useBodyScrollLock.js";
import { C, API_URL } from "./config.js";
import { Btn, Z_INDEX, ModalWrap } from "./SharedUI.jsx";
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
//   workOrderId           — current ticket's job, for sibling-RU lookup
//   excludeTicketId — current ticket's own id (excluded from sources)
//   onClose         — dismiss
//   onCopy(items)   — parent commits the array (each: { qbCode, desc,
//                     rate, qty, um, days })

function CopyLineItemsModal({ workOrderId, excludeTicketId, onClose, onCopy }) {
  useBodyScrollLock(true); // v28.274 sweep — modal locks the page behind it
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Step 1 (one home — useSiblingRigUps, audit 260721 C3): eligible Rig Ups,
  // newest first; default source = newest RU that actually has line items
  // (falls back to newest overall — the user sees the empty preview and bails).
  const { rigUps, sourceId, setSourceId, loading, error } = useSiblingRigUps(workOrderId, excludeTicketId, { preferWithItems: true });

  const source = rigUps.find((t) => t.id === sourceId);
  const sourceItems = (source?.lineItems || source?.line_items || []).map((li) => ({
    qbCode: li.qb_code || li.qbCode || "",
    desc: li.description || li.desc || "",
    rate: Number(li.rate) || 0,
    qty: Number(li.qty) || 0,
    um: li.unit_measure || li.um || "DAY",
    days: Number(li.days) || 1,
  }));

  const handleSubmit = async () => {
    if (sourceItems.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onCopy(sourceItems);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrap variant="dialog" z={Z_INDEX.nested} width={500} accent={C.blue} onClose={onClose}>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 14 }}>Copy Line Items from Rig Up</div>

      {loading && <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Loading Rig Up tickets...</div>}

      {!loading && rigUps.length === 0 && (
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            fontStyle: "italic",
            padding: "10px 12px",
            background: C.steel,
            border: `1px solid ${C.border}`,
            borderRadius: 4,
          }}
        >
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
                  Rig Up #{source.workOrderId}
                  {source.ticketNumber ? `-${source.ticketNumber}` : ""}
                </span>
                {source.date && <span style={{ color: C.muted }}>· {String(source.date).slice(0, 10)}</span>}
                {rigUps.length > 1 && (
                  <button
                    className="fti-btn"
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    style={{
                      marginLeft: "auto",
                      background: "transparent",
                      border: "none",
                      color: C.blue,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                    }}
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
                  onChange={(e) => setSourceId(Number(e.target.value))}
                  style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13 }}
                >
                  {rigUps.map((t) => {
                    const itemCount = (t.lineItems || t.line_items || []).length;
                    return (
                      <option key={t.id} value={t.id}>
                        Rig Up #{t.workOrderId}
                        {t.ticketNumber ? `-${t.ticketNumber}` : ""} · {String(t.date || "").slice(0, 10)} · {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </option>
                    );
                  })}
                </select>
                <button
                  className="fti-btn"
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: C.blue,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "8px 0 0",
                    textDecoration: "underline",
                  }}
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
            <div
              style={{
                fontSize: 12,
                color: C.muted,
                fontStyle: "italic",
                padding: "10px 12px",
                background: C.steel,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                marginBottom: 16,
              }}
            >
              Source Rig Up has no line items. Pick a different source or add items directly.
            </div>
          )}
          {sourceItems.length > 0 && (
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
              {sourceItems.map((li, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
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

      {error && <div style={{ color: C.red, fontSize: 12, fontWeight: 700, marginBottom: 14 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <Btn variant="blue" onClick={handleSubmit} disabled={submitting || sourceItems.length === 0}>
          {submitting ? "COPYING..." : `COPY ${sourceItems.length} ITEM${sourceItems.length !== 1 ? "S" : ""}`}
        </Btn>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

export default CopyLineItemsModal;
