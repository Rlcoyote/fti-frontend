import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { Btn, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── OnboardingSignFlow (v28.340) ────────────────────────────────────────────
// One packet document: read the body, complete required inputs, initial every
// statement, CONFIRM WITH BIOMETRIC — the JSA/safety-meeting WebAuthn ceremony
// (two-step iOS activation rule: startAuthentication fires inside the tap).
// Employee self-serve only; the server enforces everything again.

function OnboardingSignFlow({ doc, onSigned, onBack }) {
  const inputs = doc.fields?.inputs || [];
  const initials = doc.fields?.initials || [];
  const checklist = doc.fields?.checklist || []; // v28.342 — received-items: each optional, employee attests what they got
  const [form, setForm] = useState({});
  const [checked, setChecked] = useState({});
  const [items, setItems] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const allInitialed = initials.every((_, i) => checked[i]);
  const allRequired = inputs.every((f) => !f.required || String(form[f.key] || "").trim());
  const ready = allInitialed && allRequired;

  const fireSign = async () => {
    setBusy(true);
    setError("");
    try {
      let opts;
      try {
        opts = await api.post(`/onboarding/my/${doc.id}/sign-options`, {});
      } catch (e) {
        setError(e.message);
        return;
      }
      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: opts.authentication_options });
      } catch (browserErr) {
        setError(browserErr?.name === "NotAllowedError" ? "Biometric did not complete. Try again." : browserErr?.message || "Biometric cancelled");
        return;
      }
      try {
        const checklistData = checklist.length
          ? Object.fromEntries(checklist.map((it) => [it.key, { received: !!items[it.key]?.received, detail: items[it.key]?.detail || "" }]))
          : null;
        await api.post(`/onboarding/my/${doc.id}/sign`, {
          webauthn_response: assertion,
          form_data: inputs.length || checklistData ? { ...form, ...(checklistData ? { items: checklistData } : {}) } : undefined,
          initials: initials.length ? initials : undefined,
        });
      } catch (e) {
        setError(e.message);
        return;
      }
      onSigned();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: SP.lg, flexWrap: "wrap", marginBottom: SP.md }}>
        <Btn variant="ghost" small onClick={onBack}>
          ← MY DOCUMENTS
        </Btn>
        <h2 style={{ margin: 0, fontSize: F.h3, color: C.text }}>
          {doc.title}
          <span style={{ fontSize: F.meta, color: C.muted, fontWeight: 400 }}> — Checklist Item {doc.item_no}</span>
        </h2>
      </div>

      {doc.body && (
        <div
          style={{
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: R.card,
            padding: SP.xxl,
            marginBottom: SP.xl,
            fontSize: F.body,
            color: C.text,
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {doc.body}
        </div>
      )}

      {inputs.length > 0 && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xxl, marginBottom: SP.xl }}>
          {inputs.map((f) => (
            <div key={f.key} style={{ marginBottom: SP.lg }}>
              <label style={labelStyle}>
                {f.label.toUpperCase()}
                {f.required ? " *" : ""}
              </label>
              <input
                type={f.type === "date" ? "date" : "text"}
                value={form[f.key] || ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                style={{ ...inputStyle, marginBottom: 0 }}
              />
            </div>
          ))}
        </div>
      )}

      {checklist.length > 0 && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xxl, marginBottom: SP.xl }}>
          <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: SP.lg }}>
            CHECK EACH ITEM YOU RECEIVED — LEAVE UNCHECKED WHAT WAS NOT ISSUED
          </div>
          {checklist.map((it) => (
            <div key={it.key} style={{ display: "flex", gap: SP.lg, alignItems: "center", marginBottom: SP.lg, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: SP.md, alignItems: "center", cursor: "pointer", flex: "1 1 180px" }}>
                <input
                  type="checkbox"
                  checked={!!items[it.key]?.received}
                  onChange={(e) => setItems((s2) => ({ ...s2, [it.key]: { ...s2[it.key], received: e.target.checked } }))}
                  style={{ width: 18, height: 18, flexShrink: 0 }}
                />
                <span style={{ fontSize: F.body, color: C.text, fontWeight: 700 }}>{it.label}</span>
              </label>
              {it.detail && items[it.key]?.received && (
                <input
                  placeholder={it.detail}
                  value={items[it.key]?.detail || ""}
                  onChange={(e) => setItems((s2) => ({ ...s2, [it.key]: { ...s2[it.key], detail: e.target.value } }))}
                  style={{ ...inputStyle, width: "auto", flex: "1 1 140px", marginBottom: 0 }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {initials.length > 0 && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xxl, marginBottom: SP.xl }}>
          <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: SP.lg }}>
            INITIAL EACH STATEMENT — TAP TO ACKNOWLEDGE ({Object.values(checked).filter(Boolean).length} OF {initials.length})
          </div>
          {initials.map((text, i) => (
            <label key={i} style={{ display: "flex", gap: SP.lg, alignItems: "flex-start", marginBottom: SP.lg, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!checked[i]}
                onChange={(e) => setChecked((s) => ({ ...s, [i]: e.target.checked }))}
                style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
              />
              <span style={{ fontSize: F.body, color: C.text, lineHeight: 1.5 }}>{text}</span>
            </label>
          ))}
        </div>
      )}

      {error && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.xl }}>{error}</div>}
      <div style={{ display: "flex", gap: SP.md, marginBottom: 40 }}>
        <Btn onClick={fireSign} disabled={!ready || busy}>
          {busy ? "WAITING FOR BIOMETRIC..." : ready ? "CONFIRM WITH BIOMETRIC" : "COMPLETE ALL ITEMS ABOVE FIRST"}
        </Btn>
        <Btn variant="ghost" onClick={onBack}>
          CANCEL
        </Btn>
      </div>
    </div>
  );
}

export default OnboardingSignFlow;
