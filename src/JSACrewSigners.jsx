import { useState, useEffect, useCallback } from "react";
import { C, API_URL } from "./config.js";
import { Btn, labelStyle } from "./SharedUI.jsx";
import { useApp } from "./AppContext.jsx";
import JSASignSubmitModal from "./JSASignSubmitModal.jsx";
import JSALeadOverrideModal from "./JSALeadOverrideModal.jsx";
import JSAPathBSignModal from "./JSAPathBSignModal.jsx";

// ─── JSACrewSigners (v28.07) ────────────────────────────────────────────────
// Renders the list of required FTI crew signers for a JSA (sourced from the
// parent ticket's ticket_crew rows) along with each member's signature
// status. Distinct from the existing typed-name "CREW SIGNATURES" section
// in JSAModal, which is for non-FTI external signers (subcontractors,
// customer reps, walk-ups) per Reggie's spec.
//
// Per signer, the UI surfaces:
//   - For SELF (the logged-in user, if they're on the crew):
//       · If unsigned: "SIGN WITH BIOMETRIC" button → opens JSASignSubmitModal
//   - For OTHERS (visible to lead / manager+):
//       · If unsigned: "SEND LINK" + "OVERRIDE" buttons
//       · If signed: status badge + sign method
//
// Status surfaces refresh after each action via fetchSigners().
//
// All Signed banner appears when every required signer has an active
// signature. The parent JSAModal can then call POST /api/jsas/:id/complete
// to finalize.

function StatusBadge({ method, witnessName }) {
  if (method === "biometric") {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#00633a",
          background: "#d8f0e2",
          border: `1px solid #00633a44`,
          padding: "2px 8px",
          borderRadius: 3,
          letterSpacing: "0.06em",
        }}
      >
        SIGNED — BIOMETRIC
      </span>
    );
  }
  if (method === "lead_override") {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#8a6500",
          background: "#fdf5d8",
          border: `1px solid #8a650044`,
          padding: "2px 8px",
          borderRadius: 3,
          letterSpacing: "0.06em",
        }}
        title={witnessName ? `Witnessed by ${witnessName}` : undefined}
      >
        LEAD OVERRIDE{witnessName ? ` · ${witnessName}` : ""}
      </span>
    );
  }
  if (method === "pin_witnessed") {
    return (
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#3a3a3a",
          background: "#e8e8e8",
          border: `1px solid #3a3a3a44`,
          padding: "2px 8px",
          borderRadius: 3,
          letterSpacing: "0.06em",
        }}
      >
        SIGNED — PIN
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 800,
        color: C.muted,
        background: C.steel,
        border: `1px solid ${C.border}`,
        padding: "2px 8px",
        borderRadius: 3,
        letterSpacing: "0.06em",
      }}
    >
      NOT SIGNED
    </span>
  );
}

