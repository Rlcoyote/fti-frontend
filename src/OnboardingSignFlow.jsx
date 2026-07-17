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
  const [linked, setLinked] = useState({}); // sameAs/N-A per field key: 'same' | 'na' | undefined
  const [error, setError] = useState("");

  // v28.343 — FORCED formats, mirrored server-side: phones format themselves
  // as (XXX) XXX-XXXX while typing; money normalizes to $0.00 on blur.
  const formatTel = (v) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };
  const telOk = (v) => v.replace(/\D/g, "").length === 10;
  const moneyOk = (v, f) => {
    const n = Number(String(v).replace(/[$,\s]/g, ""));
    if (!Number.isFinite(n) || n <= 0) return false;
    if (f?.min != null && n < f.min) return false;
    if (f?.max != null && n > f.max) return false;
    return true;
  };
  const dateBounds = (f) => ({
    min: f.minDate || undefined,
    max: f.maxFutureDays != null ? new Date(Date.now() + f.maxFutureDays * 86400000).toISOString().slice(0, 10) : undefined,
  });
  const dateOk = (v, f) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const b = dateBounds(f);
    if (b.min && v < b.min) return false;
    if (b.max && v > b.max) return false;
    return true;
  };
  const [busy, setBusy] = useState(false);

  const allInitialed = initials.every((_, i) => checked[i]);
  const fieldOk = (f) => {
    if (f.sameAs && linked[f.key]) return linked[f.key] === "na" || String(form[f.sameAs] || "").trim();
    const v = String(form[f.key] || "").trim();
    if (!v) return !f.required;
    if (f.type === "tel") return telOk(v);
    if (f.type === "money") return moneyOk(v, f);
    if (f.type === "date") return dateOk(v, f);
    return true;
  };
  const allRequired = inputs.every(fieldOk);
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
        const resolvedForm = { ...form };
        for (const f of inputs) {
          if (f.sameAs && linked[f.key] === "same") resolvedForm[f.key] = form[f.sameAs] || "";
          if (f.allowNA && linked[f.key] === "na") resolvedForm[f.key] = "N/A";
        }
        const checklistData = checklist.length
          ? Object.fromEntries(checklist.map((it) => [it.key, { received: !!items[it.key]?.received, detail: items[it.key]?.detail || "" }]))
          : null;
        await api.post(`/onboarding/my/${doc.id}/sign`, {
          webauthn_response: assertion,
          form_data: inputs.length || checklistData ? { ...resolvedForm, ...(checklistData ? { items: checklistData } : {}) } : undefined,
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
              {f.sameAs && (
                <div style={{ display: "flex", gap: SP.xxl, marginBottom: SP.sm }}>
                  <label style={{ display: "flex", gap: SP.sm, alignItems: "center", fontSize: F.meta, color: C.text, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={linked[f.key] === "same"}
                      onChange={(e) => setLinked((s2) => ({ ...s2, [f.key]: e.target.checked ? "same" : undefined }))}
                    />
                    Same as mailing address
                  </label>
                  {f.allowNA && (
                    <label style={{ display: "flex", gap: SP.sm, alignItems: "center", fontSize: F.meta, color: C.text, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={linked[f.key] === "na"}
                        onChange={(e) => setLinked((s2) => ({ ...s2, [f.key]: e.target.checked ? "na" : undefined }))}
                      />
                      N/A
                    </label>
                  )}
                </div>
              )}
              {!(f.sameAs && linked[f.key]) && (
                <input
                  type={f.type === "date" ? "date" : "text"}
                  min={f.type === "date" ? dateBounds(f).min : undefined}
                  max={f.type === "date" ? dateBounds(f).max : undefined}
                  inputMode={f.type === "tel" ? "numeric" : f.type === "money" ? "decimal" : undefined}
                  placeholder={f.type === "tel" ? "(432) 555-0100" : f.type === "money" ? "25.50" : undefined}
                  value={form[f.key] || ""}
                  onChange={(e) => {
                    const v = f.type === "tel" ? formatTel(e.target.value) : e.target.value;
                    setForm((s2) => ({ ...s2, [f.key]: v }));
                  }}
                  onBlur={(e) => {
                    if (f.type === "money" && moneyOk(e.target.value, f)) {
                      const n = Number(String(e.target.value).replace(/[$,\s]/g, ""));
                      setForm((s2) => ({ ...s2, [f.key]: `$${n.toFixed(2)}` }));
                    }
                  }}
                  style={{
                    ...inputStyle,
                    marginBottom: 0,
                    borderColor: String(form[f.key] || "").trim() && !fieldOk(f) ? C.red : undefined,
                  }}
                />
              )}
              {f.hint && <div style={{ fontSize: F.label, color: C.muted, marginTop: 2 }}>{f.hint}</div>}
              {String(form[f.key] || "").trim() && !fieldOk(f) && (
                <div style={{ fontSize: F.label, color: C.red, fontWeight: 700, marginTop: 2 }}>
                  {f.type === "money"
                    ? "Enter dollars AND cents, e.g. 25.50" + (f.min != null ? " (at least $" + Number(f.min).toFixed(2) + ")" : "")
                    : f.type === "date"
                      ? "Enter a real date in the allowed range"
                      : f.type === "tel"
                        ? "Enter a 10-digit phone number"
                        : "Check this entry"}
                </div>
              )}
              {f.sameAs && linked[f.key] === "same" && (
                <div style={{ fontSize: F.meta, color: C.muted, fontStyle: "italic" }}>Will use your mailing address.</div>
              )}
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
