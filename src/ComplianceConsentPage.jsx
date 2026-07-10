import { useState, useEffect } from "react";
import { C } from "./config.js";
import { Btn, NoticeModal } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import { getActiveScripts, updateScript } from "./smsConsent.js";

// v28.180 — Compliance & Consent page. Lifted out of the legacy SettingsModal
// (now retired). Currently houses the SMS consent script editor; designed to
// grow with the regulatory surface — A2P resubmission tracking, employee/
// customer consent logs, future SMS-provider configuration, privacy-policy
// references, etc. Each future regulatory concern adds a section here rather
// than being scattered across the gear menu.
//
// Authorization: page is reachable only to owner/admin (we gate via `can`
// in the gear menu render; the page itself rejects view if not admin).

function ComplianceConsentPage() {
  const { can } = useApp();
  const isAdmin = can && can("manage_settings");

  const [scripts, setScripts] = useState({ customer_rep: "", employee: "" });
  const [scriptOriginal, setScriptOriginal] = useState({ customer_rep: "", employee: "" });
  const [scriptSaving, setScriptSaving] = useState({ customer_rep: false, employee: false });
  const [scriptSaved, setScriptSaved] = useState({ customer_rep: false, employee: false });
  const [scriptError, setScriptError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState(null);

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
        setLoadError("Couldn't load SMS consent scripts: " + err.message);
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

  if (!isAdmin) {
    return (
      <div style={{ padding: "24px 28px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Compliance & Consent</h1>
        <div style={{ marginTop: 16, fontSize: 13, color: C.muted }}>You need admin / owner permissions to view this page.</div>
      </div>
    );
  }

  const textareaStyle = {
    width: "100%",
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 4,
    fontSize: 12,
    color: C.text,
    background: C.cardBg,
    minHeight: 130,
    resize: "vertical",
    boxSizing: "border-box",
    fontFamily: "'Arial', sans-serif",
    lineHeight: 1.5,
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Compliance & Consent</h1>
      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
        Regulatory and consent settings — SMS consent scripts now; A2P / provider settings / consent logs to follow.
      </div>

      {loadError && (
        <div style={{ background: C.redB, color: C.red, padding: "10px 14px", borderRadius: 4, fontSize: 12, fontWeight: 600, marginTop: 16 }}>
          ⚠ {loadError}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>SMS Consent Scripts</div>
        <div style={{ fontSize: 11, color: C.muted, marginBottom: 16, lineHeight: 1.5 }}>
          The exact wording shown / spoken when capturing SMS consent. Updates are versioned — prior consents stay tied to the script wording shown at their
          capture moment. New consents reference the latest script.
        </div>

        {scriptError && (
          <div style={{ background: C.redB, color: C.red, padding: "8px 12px", borderRadius: 4, fontSize: 11, fontWeight: 700, marginBottom: 14 }}>
            ⚠ {scriptError}
          </div>
        )}

        {/* Customer rep script */}
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em", marginBottom: 6 }}>CUSTOMER REP SCRIPT (VERBAL)</div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
            Read by sales staff to the customer representative during job setup. Must include sender identity, purpose, frequency, rates, and opt-out language.
          </div>
          <textarea style={textareaStyle} value={scripts.customer_rep} onChange={(e) => setScripts((s) => ({ ...s, customer_rep: e.target.value }))} />
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
        <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.08em", marginBottom: 6 }}>EMPLOYEE SCRIPT (IN-APP CHECKBOX)</div>
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>
            Shown on the PIN setup page next to the SMS consent checkbox. Employees must check the box to complete PIN setup.
          </div>
          <textarea style={textareaStyle} value={scripts.employee} onChange={(e) => setScripts((s) => ({ ...s, employee: e.target.value }))} />
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

      {notice && <NoticeModal title={notice.title} message={notice.message} variant={notice.variant} onClose={() => setNotice(null)} />}
    </div>
  );
}

export default ComplianceConsentPage;
