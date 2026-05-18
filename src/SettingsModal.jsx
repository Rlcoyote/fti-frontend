import { useState, useEffect } from "react";
import { C, API_URL } from "./config.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { parseYards } from "./utils.js";
import { getActiveScripts, updateScript } from "./smsConsent.js";

const MAX_YARDS = 5;
const BLANK_YARD = { name: "", address: "", lat: "", lng: "" };

function SettingsModal({ onClose }) {
  const { currentUser, settings, refreshSettings, can } = useApp();
  const [yards, setYards] = useState(() => parseYards(settings));
  const [geocodingIdx, setGeocodingIdx] = useState(-1);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const isOwner = currentUser?.role === "owner";
  const isAdmin = can("manage_settings");

  // v28.54 — SMS consent script editor state. Two scripts (customer_rep and
  // employee) live in sms_consent_scripts. Editing them creates a new row
  // and deactivates the prior. Visible to owner/admin only.
  const [scripts, setScripts] = useState({ customer_rep: "", employee: "" });
  const [scriptOriginal, setScriptOriginal] = useState({ customer_rep: "", employee: "" });
  const [scriptSaving, setScriptSaving] = useState({ customer_rep: false, employee: false });
  const [scriptSaved, setScriptSaved] = useState({ customer_rep: false, employee: false });
  const [scriptError, setScriptError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const data = await getActiveScripts();
        const next = {
          customer_rep: data.customer_rep?.script_text || "",
          employee: data.employee?.script_text || "",
        };
        setScripts(next);
        setScriptOriginal(next);
      } catch (err) {
        setScriptError("Couldn't load SMS consent scripts: " + err.message);
      }
    })();
  }, [isAdmin]);

  const saveScript = async (type) => {
    setScriptSaving((s) => ({ ...s, [type]: true }));
    setScriptError("");
    try {
      await updateScript(type, scripts[type]);
      setScriptOriginal((s) => ({ ...s, [type]: scripts[type] }));
      setScriptSaved((s) => ({ ...s, [type]: true }));
      setTimeout(() => setScriptSaved((s) => ({ ...s, [type]: false })), 2500);
    } catch (err) {
      setScriptError(`Failed to save ${type} script: ${err.message}`);
    } finally {
      setScriptSaving((s) => ({ ...s, [type]: false }));
    }
  };

  // Re-hydrate local state if Context settings change while modal is open
  // (e.g., someone else refreshes, or the initial Context fetch lands after
  // the modal opened on a cached currentUser).
  useEffect(() => {
    setYards(parseYards(settings));
  }, [settings]);

  const updateYard = (i, field, value) => {
    setYards((prev) => prev.map((y, idx) => (idx === i ? { ...y, [field]: value, ...(field === "address" ? { lat: "", lng: "" } : {}) } : y)));
  };

  const addYard = () => {
    if (yards.length >= MAX_YARDS) return;
    setYards((prev) => [...prev, { ...BLANK_YARD, name: `Yard #${prev.length + 1}` }]);
  };

  const removeYard = (i) => {
    if (i === 0) return;
    setYards((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleGeocode = async (i) => {
    const y = yards[i];
    if (!y.address.trim()) return;
    setGeocodingIdx(i);
    setError("");
    try {
      const isUrl = y.address.trim().startsWith("http");
      const endpoint = isUrl ? "resolve-map-pin" : "geocode-address";
      const body = isUrl ? { url: y.address.trim() } : { address: y.address.trim() };
      const r = await fetch(`${API_URL}/jobs/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        setError(`Could not resolve yard ${i + 1}.`);
        setGeocodingIdx(-1);
        return;
      }
      const { lat, lng } = await r.json();
      setYards((prev) => prev.map((yy, idx) => (idx === i ? { ...yy, lat, lng } : yy)));
    } catch {
      setError("Network error. Try again.");
    }
    setGeocodingIdx(-1);
  };

  const handleSave = async () => {
    try {
      const payload = {
        yards: JSON.stringify(yards),
        yard_address: yards[0]?.address || "",
        yard_lat: yards[0]?.lat || "",
        yard_lng: yards[0]?.lng || "",
      };
      await fetch(`${API_URL}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await refreshSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save settings.");
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.cardBg,
          border: `1px solid ${C.border}`,
          borderTop: `4px solid ${C.red}`,
          borderRadius: 8,
          padding: 28,
          width: 560,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>YARD LOCATIONS</div>

        <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
          Yard locations are used to calculate drive distance and time. Yard #1 is the default for new tickets. Owner-only.
        </div>

        {yards.map((y, i) => (
          <div key={i} style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em" }}>
                YARD LOCATION #{i + 1}
                {i === 0 ? " (DEFAULT)" : ""}
              </div>
              {isOwner && i > 0 && (
                <button
                  type="button"
                  onClick={() => removeYard(i)}
                  style={{
                    background: "transparent",
                    color: C.red,
                    border: `1px solid ${C.red}`,
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  REMOVE
                </button>
              )}
            </div>

            <label style={labelStyle}>NAME</label>
            <input
              style={{ ...inputStyle, marginBottom: 8 }}
              value={y.name}
              onChange={(e) => updateYard(i, "name", e.target.value)}
              placeholder="Wickett Yard"
              readOnly={!isOwner}
            />

            <label style={labelStyle}>ADDRESS OR GOOGLE MAPS LINK</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={y.address}
                onChange={(e) => updateYard(i, "address", e.target.value)}
                placeholder="123 Main St, Odessa, TX  or  https://maps.app.goo.gl/..."
                readOnly={!isOwner}
              />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleGeocode(i)}
                  disabled={!y.address.trim() || geocodingIdx === i}
                  style={{
                    background: C.blue,
                    color: C.white,
                    border: "none",
                    borderRadius: 4,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {geocodingIdx === i ? "..." : "GEOCODE"}
                </button>
              )}
            </div>
            {y.lat && y.lng && (
              <div style={{ fontSize: 11, color: C.green, fontFamily: "monospace" }}>
                ✓ {parseFloat(y.lat).toFixed(6)}, {parseFloat(y.lng).toFixed(6)}
              </div>
            )}
          </div>
        ))}

        {error && <div style={{ fontSize: 11, color: C.red, marginBottom: 10 }}>⚠ {error}</div>}

        {isOwner && yards.length < MAX_YARDS && (
          <button
            type="button"
            onClick={addYard}
            style={{
              background: "transparent",
              color: C.blue,
              border: `1px dashed ${C.blue}`,
              borderRadius: 4,
              padding: "8px 14px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              marginBottom: 16,
            }}
          >
            + ADD YARD LOCATION
          </button>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {isOwner && <Btn onClick={handleSave}>{saved ? "SAVED ✓" : "SAVE"}</Btn>}
          <Btn onClick={onClose} variant="ghost">
            CLOSE
          </Btn>
        </div>

        {/* v28.54 — SMS CONSENT SCRIPTS (owner/admin only). Edits create
            a new versioned row server-side. Historical phone_consents
            stay tied to whichever script_id was active at their capture
            moment, so updating these doesn't rewrite anyone's prior
            consent — only changes what NEW captures will reference. */}
        {isAdmin && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>SMS CONSENT SCRIPTS</div>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
              The exact wording shown / spoken when capturing SMS consent. Updates are versioned — prior consents stay tied to the script wording shown at their
              capture moment. Owner/admin only.
            </div>

            {scriptError && (
              <div style={{ background: "#fdecea", color: C.red, padding: "8px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 14 }}>
                ⚠ {scriptError}
              </div>
            )}

            {/* Customer rep script */}
            <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em", marginBottom: 6 }}>CUSTOMER REP SCRIPT (VERBAL)</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
                Read by sales staff to the customer representative during job setup. Must include sender identity, purpose, frequency, rates, and opt-out
                language.
              </div>
              <textarea
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 12,
                  color: C.text,
                  background: C.cardBg,
                  minHeight: 110,
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "'Arial', sans-serif",
                  lineHeight: 1.5,
                }}
                value={scripts.customer_rep}
                onChange={(e) => setScripts((s) => ({ ...s, customer_rep: e.target.value }))}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn onClick={() => saveScript("customer_rep")} disabled={scriptSaving.customer_rep || scripts.customer_rep === scriptOriginal.customer_rep}>
                  {scriptSaving.customer_rep ? "SAVING…" : scriptSaved.customer_rep ? "SAVED ✓" : "SAVE"}
                </Btn>
                {scripts.customer_rep !== scriptOriginal.customer_rep && (
                  <Btn onClick={() => setScripts((s) => ({ ...s, customer_rep: scriptOriginal.customer_rep }))} variant="ghost">
                    REVERT
                  </Btn>
                )}
              </div>
            </div>

            {/* Employee script */}
            <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em", marginBottom: 6 }}>EMPLOYEE SCRIPT (IN-APP CHECKBOX)</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
                Shown on the PIN setup page next to the SMS consent checkbox. Employees must check the box to complete PIN setup.
              </div>
              <textarea
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 4,
                  fontSize: 12,
                  color: C.text,
                  background: C.cardBg,
                  minHeight: 110,
                  resize: "vertical",
                  boxSizing: "border-box",
                  fontFamily: "'Arial', sans-serif",
                  lineHeight: 1.5,
                }}
                value={scripts.employee}
                onChange={(e) => setScripts((s) => ({ ...s, employee: e.target.value }))}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn onClick={() => saveScript("employee")} disabled={scriptSaving.employee || scripts.employee === scriptOriginal.employee}>
                  {scriptSaving.employee ? "SAVING…" : scriptSaved.employee ? "SAVED ✓" : "SAVE"}
                </Btn>
                {scripts.employee !== scriptOriginal.employee && (
                  <Btn onClick={() => setScripts((s) => ({ ...s, employee: scriptOriginal.employee }))} variant="ghost">
                    REVERT
                  </Btn>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsModal;
