import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { calcLineTotal } from "./utils.js";
import { Btn, inputStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import CopyLineItemsModal from "./CopyLineItemsModal.jsx";

function LineItemEditor({ lineItems, setLineItems, ticketType, onSigWipe, jobId }) {
  const { qbItems } = useApp();
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [hasRigUp, setHasRigUp] = useState(false);
  const [copyMsg, setCopyMsg] = useState(""); // transient post-copy feedback
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [warnItem, setWarnItem] = useState(null);
  const [allowedCodes, setAllowedCodes] = useState(null);
  const [editingIdx, setEditingIdx] = useState(null); // Mobile: which card is expanded for editing
  const [isMob] = useState(() => window.innerWidth <= 900);
  const isRental = ticketType === "Rental";
  const isRigDown = ticketType === "Rig Down";

  // Check if a non-voided Rig Up exists on this job AND (for Rig Down) collect allowed QB codes.
  // v27.47: the visibility gate here was previously requiring the latest Rig Up to have line items,
  // which made the button vanish silently whenever the newest Rig Up happened to be empty. Now we
  // show the button whenever ANY non-voided Rig Up exists and let the copy action walk the list
  // (newest first) to find one with items, or surface a visible message when none do.
  useEffect(() => {
    if (!jobId || ticketType === "Rig Up") { setHasRigUp(false); setAllowedCodes(null); return; }
    fetch(`${API_URL}/tickets?job_id=${jobId}&include_voided=true`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const rigUps = data.filter(tk => tk.type === "Rig Up" && !tk.voided_at);
        setHasRigUp(rigUps.length > 0);
        // For Rig Down tickets: collect QB codes from all Rig Up + Rental tickets
        if (isRigDown) {
          const codes = new Set();
          data.filter(tk => (tk.type === "Rig Up" || tk.type === "Rental") && !tk.voided_at)
            .forEach(tk => {
              (tk.lineItems || tk.line_items || []).forEach(li => {
                const code = (li.qb_code || li.qbCode || "").trim();
                if (code) codes.add(code);
              });
            });
          setAllowedCodes(codes);
        }
      })
      .catch(() => { setHasRigUp(false); if (isRigDown) setAllowedCodes(new Set()); });
  }, [jobId, ticketType, isRigDown]);

  // v28.11 — copy-from-Rig-Up flow handed to CopyLineItemsModal so it
  // matches the source-picker pattern from CopyCrewModal +
  // TicketDuplicateModal. The modal handles the eligible-source fetch,
  // progressive-disclosure picker, and items preview. This handler just
  // commits whatever the modal returns.
  const handleCopyItems = (items) => {
    if (!items?.length) { setShowCopyModal(false); return; }
    setLineItems([...items]);
    onSigWipe?.();
    setCopyMsg(`Copied ${items.length} item${items.length !== 1 ? "s" : ""} from Rig Up.`);
    setTimeout(() => setCopyMsg(""), 4000);
    setShowCopyModal(false);
  };

  const filteredQB = searchTerm.length > 0 ? qbItems.filter(q =>
    q.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.desc.toLowerCase().includes(searchTerm.toLowerCase())
  ) : qbItems;

  const addItem = (qb) => {
    const item = { qbCode: qb.code, desc: qb.desc, rate: qb.price, qty: 1, um: qb.um, ...(isRental ? { days: 1 } : {}) };
    // Rig Down validation: warn if item is not on any Rig Up or Rental ticket
    if (isRigDown && allowedCodes && allowedCodes.size > 0 && !allowedCodes.has(qb.code)) {
      setWarnItem(item);
      setShowSearch(false);
      setSearchTerm("");
      return;
    }
    setLineItems(prev => [...prev, item]);
    setSearchTerm("");
    setShowSearch(false);
    onSigWipe?.();
  };

  const addBlank = () => {
    setLineItems(prev => [...prev, { qbCode: "", desc: "", rate: 0, qty: 1, um: "DAY", ...(isRental ? { days: 1 } : {}) }]);
    onSigWipe?.();
  };

  const updateItem = (idx, field, value) => {
    setLineItems(prev => prev.map((li, i) => i === idx ? { ...li, [field]: value } : li));
    if (["qbCode", "desc", "rate", "qty", "days", "um"].includes(field)) onSigWipe?.();
  };

  const removeItem = (idx) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx));
    onSigWipe?.();
  };

  const total = lineItems.reduce((s, li) => s + calcLineTotal(li), 0);

  const cols = isRental
    ? "40px 90px 1fr 65px 55px 60px 55px 85px 36px"
    : "40px 100px 1fr 70px 70px 70px 90px 36px";
  const headers = isRental
    ? ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "DAYS", "TOTAL", ""]
    : ["#", "CODE", "DESCRIPTION", "RATE", "QTY", "U/M", "TOTAL", ""];

  return (
    <div>
      {/* ── MOBILE: card layout — tap to edit ── */}
      {isMob ? (
        <div>
          {lineItems.map((li, idx) => {
            const liTotal = calcLineTotal(li);
            const isEditing = editingIdx === idx;
            const hasWarning = isRigDown && allowedCodes && allowedCodes.size > 0 && li.qbCode && !allowedCodes.has(li.qbCode);
            return (
              <div key={idx} style={{
                background: C.cardBg, border: `1px solid ${isEditing ? C.blue : C.border}`,
                borderRadius: 6, padding: "10px 12px", marginBottom: 6,
                boxShadow: isEditing ? `0 2px 8px ${C.blue}22` : "none",
              }}>
                {/* Read row — always visible */}
                <div onClick={() => setEditingIdx(isEditing ? null : idx)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 10, color: C.muted, fontWeight: 700 }}>{idx + 1}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.blue }}>{li.qbCode || "—"}</span>
                      <span style={{ fontSize: 12, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{li.desc || ""}</span>
                      {hasWarning && <span style={{ color: "#8a6500", fontSize: 10 }}>⚠</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      ${Number(li.rate || 0).toLocaleString()} × {li.qty || 0} {li.um || ""}{isRental && li.days > 1 ? ` × ${li.days}d` : ""} = <strong style={{ color: C.text }}>${liTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }} style={{
                    background: "transparent", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, padding: "0 4px",
                  }} onTouchStart={e => { e.currentTarget.style.color = C.red; }} onTouchEnd={e => { e.currentTarget.style.color = "#ccc"; }}>×</button>
                </div>
                {/* Edit fields — visible when tapped */}
                {isEditing && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>CODE</label>
                        <input style={{ ...inputStyle, fontSize: 12 }} value={li.qbCode} onChange={e => updateItem(idx, "qbCode", e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>U/M</label>
                        <select style={{ ...inputStyle, fontSize: 12 }} value={li.um} onChange={e => updateItem(idx, "um", e.target.value)}>
                          {["HR", "DAY", "EA", "GAL", "MILE"].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: 6 }}>
                      <label style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>DESCRIPTION</label>
                      <input style={{ ...inputStyle, fontSize: 12 }} value={li.desc} onChange={e => updateItem(idx, "desc", e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: isRental ? "1fr 1fr 1fr" : "1fr 1fr", gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>RATE</label>
                        <input inputMode="decimal" style={{ ...inputStyle, fontSize: 12, textAlign: "right" }}
                          value={li.rate} onChange={e => updateItem(idx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
                          onBlur={e => { if (e.target.value === "") updateItem(idx, "rate", 0); }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>QTY</label>
                        <input inputMode="numeric" style={{ ...inputStyle, fontSize: 12, textAlign: "right" }}
                          value={li.qty} onChange={e => updateItem(idx, "qty", e.target.value === "" ? "" : Math.max(1, Number(e.target.value) || 1))}
                          onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) updateItem(idx, "qty", 1); }} />
                      </div>
                      {isRental && (
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, color: C.muted }}>DAYS</label>
                          <input inputMode="numeric" style={{ ...inputStyle, fontSize: 12, textAlign: "right" }}
                            value={li.days || 1} onChange={e => updateItem(idx, "days", e.target.value === "" ? "" : Number(e.target.value))}
                            onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) updateItem(idx, "days", 1); }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {/* Total */}
          <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em", marginRight: 8 }}>TOTAL</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      ) : (
        /* ── DESKTOP: grid layout (unchanged) ── */
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: 520 }}>
        <div style={{
          display: "grid", gridTemplateColumns: cols,
          gap: 4, padding: "6px 0", borderBottom: `1px solid ${C.border}`, marginBottom: 4,
        }}>
          {headers.map(h => (
            <div key={h} style={{ fontSize: 9, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>{h}</div>
          ))}
        </div>
        {lineItems.map((li, idx) => (
          <div key={idx} style={{
            display: "grid", gridTemplateColumns: cols,
            gap: 4, padding: "4px 0", borderBottom: `1px solid ${C.border}22`, alignItems: "center",
          }}>
            <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
              {idx + 1}
              {isRigDown && allowedCodes && allowedCodes.size > 0 && li.qbCode && !allowedCodes.has(li.qbCode) && (
                // v27.69: inline warning text instead of title= tooltip (which
                // has ~1.5s browser delay and is invisible on mobile).
                <span style={{ color: "#8a6500", fontSize: 9, display: "block", lineHeight: 1.2, fontWeight: 700 }} aria-label="Not on Rig Up or Rental ticket">⚠ Not on RU/RNT</span>
              )}
            </div>
            <input style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} value={li.qbCode}
              onChange={e => updateItem(idx, "qbCode", e.target.value)} />
            <input style={{ ...inputStyle, padding: "4px 6px", fontSize: 11 }} value={li.desc}
              onChange={e => updateItem(idx, "desc", e.target.value)} />
            <input inputMode="decimal" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
              value={li.rate} onChange={e => updateItem(idx, "rate", e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={e => { if (e.target.value === "") updateItem(idx, "rate", 0); }} />
            <input inputMode="numeric" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
              value={li.qty} onChange={e => updateItem(idx, "qty", e.target.value === "" ? "" : Math.max(1, Number(e.target.value) || 1))}
              onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) updateItem(idx, "qty", 1); }} />
            <select style={{ ...inputStyle, padding: "4px 4px", fontSize: 10 }} value={li.um}
              onChange={e => updateItem(idx, "um", e.target.value)}>
              {["HR", "DAY", "EA", "GAL", "MILE"].map(u => <option key={u}>{u}</option>)}
            </select>
            {isRental && (
              <input inputMode="numeric" style={{ ...inputStyle, padding: "4px 6px", fontSize: 11, textAlign: "right" }}
                value={li.days || 1} onChange={e => updateItem(idx, "days", e.target.value === "" ? "" : Number(e.target.value))}
                onBlur={e => { if (e.target.value === "" || Number(e.target.value) < 1) updateItem(idx, "days", 1); }} />
            )}
            <div style={{ fontSize: 12, fontWeight: 700, textAlign: "right", color: C.text }}>
              {'$'}{calcLineTotal(li).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <button onClick={() => removeItem(idx)} style={{
              background: "transparent", border: "none", color: C.red, cursor: "pointer",
              fontSize: 14, fontWeight: 700, padding: 0,
            }}>×</button>
          </div>
        ))}
        {/* v28.09 — TOTAL pinned LEFT instead of trailing the grid. The grid
            layout above can overflow on narrow desktops (its minWidth is 520),
            and pinning the total to the right meant users had to horizontally
            scroll to see the number that summarizes everything. The summary
            row has nothing else on it — flex-start is the right home. */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 0", borderTop: `2px solid ${C.border}`, marginTop: 4,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: "0.1em" }}>TOTAL</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>
            {'$'}{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        </div>
        </div>
      )}
      {/* Add buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", position: "relative", flexWrap: "wrap" }}>
        <Btn small onClick={() => setShowSearch(s => !s)}>+ FROM RATE SHEET</Btn>
        <Btn small variant="ghost" onClick={addBlank}>+ BLANK LINE</Btn>
        {hasRigUp && (
          <Btn small variant="ghost" onClick={() => setShowCopyModal(true)}>📋 COPY ITEMS FROM RIG UP</Btn>
        )}
        {copyMsg && (
          <span style={{ fontSize: 11, fontWeight: 600, color: copyMsg.startsWith("Copied") ? C.green : C.red }}>{copyMsg}</span>
        )}
        {showCopyModal && (
          <CopyLineItemsModal
            jobId={jobId}
            excludeTicketId={null}
            onClose={() => setShowCopyModal(false)}
            onCopy={handleCopyItems}
          />
        )}
        {showSearch && (
          <div style={{
            position: "fixed", inset: 0, background: "#00000066", zIndex: 200,
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={() => { setShowSearch(false); setSearchTerm(""); }}>
            <div style={{
              background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.blue}`,
              borderRadius: 8, width: 520, maxWidth: "95vw", maxHeight: "80vh",
              display: "flex", flexDirection: "column", boxShadow: "0 12px 48px #00000033",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ padding: "16px 16px 0 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: "0.06em" }}>RATE SHEET</div>
                  <button onClick={() => { setShowSearch(false); setSearchTerm(""); }}
                    style={{ background: "transparent", border: "none", fontSize: 20, color: C.muted, cursor: "pointer", fontWeight: 700, padding: "0 4px" }}>×</button>
                </div>
                <input autoFocus style={{ ...inputStyle, marginBottom: 8, fontSize: 13, padding: "10px 12px" }}
                  placeholder="Type to filter or scroll to browse..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 600 }}>{filteredQB.length} item{filteredQB.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 16px 16px" }}>
                {filteredQB.map(q => (
                  <div key={q.code} onClick={() => addItem(q)} style={{
                    padding: "10px 10px", cursor: "pointer", borderRadius: 4,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    fontSize: 13, borderBottom: `1px solid ${C.border}22`,
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = C.steel}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: C.blue, marginRight: 10 }}>{q.code}</span>
                      <span style={{ color: C.text }}>{q.desc}</span>
                    </div>
                    <span style={{ color: C.muted, fontSize: 12, whiteSpace: "nowrap", marginLeft: 12 }}>{'$'}{q.price}/{q.um}</span>
                  </div>
                ))}
                {searchTerm && filteredQB.length === 0 && (
                  <div style={{ padding: "20px", color: C.muted, fontSize: 13, textAlign: "center" }}>No matches</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rig Down validation warning — item not on Rig Up or Rental */}
      {warnItem && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }} onClick={() => setWarnItem(null)}>
          <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderTop: `4px solid #8a6500`, borderRadius: 8, padding: 24, width: 440, maxWidth: "90vw" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#8a6500", marginBottom: 10 }}>Item Not on Rig Up or Rental</div>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 8, lineHeight: 1.6 }}>
              <strong>{warnItem.qbCode}</strong> — {warnItem.desc}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
              This item does not appear on any Rig Up or Rental ticket for this work order. Adding it may indicate an error. Do you want to add it anyway?
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={() => { setLineItems(prev => [...prev, warnItem]); onSigWipe?.(); setWarnItem(null); }}>YES, ADD ITEM</Btn>
              <Btn variant="ghost" onClick={() => setWarnItem(null)}>CANCEL</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SIGNATURE PAD ────────────────────────────────────────────────────────────

export default LineItemEditor;