function JSACrewSigners({ jsaId, onAllSigned, onNeedsRefresh }) {
  const { currentUser } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideReason, setOverrideReason] = useState(""); // v28.71 — surfaces the fallback reason inside the override modal
  const [pinWitnessTarget, setPinWitnessTarget] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [linkSentMsg, setLinkSentMsg] = useState("");

  const fetchSigners = useCallback(async () => {
    if (!jsaId) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API_URL}/jsas/${jsaId}/required-signers`);
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        setError(data?.error || `Could not load signers (${r.status})`);
        return;
      }
      const json = await r.json();
      setData(json);
      if (json.all_signed && onAllSigned) onAllSigned();
    } catch {
      setError("Connection error loading signers");
    } finally {
      setLoading(false);
    }
  }, [jsaId, onAllSigned]);

  useEffect(() => {
    fetchSigners();
  }, [fetchSigners]);

  const sendLink = async (userId) => {
    setBusyUserId(userId);
    setError("");
    setLinkSentMsg("");
    try {
      const r = await fetch(`${API_URL}/jsas/${jsaId}/send-sign-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j?.error || "Could not send link");
        return;
      }
      setLinkSentMsg(j.message || `Link sent via ${j.channel || "email"}.`);
      setTimeout(() => setLinkSentMsg(""), 4000);
    } catch {
      setError("Connection error sending link");
    } finally {
      setBusyUserId(null);
    }
  };

  // v28.07.4 — never return null. Always show the section header so the
  // user knows where the FTI Crew Biometric Signatures live, regardless of
  // load state or fetch outcome. Earlier code returned null on fetch
  // failure, leaving silent empty space that looked like the feature was
  // missing entirely.
  if (loading)
    return (
      <div style={{ marginBottom: 14, padding: 14, background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 6 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>FTI CREW BIOMETRIC SIGNATURES</div>
        <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Loading required signers...</div>
      </div>
    );
  if (!data)
    return (
      <div style={{ marginBottom: 14, padding: 14, background: C.cardBg, border: `1px solid ${C.red}33`, borderRadius: 6 }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>FTI CREW BIOMETRIC SIGNATURES</div>
        <div style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>{error || "Could not load required signers."}</div>
      </div>
    );

  const userOnCrew = data.crew.find((c) => c.user_id === currentUser?.id);
  const userIsLead = !!(userOnCrew && userOnCrew.is_lead);
  const role = currentUser?.role || "";
  // v28.139 (permissions audit Phase 5.5) — intentionally NOT a can() matrix
  // key: JSA sign-link / override authority is "lead of THIS ticket OR
  // manager+", per-record context a flat key cannot express. The backend
  // (jsas.signing.js) is the enforced gate. Documented exception — keep.
  const canSendLinkOrOverride = userIsLead || ["owner", "admin", "manager"].includes(role);
  const ticketIsClosed = data.ticket_is_closed;
  const jsaCompleted = !!data.jsa_completed_at;

  return (
    <>
      <div
        style={{
          marginBottom: 14,
          padding: 14,
          background: data.all_signed ? "#e6f5ec" : C.cardBg,
          border: `1px solid ${data.all_signed ? "#00633a44" : C.border}`,
          borderRadius: 6,
        }}
      >
        <div style={{ ...labelStyle, marginBottom: 10 }}>
          FTI CREW BIOMETRIC SIGNATURES ({data.crew.filter((c) => c.signature_id).length}/{data.crew_count})
        </div>

        {data.crew.length === 0 && (
          <div
            style={{
              padding: "10px 12px",
              background: "#fdf5d8",
              border: `1px solid #8a650044`,
              borderRadius: 4,
              fontSize: 12,
              color: "#8a6500",
              lineHeight: 1.5,
            }}
          >
            <strong>No crew assigned to this ticket yet.</strong> Close the JSA, find the TICKET CREW section on the ticket itself (between Site Manager and
            Time &amp; Mileage in TicketDetail, or below Notes in the Add Ticket modal), assign at least one crew member as lead, then re-open the JSA. Required
            signers will then auto-populate here.
          </div>
        )}

        {data.crew.length > 0 && (
          <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, overflow: "hidden" }}>
            {data.crew.map((c, i) => {
              const isSelf = c.user_id === currentUser?.id;
              const isSigned = !!c.signature_id;
              const canSelfSign = isSelf && !isSigned && !jsaCompleted && !ticketIsClosed;
              return (
                <div
                  key={c.user_id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    borderTop: i === 0 ? "none" : `1px solid ${C.border}`,
                    background: isSigned ? "#f8fbf9" : C.cardBg,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* v28.38 — signed rows have a light green (#f8fbf9)
                        background. C.text and C.muted are light in dark mode,
                        so we override with explicit dark colors on signed
                        rows. Unsigned rows keep theme colors (dark cardBg
                        background, light text, contrast already correct). */}
                    <div style={{ fontSize: 13, fontWeight: 600, color: isSigned ? "#1a2340" : C.text }}>
                      {c.user_name}
                      {c.is_lead && <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: "#8a6500" }}>· LEAD</span>}
                      {isSelf && <span style={{ marginLeft: 8, fontSize: 9, color: isSigned ? "#4a5570" : C.muted, fontStyle: "italic" }}>· You</span>}
                    </div>
                    <div style={{ fontSize: 10, color: isSigned ? "#4a5570" : C.muted, marginTop: 2 }}>
                      <StatusBadge method={c.sign_method} witnessName={c.witness_name} />
                      {c.signed_at && (
                        <span style={{ marginLeft: 8 }}>
                          {new Date(c.signed_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isSigned && !jsaCompleted && !ticketIsClosed && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {canSelfSign && (
                        <button
                          onClick={() => setSignOpen(true)}
                          style={{
                            background: C.red,
                            border: "none",
                            color: C.white,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "5px 12px",
                            borderRadius: 3,
                            cursor: "pointer",
                            letterSpacing: "0.06em",
                          }}
                        >
                          SIGN WITH BIOMETRIC
                        </button>
                      )}
                      {canSendLinkOrOverride && !canSelfSign && (
                        <>
                          <button
                            onClick={() => setPinWitnessTarget(c)}
                            style={{
                              background: C.blue,
                              border: "none",
                              color: C.white,
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "4px 10px",
                              borderRadius: 3,
                              cursor: "pointer",
                              letterSpacing: "0.06em",
                            }}
                            title="Crew member signs by entering their PIN on this device, with a photo + your biometric witness."
                          >
                            SIGN W/ PIN
                          </button>
                          <button
                            onClick={() => sendLink(c.user_id)}
                            disabled={busyUserId === c.user_id}
                            style={{
                              background: "transparent",
                              border: `1px solid ${C.blue}`,
                              color: C.blue,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 3,
                              cursor: busyUserId === c.user_id ? "default" : "pointer",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {busyUserId === c.user_id ? "SENDING..." : "SEND LINK"}
                          </button>
                          <button
                            onClick={() => setOverrideTarget(c)}
                            style={{
                              background: "transparent",
                              border: `1px solid ${C.muted}`,
                              color: C.muted,
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: 3,
                              cursor: "pointer",
                              letterSpacing: "0.06em",
                            }}
                          >
                            OVERRIDE
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {data.all_signed && (
          <div
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#00633a",
              color: C.white,
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 4,
              textAlign: "center",
              letterSpacing: "0.06em",
            }}
          >
            ✓ ALL CREW SIGNED — JSA READY TO COMPLETE
          </div>
        )}

        {linkSentMsg && (
          <div
            style={{
              marginTop: 10,
              padding: "6px 10px",
              background: "#e6f5ec",
              color: "#00633a",
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 3,
            }}
          >
            {linkSentMsg}
          </div>
        )}
        {error && <div style={{ marginTop: 10, color: C.red, fontSize: 12, fontWeight: 700 }}>{error}</div>}
      </div>

      {/* SELF-SIGN biometric ceremony */}
      {signOpen && (
        <JSASignSubmitModal
          jsaId={jsaId}
          jsaContext={data}
          onClose={() => setSignOpen(false)}
          onSigned={() => {
            setSignOpen(false);
            fetchSigners();
            if (onNeedsRefresh) onNeedsRefresh();
          }}
        />
      )}

      {/* LEAD OVERRIDE for an unsigned crew member */}
      {overrideTarget && (
        <JSALeadOverrideModal
          jsaId={jsaId}
          target={overrideTarget}
          jsaContext={data}
          fallbackReason={overrideReason}
          onClose={() => {
            setOverrideTarget(null);
            setOverrideReason("");
          }}
          onOverridden={() => {
            setOverrideTarget(null);
            setOverrideReason("");
            fetchSigners();
            if (onNeedsRefresh) onNeedsRefresh();
          }}
        />
      )}

      {/* PATH B — PIN + photo + lead biometric witness (v28.19) */}
      {pinWitnessTarget && (
        <JSAPathBSignModal
          jsaId={jsaId}
          target={pinWitnessTarget}
          onClose={() => setPinWitnessTarget(null)}
          onSigned={() => {
            setPinWitnessTarget(null);
            fetchSigners();
            if (onNeedsRefresh) onNeedsRefresh();
          }}
          onFallbackToOverride={(target, reason) => {
            // v28.71 — 3-strike PIN failure or no-PIN-set → seamless
            // transition into Path C, BUT carry the reason into the
            // override modal so the lead sees WHY they're being routed
            // there. Prior version set linkSentMsg (green pill in
            // parent) which was visually hidden behind the override
            // modal that opened immediately after. Reggie surfaced
            // this gap during v28.68 smoke testing: random PIN entry
            // for a crew member with no PIN on file silently routed
            // to override with no explanation.
            setPinWitnessTarget(null);
            setOverrideReason(reason);
            setOverrideTarget(target);
          }}
        />
      )}
    </>
  );
}

export default JSACrewSigners;
