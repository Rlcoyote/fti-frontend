import { useState, useEffect, useCallback } from "react";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";
import { Btn, inputStyle } from "./SharedUI.jsx";
import OnboardingSignFlow from "./OnboardingSignFlow.jsx";
import OnboardingEditor from "./OnboardingEditor.jsx";

// ─── OnboardingPage (v28.340) ────────────────────────────────────────────────
// Spec: fti-docs references/FTI_Onboarding_Spec.md (ratified 2026-07-17).
// MY DOCUMENTS: the employee's own New Hire Packet — sign outstanding docs
// (biometric), acknowledge notice-class revisions (one click), view own signed
// records on request, request a re-download (approval-gated + notified).
// OFFICE tab: HARDCODED owner/admin only (mirrors the backend requireRole —
// deliberately NOT a matrix key, spec §1.7) — roster standing + office-mark
// paper/external checklist items.

const kindChip = (doc) => {
  let label, color;
  if (doc.kind === "office_record") {
    label = doc.complete ? "OFFICE RECORDED" : "OFFICE — PENDING";
    color = doc.complete ? C.green : C.muted;
  } else if (doc.complete && doc.verified) {
    label = "COMPLETE — VERIFIED";
    color = C.green;
  } else if (doc.complete) {
    label = "SIGNED — AWAITING MANAGER REVIEW";
    color = C.blue;
  } else if (doc.needs_resign) {
    label = "RE-SIGN REQUIRED (UPDATED)";
    color = C.orange;
  } else if (doc.needs_receipt) {
    label = "UPDATED — ACKNOWLEDGE";
    color = C.orange;
  } else {
    label = doc.kind === "consent" ? "CONSENT — SIGN" : doc.kind === "form" ? "FILL & SIGN" : "READ & SIGN";
    color = C.red;
  }
  return (
    <span
      style={{
        fontSize: F.badge,
        fontWeight: 800,
        color,
        border: `1px solid ${color}66`,
        background: `${color}18`,
        borderRadius: R.xl,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
};

function MyPacket() {
  const { currentUser } = useApp();
  // v28.346 — owner/admin self-verify shortcut (same hardcoded set + same
  // endpoint as the OFFICE tab; this is a convenience surface, not a new rule).
  const isOffice = ["owner", "admin"].includes(currentUser.role);
  const [docs, setDocs] = useState(null);
  const [err, setErr] = useState(null);
  const [openDoc, setOpenDoc] = useState(null); // full doc for sign flow
  const [viewDoc, setViewDoc] = useState(null); // signed record view
  const [notice, setNotice] = useState("");

  const refresh = useCallback(() => {
    api
      .get(`/onboarding/my`)
      .then((r) => setDocs(r.documents))
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  if (err) return <div style={{ color: C.red, padding: SP.gutter }}>{err}</div>;
  if (!docs) return <div style={{ color: C.muted, padding: SP.gutter }}>Loading your documents…</div>;

  if (openDoc)
    return (
      <OnboardingSignFlow
        doc={openDoc}
        onBack={() => setOpenDoc(null)}
        onSigned={() => {
          setOpenDoc(null);
          refresh();
        }}
      />
    );

  if (viewDoc)
    return (
      <div>
        <Btn variant="ghost" small onClick={() => setViewDoc(null)}>
          ← MY DOCUMENTS
        </Btn>
        <h2 style={{ fontSize: F.h3, color: C.text, margin: `${SP.md}px 0` }}>
          {viewDoc.document.title}
          <span style={{ fontSize: F.meta, color: C.muted, fontWeight: 400 }}> — Checklist Item {viewDoc.document.item_no}</span>
        </h2>
        {viewDoc.my_signatures.map((s) => (
          <div key={s.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xxl, marginBottom: SP.xl }}>
            <div style={{ fontSize: F.meta, color: C.green, fontWeight: 700, marginBottom: SP.md }}>
              ✓ Signed {new Date(s.signed_at).toLocaleString()} — version {s.doc_version}
            </div>
            {s.body_snapshot && (
              <div style={{ fontSize: F.body, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: SP.lg }}>{s.body_snapshot}</div>
            )}
            {s.voided_at && (
              <div style={{ fontSize: F.meta, color: C.red, fontWeight: 800, marginBottom: SP.md }}>
                VOIDED {new Date(s.voided_at).toLocaleString()} — {s.void_reason}
              </div>
            )}
            {s.form_data?.initialed_statements && (
              <div style={{ marginBottom: SP.lg }}>
                {s.form_data.initialed_statements.map((t, i) => (
                  <div key={i} style={{ fontSize: F.meta, color: C.text, marginBottom: 4, display: "flex", gap: SP.md }}>
                    <span style={{ color: C.green, fontWeight: 900 }}>✓</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}
            {s.form_data?.items && (
              <div style={{ marginBottom: SP.lg }}>
                {Object.entries(s.form_data.items).map(([k, v]) => (
                  <div key={k} style={{ fontSize: F.body, color: C.text, marginBottom: 2 }}>
                    <span style={{ color: v.received ? C.green : C.muted, fontWeight: 900 }}>{v.received ? "✓" : "—"}</span>{" "}
                    <span style={{ textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                    {v.received ? "" : " (not issued)"}
                    {v.detail ? " — " + v.detail : ""}
                  </div>
                ))}
              </div>
            )}
            {s.form_data && (
              <div style={{ fontSize: F.body, color: C.text }}>
                {Object.entries(s.form_data)
                  .filter(([k]) => k !== "items" && k !== "initialed_statements")
                  .map(([k, v]) => (
                    <div key={k} style={{ marginBottom: 2 }}>
                      <span style={{ color: C.muted, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}: </span>
                      {String(v)}
                    </div>
                  ))}
              </div>
            )}
            <div style={{ fontSize: F.label, color: C.muted, fontStyle: "italic", marginTop: SP.lg }}>{s.attestation_text}</div>
          </div>
        ))}
        {viewDoc.my_signatures.length === 0 && <div style={{ color: C.muted, padding: SP.lg }}>No signature on record for this document.</div>}
      </div>
    );

  const outstanding = docs.filter((d) => d.kind !== "office_record" && !d.complete);
  const officeItems = docs.filter((d) => d.kind === "office_record");
  const signed = docs.filter((d) => d.kind !== "office_record" && d.complete);
  const packetDone = outstanding.length === 0;

  const row = (d, actionable) => (
    <div
      key={d.id}
      onClick={async () => {
        if (actionable && d.needs_receipt) return; // handled by its button
        if (actionable) {
          const full = await api.get(`/onboarding/my/${d.id}`);
          setOpenDoc(full.document);
        } else if (d.kind !== "office_record") {
          setViewDoc(await api.get(`/onboarding/my/${d.id}`));
        }
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
        cursor: actionable || d.kind !== "office_record" ? "pointer" : "default",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: F.body, fontWeight: 700, color: C.text, flex: "1 1 200px" }}>
        <span style={{ color: C.muted, fontWeight: 400 }}>{d.item_no}. </span>
        {d.title}
      </div>
      <div style={{ display: "flex", gap: SP.md, alignItems: "center" }}>
        {isOffice && d.kind !== "office_record" && d.complete && !d.verified && (
          <Btn
            small
            onClick={async (e) => {
              e.stopPropagation();
              await api.post("/onboarding/users/" + currentUser.id + "/verify/" + d.id, {});
              refresh();
            }}
          >
            MARK VERIFIED
          </Btn>
        )}
        {d.needs_receipt && (
          <Btn
            small
            onClick={async (e) => {
              e.stopPropagation();
              await api.post(`/onboarding/my/${d.id}/acknowledge`, {});
              refresh();
            }}
          >
            ACKNOWLEDGE UPDATE
          </Btn>
        )}
        {kindChip(d)}
      </div>
    </div>
  );

  return (
    <div>
      {notice && <div style={{ color: C.green, fontWeight: 700, fontSize: F.body, marginBottom: SP.lg }}>{notice}</div>}
      {outstanding.length > 0 && (
        <>
          <div style={{ fontSize: F.label, fontWeight: 800, color: C.red, margin: `${SP.lg}px 0 ${SP.sm}px` }}>TO COMPLETE ({outstanding.length})</div>
          {outstanding.map((d) => row(d, true))}
        </>
      )}
      {packetDone && (
        <div
          style={{
            background: `${C.green}18`,
            border: `1px solid ${C.green}55`,
            borderRadius: R.card,
            padding: SP.xl,
            marginBottom: SP.lg,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: SP.md,
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: C.green, fontWeight: 800, fontSize: F.body }}>✓ Your packet is complete.</span>
          <Btn
            small
            variant="ghost"
            onClick={async () => {
              try {
                const r = await api.post(`/onboarding/my/request-download`, {});
                setNotice(r.message);
              } catch (e) {
                setNotice(e.message);
              }
            }}
          >
            REQUEST A COPY
          </Btn>
        </div>
      )}
      {signed.length > 0 && (
        <>
          <div style={{ fontSize: F.label, fontWeight: 800, color: C.green, margin: `${SP.lg}px 0 ${SP.sm}px` }}>SIGNED — TAP TO VIEW</div>
          {signed.map((d) => row(d, false))}
        </>
      )}
      {officeItems.length > 0 && (
        <>
          <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, margin: `${SP.lg}px 0 ${SP.sm}px` }}>OFFICE-RECORDED ITEMS</div>
          <div style={{ fontSize: F.meta, color: C.muted, marginBottom: SP.sm }}>
            These are paper items completed WITH the office (applications, ID copies, benefits forms). The office checks each one off as it lands in your file —
            OFFICE — PENDING flips to OFFICE RECORDED when they do. Nothing for you to sign here.
          </div>
          {officeItems.map((d) => row(d, false))}
        </>
      )}
    </div>
  );
}

// ─── OFFICE tab — hardcoded owner/admin (mirrors backend) ───────────────────
function OfficeRoster() {
  const [roster, setRoster] = useState(null);
  const [err, setErr] = useState(null);
  const [openUser, setOpenUser] = useState(null);
  const [userDocs, setUserDocs] = useState(null);
  const [comment, setComment] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const refresh = useCallback(() => {
    api
      .get(`/onboarding/roster`)
      .then(setRoster)
      .catch((e) => setErr(e.message));
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const openEmployee = async (u) => {
    setOpenUser(u);
    setUserDocs(null);
    const r = await api.get(`/onboarding/users/${u.user_id}`);
    setUserDocs(r.documents);
  };

  if (err) return <div style={{ color: C.red, padding: SP.gutter }}>{err}</div>;
  if (!roster) return <div style={{ color: C.muted, padding: SP.gutter }}>Loading roster…</div>;

  if (openUser)
    return (
      <div>
        <Btn variant="ghost" small onClick={() => setOpenUser(null)}>
          ← ROSTER
        </Btn>
        <h2 style={{ fontSize: F.h3, color: C.text, margin: `${SP.md}px 0` }}>{openUser.name} — New Hire Packet</h2>
        {!userDocs && <div style={{ color: C.muted }}>Loading…</div>}
        {userDocs &&
          userDocs.map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: SP.md,
                padding: `${SP.md}px ${SP.xl}px`,
                background: C.cardBg,
                border: `1px solid ${C.border}`,
                borderRadius: R.card,
                marginBottom: SP.sm,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: F.body, color: C.text, flex: "1 1 200px" }}>
                <span style={{ color: C.muted }}>{d.item_no}. </span>
                {d.title}
                {d.marked_by_name && <span style={{ fontSize: F.label, color: C.muted }}> — recorded by {d.marked_by_name}</span>}
              </div>
              <div style={{ display: "flex", gap: SP.md, alignItems: "center" }}>
                {d.kind !== "office_record" && d.complete && (
                  <Btn
                    small
                    variant="danger"
                    onClick={async () => {
                      if (!comment.trim()) {
                        setErrMsg("Type the void reason in the note box below first");
                        return;
                      }
                      setErrMsg("");
                      await api.post("/onboarding/users/" + openUser.user_id + "/void/" + d.id, { reason: comment.trim() });
                      setComment("");
                      openEmployee(openUser);
                    }}
                  >
                    VOID
                  </Btn>
                )}
                {d.kind !== "office_record" && d.complete && !d.verified && (
                  <Btn
                    small
                    onClick={async () => {
                      await api.post(`/onboarding/users/${openUser.user_id}/verify/${d.id}`, {});
                      openEmployee(openUser);
                    }}
                  >
                    MARK VERIFIED
                  </Btn>
                )}
                {d.kind === "office_record" && !d.complete && (
                  <Btn
                    small
                    onClick={async () => {
                      await api.post(`/onboarding/users/${openUser.user_id}/office-mark/${d.id}`, { comment: comment.trim() || undefined });
                      setComment("");
                      openEmployee(openUser);
                    }}
                  >
                    MARK COMPLETE
                  </Btn>
                )}
                {kindChip(d)}
              </div>
            </div>
          ))}
        {errMsg && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginTop: SP.md }}>{errMsg}</div>}
        <div style={{ marginTop: SP.lg }}>
          <input
            placeholder="Note — used by MARK COMPLETE (items detail) and required by VOID (the reason)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>
    );

  return (
    <div>
      {roster.map((u) => (
        <div
          key={u.user_id}
          onClick={() => openEmployee(u)}
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
            {u.name} <span style={{ fontSize: F.label, color: C.muted, fontWeight: 400, textTransform: "uppercase" }}>{u.role}</span>
            {u.onboarding_gate && <span style={{ fontSize: F.badge, color: C.orange, fontWeight: 800, marginLeft: SP.md }}>GATED UNTIL COMPLETE</span>}
          </div>
          <div style={{ fontSize: F.meta, color: u.verified === u.required ? C.green : C.text, fontWeight: 700 }}>
            {u.signed}/{u.required} signed · {u.verified}/{u.required} verified · {u.office_marked}/{u.office_total} office
            {u.needs_resign ? " · RE-SIGN DUE" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function OnboardingPage() {
  const { currentUser } = useApp();
  // Hardcoded owner/admin — mirrors the backend's requireRole (spec §1.7);
  // deliberately not a permission key. The EDITOR is tighter still: owner only
  // (it rewrites what every employee signs; backend enforces the same).
  const isOffice = ["owner", "admin"].includes(currentUser.role);
  const isOwner = currentUser.role === "owner";
  const [tab, setTab] = useState("mine");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: `${SP.xxl + 2}px ${SP.xl + 2}px 60px` }}>
      <h1 style={{ fontSize: F.h1, margin: `0 0 ${SP.xs}px`, color: C.text }}>ONBOARDING — MY DOCUMENTS</h1>
      <div style={{ fontSize: F.body, color: C.muted, marginBottom: SP.xxl }}>
        Your New Hire Packet, signed with your own biometric. Your records are always available to you here. The Policies &amp; Procedures Manual and Employee
        Handbook are under FIELD RESOURCES.
      </div>
      {isOffice && (
        <div style={{ display: "flex", gap: SP.md, marginBottom: SP.xxl }}>
          {[["mine", "MY DOCUMENTS"], ["office", "OFFICE — ROSTER"], ...(isOwner ? [["editor", "DOCUMENT EDITOR"]] : [])].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: `${SP.lg}px ${SP.xxl}px`,
                fontSize: F.md,
                fontWeight: 800,
                borderRadius: R.card,
                border: `2px solid ${tab === k ? C.red : C.border}`,
                background: tab === k ? `${C.red}22` : "none",
                color: C.text,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {tab === "mine" ? <MyPacket /> : tab === "editor" && isOwner ? <OnboardingEditor /> : <OfficeRoster />}
    </div>
  );
}

export default OnboardingPage;
