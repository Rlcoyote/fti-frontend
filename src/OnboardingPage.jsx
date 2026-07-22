import { useState, useEffect, useCallback } from "react";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";
import useBackClose from "./useBackClose.js";
import { Btn, TabBtns, inputStyle } from "./SharedUI.jsx";
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
    label = "RE-SIGN REQUIRED (POLICY CHANGED)";
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
  // v28.390 — BACK closes the open document, not the whole page.
  useBackClose(!!openDoc, () => setOpenDoc(null));
  const [viewDoc, setViewDoc] = useState(null); // signed record view
  useBackClose(!!viewDoc, () => setViewDoc(null));
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
        {d.updated_since_signed && (
          <div style={{ fontSize: F.label, color: C.muted, fontWeight: 400, marginTop: 2, fontStyle: "italic" }}>
            Updated to version {d.version} since you signed{d.revision_synopsis ? " — " + d.revision_synopsis : ""}. Your signature stands — no action needed.
          </div>
        )}
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
  // v28.390 — BACK returns to the roster, not the main page.
  useBackClose(!!openUser, () => setOpenUser(null));
  const [userDocs, setUserDocs] = useState(null);
  const [comment, setComment] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifySaved, setNotifySaved] = useState("");
  useEffect(() => {
    api
      .get(`/onboarding/settings`)
      .then((r) => setNotifyEmail(r.notify_email || ""))
      .catch(() => {});
  }, []);

  // v28.386 (audit D2 — the ratified re-download approval flow's missing
  // half): the employee side could REQUEST a packet re-download since v28.341;
  // the office had no surface to see or decide requests. Backend routes were
  // built and waiting — approval auto-delivers the packet.
  const [dlRequests, setDlRequests] = useState([]);
  const [dlMsg, setDlMsg] = useState("");

  const refresh = useCallback(() => {
    api
      .get(`/onboarding/roster`)
      .then(setRoster)
      .catch((e) => setErr(e.message));
    api
      .get(`/onboarding/download-requests`)
      .then(setDlRequests)
      .catch(() => {});
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const decideDl = async (id, approve) => {
    setDlMsg("");
    try {
      const r = await api.post(`/onboarding/download-requests/${id}/decide`, { approve });
      setDlMsg(
        approve
          ? r.delivery_error
            ? `Approved, but delivery failed: ${r.delivery_error}`
            : `Approved — packet sent via ${r.request?.delivered_channel || "email"}`
          : "Request denied",
      );
      refresh();
    } catch (e) {
      setDlMsg(e.message);
    }
  };

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
      <div style={{ background: C.steel, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xl, marginBottom: SP.xl }}>
        <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: SP.sm }}>WHERE DO ONBOARDING REQUEST EMAILS GO? (TYPICALLY HR)</div>
        <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="hr@flotest.com — leave empty to send to the owner only"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "1 1 260px", marginBottom: 0 }}
          />
          <Btn
            small
            onClick={async () => {
              try {
                await api.put(`/onboarding/settings`, { notify_email: notifyEmail.trim() });
                setNotifySaved("Saved — requests now go to " + (notifyEmail.trim() || "the owner only"));
              } catch (e) {
                setNotifySaved(e.message);
              }
            }}
          >
            SAVE
          </Btn>
        </div>
        {notifySaved && <div style={{ fontSize: F.meta, color: C.green, fontWeight: 700, marginTop: SP.sm }}>{notifySaved}</div>}
      </div>

      {/* DOWNLOAD REQUESTS — management approval gate (ratified: re-download
          = management approval; approval IS the delivery order). */}
      {dlRequests.length > 0 && (
        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.xl, marginBottom: SP.xl }}>
          <div style={{ fontSize: F.label, fontWeight: 800, color: C.muted, marginBottom: SP.sm }}>PACKET RE-DOWNLOAD REQUESTS</div>
          {dlRequests.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: SP.md,
                padding: `${SP.sm}px 0`,
                borderTop: `1px solid ${C.border}33`,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: F.body, color: C.text, flex: "1 1 200px" }}>
                <span style={{ fontWeight: 700 }}>{r.user_name}</span>
                <span style={{ fontSize: F.label, color: C.muted }}> · requested {new Date(r.requested_at).toLocaleString()}</span>
              </div>
              {r.status === "pending" ? (
                <div style={{ display: "flex", gap: SP.md }}>
                  <Btn small onClick={() => decideDl(r.id, true)}>
                    APPROVE &amp; SEND
                  </Btn>
                  <Btn small variant="ghost" onClick={() => decideDl(r.id, false)}>
                    DENY
                  </Btn>
                </div>
              ) : (
                <span
                  style={{
                    fontSize: F.badge,
                    fontWeight: 800,
                    color: r.status === "approved" ? C.green : C.muted,
                    border: `1px solid ${(r.status === "approved" ? C.green : C.muted) + "66"}`,
                    background: (r.status === "approved" ? C.green : C.muted) + "18",
                    borderRadius: R.xl,
                    padding: "2px 7px",
                  }}
                >
                  {r.status.toUpperCase()}
                  {r.delivered_channel ? ` — SENT VIA ${String(r.delivered_channel).toUpperCase()}` : ""}
                </span>
              )}
            </div>
          ))}
          {dlMsg && <div style={{ fontSize: F.meta, color: dlMsg.includes("fail") ? C.red : C.green, fontWeight: 700, marginTop: SP.sm }}>{dlMsg}</div>}
        </div>
      )}

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
        Handbook are under COMPANY LIBRARY.
      </div>
      {isOffice && (
        <div style={{ marginBottom: SP.xxl }}>
          <TabBtns
            value={tab}
            onChange={setTab}
            options={[["mine", "MY DOCUMENTS"], ["office", "OFFICE — ROSTER"], ...(isOwner ? [["editor", "DOCUMENT EDITOR"]] : [])]}
          />
        </div>
      )}
      {tab === "mine" ? <MyPacket /> : tab === "editor" && isOwner ? <OnboardingEditor /> : <OfficeRoster />}
    </div>
  );
}

export default OnboardingPage;
