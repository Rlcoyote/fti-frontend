import { useState, useEffect, useCallback } from "react";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { Btn, ConfirmModal, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── OnboardingEditor (v28.347) — DOCUMENT EDITOR, phase one ────────────────
// OWNER ONLY (tighter than visibility — this rewrites what every employee
// signs; the backend enforces requireRole(['owner'])). Edit a document's
// title, body, and initial-statements; saving creates version n+1 and asks
// THE question: material change (biometric re-sign) or notice (one-click
// receipt with a required synopsis). First edit makes the document
// customer-owned — the app's built-in starter version stops updating it.
// Field/checklist editing is phase two by design.

function EditDoc({ doc, onSaved, onBack }) {
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body || "");
  const [initials, setInitials] = useState(doc.fields?.initials || []);
  // v28.349 — phase two: form fields + checklist items are editable.
  const [inputs, setInputs] = useState(doc.fields?.inputs || []);
  const [checklist, setChecklist] = useState(doc.fields?.checklist || []);
  const TYPE_OPTIONS = [
    ["text", "Text"],
    ["tel", "Phone number"],
    ["money", "Dollar amount"],
    ["date", "Date"],
  ];
  const setInput = (i, patch) => setInputs((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const setCheck = (i, patch) => setChecklist((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const [material, setMaterial] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dirty =
    title !== doc.title ||
    body !== (doc.body || "") ||
    JSON.stringify(initials) !== JSON.stringify(doc.fields?.initials || []) ||
    JSON.stringify(inputs) !== JSON.stringify(doc.fields?.inputs || []) ||
    JSON.stringify(checklist) !== JSON.stringify(doc.fields?.checklist || []);
  const canSave = dirty && title.trim() && (material || synopsis.trim());

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post(`/onboarding/documents/${doc.id}/revise`, {
        title: title.trim(),
        body,
        initials: doc.fields?.initials || initials.length ? initials : undefined,
        inputs,
        checklist,
        material,
        synopsis: synopsis.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: SP.lg, flexWrap: "wrap", marginBottom: SP.xl }}>
        <Btn variant="ghost" small onClick={onBack}>
          ← ALL DOCUMENTS
        </Btn>
        <h2 style={{ margin: 0, fontSize: F.h3, color: C.text }}>
          EDITING — {doc.title} <span style={{ fontSize: F.meta, color: C.muted, fontWeight: 400 }}>(currently version {doc.version})</span>
        </h2>
      </div>

      <label style={labelStyle}>TITLE</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ ...inputStyle, marginBottom: SP.lg }} />

      <label style={labelStyle}>DOCUMENT TEXT</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} style={{ ...inputStyle, resize: "vertical", marginBottom: SP.lg }} />

      {(doc.fields?.initials || initials.length > 0) && (
        <>
          <label style={labelStyle}>INITIAL STATEMENTS — EACH LINE IS ONE STATEMENT THE EMPLOYEE MUST ACKNOWLEDGE</label>
          {initials.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: SP.md, marginBottom: SP.sm, alignItems: "flex-start" }}>
              <textarea
                value={t}
                onChange={(e) => setInitials((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                rows={2}
                style={{ ...inputStyle, resize: "vertical", marginBottom: 0, flex: 1 }}
              />
              <button
                onClick={() => setInitials((arr) => arr.filter((_, j) => j !== i))}
                title="Remove this statement"
                style={{ background: "none", border: `1px solid ${C.red}55`, color: C.red, borderRadius: R.md, padding: "4px 10px", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          ))}
          <Btn small variant="ghost" onClick={() => setInitials((arr) => [...arr, ""])}>
            + ADD STATEMENT
          </Btn>
        </>
      )}

      <div style={{ margin: `${SP.xl}px 0` }}>
        <label style={labelStyle}>FORM FIELDS — WHAT THE EMPLOYEE FILLS IN (LEAVE EMPTY IF THIS DOCUMENT COLLECTS NOTHING)</label>
        {inputs.map((f, i) => (
          <div
            key={i}
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: R.card,
              padding: SP.lg,
              marginBottom: SP.sm,
              display: "flex",
              gap: SP.md,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              placeholder="Field label (what the employee sees)"
              value={f.label || ""}
              onChange={(ev) => setInput(i, { label: ev.target.value })}
              style={{ ...inputStyle, width: "auto", flex: "2 1 200px", marginBottom: 0 }}
            />
            <select
              value={f.type || "text"}
              onChange={(ev) => setInput(i, { type: ev.target.value })}
              style={{ ...inputStyle, width: "auto", flex: "0 1 150px", marginBottom: 0 }}
            >
              {TYPE_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <label style={{ display: "flex", gap: SP.sm, alignItems: "center", fontSize: F.meta, color: C.text, cursor: "pointer" }}>
              <input type="checkbox" checked={!!f.required} onChange={(ev) => setInput(i, { required: ev.target.checked })} />
              Required
            </label>
            <input
              placeholder="Hint shown under the field (optional)"
              value={f.hint || ""}
              onChange={(ev) => setInput(i, { hint: ev.target.value })}
              style={{ ...inputStyle, width: "auto", flex: "1 1 160px", marginBottom: 0 }}
            />
            {(f.type || "text") === "money" && (
              <>
                <input
                  placeholder="Min $"
                  value={f.min ?? ""}
                  onChange={(ev) => setInput(i, { min: ev.target.value })}
                  style={{ ...inputStyle, width: 80, marginBottom: 0 }}
                />
                <input
                  placeholder="Max $"
                  value={f.max ?? ""}
                  onChange={(ev) => setInput(i, { max: ev.target.value })}
                  style={{ ...inputStyle, width: 80, marginBottom: 0 }}
                />
              </>
            )}
            <button
              onClick={() => setInputs((arr) => arr.filter((_, j) => j !== i))}
              title="Remove this field"
              style={{ background: "none", border: `1px solid ${C.red}55`, color: C.red, borderRadius: R.md, padding: "4px 10px", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        ))}
        <Btn small variant="ghost" onClick={() => setInputs((arr) => [...arr, { label: "", type: "text", required: true }])}>
          + ADD FORM FIELD
        </Btn>
      </div>

      <div style={{ margin: `${SP.xl}px 0` }}>
        <label style={labelStyle}>CHECKLIST ITEMS — THINGS THE EMPLOYEE CHECKS AS RECEIVED (LEAVE EMPTY IF NONE)</label>
        {checklist.map((it, i) => (
          <div
            key={i}
            style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: R.card,
              padding: SP.lg,
              marginBottom: SP.sm,
              display: "flex",
              gap: SP.md,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <input
              placeholder="Item name (e.g. Hard Hat)"
              value={it.label || ""}
              onChange={(ev) => setCheck(i, { label: ev.target.value })}
              style={{ ...inputStyle, width: "auto", flex: "2 1 180px", marginBottom: 0 }}
            />
            <input
              placeholder="Detail asked when checked (e.g. Serial #) — optional"
              value={it.detail || ""}
              onChange={(ev) => setCheck(i, { detail: ev.target.value })}
              style={{ ...inputStyle, width: "auto", flex: "2 1 200px", marginBottom: 0 }}
            />
            <button
              onClick={() => setChecklist((arr) => arr.filter((_, j) => j !== i))}
              title="Remove this item"
              style={{ background: "none", border: `1px solid ${C.red}55`, color: C.red, borderRadius: R.md, padding: "4px 10px", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        ))}
        <Btn small variant="ghost" onClick={() => setChecklist((arr) => [...arr, { label: "" }])}>
          + ADD CHECKLIST ITEM
        </Btn>
      </div>

      <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xl, margin: `${SP.xl}px 0` }}>
        <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: SP.md }}>HOW BIG IS THIS CHANGE?</div>
        <label style={{ display: "flex", gap: SP.md, alignItems: "flex-start", marginBottom: SP.md, cursor: "pointer", fontSize: F.body, color: C.text }}>
          <input type="radio" checked={!material} onChange={() => setMaterial(false)} style={{ marginTop: 3 }} />
          <span>
            <strong>Notice.</strong> Employees who signed STAY SIGNED — their attestation stands as of hire. The update becomes the current version new hires
            sign; current employees see an informational note with your synopsis. No action required from anyone.
          </span>
        </label>
        <label style={{ display: "flex", gap: SP.md, alignItems: "flex-start", marginBottom: SP.md, cursor: "pointer", fontSize: F.body, color: C.text }}>
          <input type="radio" checked={material} onChange={() => setMaterial(true)} style={{ marginTop: 3 }} />
          <span>
            <strong>Material.</strong> The terms changed — every employee who signed must RE-SIGN with their biometric.
          </span>
        </label>
        <label style={labelStyle}>WHAT CHANGED — PLAIN ENGLISH{material ? " (OPTIONAL FOR RE-SIGNS)" : " (REQUIRED — EMPLOYEES SEE THIS)"}</label>
        <input
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          placeholder="e.g. Urine analysis cost updated to $150"
          style={{ ...inputStyle, marginBottom: 0 }}
        />
      </div>

      {error && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.lg }}>{error}</div>}
      <div style={{ display: "flex", gap: SP.md, marginBottom: 40 }}>
        <Btn onClick={() => setConfirm(true)} disabled={!canSave || busy}>
          {busy ? "SAVING…" : `SAVE AS VERSION ${doc.version + 1}`}
        </Btn>
        <Btn variant="ghost" onClick={onBack}>
          CANCEL
        </Btn>
      </div>

      {confirm && (
        <ConfirmModal
          title={`Publish version ${doc.version + 1}?`}
          message={
            material
              ? "This is a MATERIAL change: every employee who signed the current version will be required to re-sign with their biometric. This document becomes customer-owned — the built-in starter version stops updating it."
              : "No action required from anyone: employees who signed stay signed, and your synopsis appears as an informational note. New hires sign the new version. This document becomes customer-owned — the built-in starter version stops updating it."
          }
          yesLabel="PUBLISH"
          onYes={save}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

function OnboardingEditor() {
  const [docs, setDocs] = useState(null);
  const [err, setErr] = useState(null);
  const [editing, setEditing] = useState(null);

  const refresh = useCallback(() => {
    api
      .get(`/onboarding/my`)
      .then((r) => setDocs(r.documents.filter((d) => d.kind !== "office_record")))
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (err) return <div style={{ color: C.red, padding: SP.gutter }}>{err}</div>;
  if (!docs) return <div style={{ color: C.muted, padding: SP.gutter }}>Loading documents…</div>;

  if (editing)
    return (
      <EditDoc
        doc={editing}
        onBack={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    );

  return (
    <div>
      <div style={{ fontSize: F.meta, color: C.muted, marginBottom: SP.xl, lineHeight: 1.5 }}>
        Owner-only. Open a document to revise its wording — saving publishes a new version and routes every employee who already signed through either a re-sign
        (material) or a one-click acknowledgment (notice). Office-recorded rows have nothing to edit.
      </div>
      {docs.map((d) => (
        <div
          key={d.id}
          onClick={async () => {
            const full = await api.get(`/onboarding/my/${d.id}`);
            setEditing(full.document);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: SP.md,
            padding: `${SP.lg}px ${SP.xl}px`,
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderRadius: R.card,
            marginBottom: SP.sm,
            cursor: "pointer",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: F.body, fontWeight: 700, color: C.text }}>
            <span style={{ color: C.muted, fontWeight: 400 }}>{d.item_no}. </span>
            {d.title}
          </div>
          <span style={{ fontSize: F.label, color: C.muted }}>
            version {d.version} · {d.kind.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default OnboardingEditor;
