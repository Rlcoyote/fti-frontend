import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { C } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";
import { Btn } from "./SharedUI.jsx";
import { TakeTest } from "./TrainingPage.jsx";
import CompetencySignoffModal from "./CompetencySignoffModal.jsx";

// ─── CompetencyPage (v28.441) ───────────────────────────────────────────────
// The Certifications flow — a CERTIFICATION is a separate class from awareness
// training (Reggie 260806): competency to OPERATE equipment, earned via a
// written test PLUS a hands-on practical evaluation, dual-signed, that expires.
//
// Reuses the wheels, no duplication:
//   - the written test uses TrainingPage's exported <TakeTest>.
//   - the sign-off uses the JSA Path B ceremony (evaluator biometric + trainee
//     PIN) in <CompetencySignoffModal>.
//   - the earned credential lands in the existing safety_certs registry and
//     shows on the Certifications (Safety) page + /expiring feed.
// Backend: routes/competency.js. Mobile-first cards (Articles XIV + XV).

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}

function Chip({ ok, label, tone }) {
  const color = tone === "warn" ? C.orange || C.red : ok ? C.green : C.red;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color,
        border: `1px solid ${color}66`,
        background: `${color}18`,
        borderRadius: 6,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function CompetencyPage() {
  const { can } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState(null); // { certs, can_sign_off }
  const [err, setErr] = useState(null);
  const [view, setView] = useState({ mode: "list" }); // list | take | signoff
  // v28.444 — THE DOOR's landing side: ?cert=<id> (+ optional &trainee=<user>)
  // arrives from the Certifications add flow. The cert's card lights up and
  // scrolls into view; an evaluator arriving with a trainee lands straight in
  // the sign-off ceremony, trainee preselected. Params are consumed
  // (replaced away) so refresh/BACK don't replay — same contract as
  // useQueryPrefill, read together here because they arrive as a pair.
  const [focusCertId, setFocusCertId] = useState(null);
  const [doorTrainee, setDoorTrainee] = useState("");
  const focusRef = useRef(null);
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const cert = sp.get("cert");
    if (cert) {
      setFocusCertId(String(cert));
      setDoorTrainee(sp.get("trainee") || "");
      navigate(location.pathname, { replace: true });
    }
    // Deliberate deps: consume once per URL change (useQueryPrefill idiom).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const refresh = useCallback(() => {
    api
      .get(`/competency/certs`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Once the list is up and a door target is set: scroll the card into view;
  // an evaluator with a trainee in hand goes straight to the ceremony.
  useEffect(() => {
    if (!data || !focusCertId) return;
    const cert = data.certs.find((c) => String(c.id) === focusCertId);
    if (!cert) return;
    if (doorTrainee && data.can_sign_off && can("sign_off_competency")) {
      setView({ mode: "signoff", cert, traineeId: doorTrainee });
      setDoorTrainee("");
    } else {
      focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Deliberate deps: fires when the list lands or the target changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, focusCertId]);

  if (view.mode === "take") {
    return (
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 60px" }}>
        <TakeTest
          testId={view.testId}
          onCancel={() => setView({ mode: "list" })}
          onDone={() => {
            refresh();
            setView({ mode: "list" });
          }}
        />
      </div>
    );
  }

  const canSignOff = !!(data && data.can_sign_off) && can("sign_off_competency");

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 60px" }}>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>OPERATOR CERTIFICATIONS</h1>
      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 14 }}>
        Get certified to operate equipment — pass the written test <strong>and</strong> a hands-on practical evaluation. Earned certifications appear on the
        <strong> Certifications</strong> page with their expiration. Awareness courses and their tests live under <strong>Training</strong>.
      </div>

      {err && <div style={{ color: C.red, marginBottom: 10 }}>{err}</div>}
      {!data && !err && <div style={{ opacity: 0.7 }}>Loading certifications…</div>}

      {data &&
        data.certs.map((cert) => {
          const testReady = cert.test_passed;
          const certified = cert.certified;
          const focused = String(cert.id) === focusCertId; // v28.444 — the door's landing highlight
          return (
            <div
              key={cert.id}
              ref={focused ? focusRef : undefined}
              style={{
                background: C.cardBg,
                border: focused ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ flex: "1 1 260px" }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{cert.title}</div>
                  {cert.equipment_class && <div style={{ fontSize: 12, opacity: 0.65, marginTop: 2 }}>{cert.equipment_class}</div>}
                  {cert.standard_ref && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2 }}>{cert.standard_ref}</div>}
                </div>
                <Chip
                  ok={certified}
                  label={certified ? `CERTIFIED${cert.expiration_date ? ` · exp ${fmtDate(cert.expiration_date)}` : ""}` : "NOT CERTIFIED"}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>1. Written test:</span>
                <Chip ok={testReady} label={testReady ? "PASSED" : "NOT PASSED"} />
                {cert.test_id && (
                  <Btn small variant={testReady ? "ghost" : "solid"} onClick={() => setView({ mode: "take", testId: cert.test_id })}>
                    {testReady ? "RETAKE" : "TAKE TEST"}
                  </Btn>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>2. Practical evaluation:</span>
                {canSignOff ? (
                  <Btn small onClick={() => setView({ mode: "signoff", cert })}>
                    CONDUCT EVALUATION &amp; SIGN OFF
                  </Btn>
                ) : (
                  <span style={{ fontSize: 12, opacity: 0.6, fontStyle: "italic" }}>Conducted and signed by an authorized evaluator.</span>
                )}
              </div>

              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                Certified once the written test is passed and the practical evaluation is signed off
                {cert.recert_months
                  ? ` · re-certify every ${cert.recert_months % 12 === 0 ? `${cert.recert_months / 12} yr` : `${cert.recert_months} mo`}`
                  : ""}
                .
              </div>
            </div>
          );
        })}

      {view.mode === "signoff" && (
        <CompetencySignoffModal
          cert={view.cert}
          initialTraineeId={view.traineeId}
          onClose={() => setView({ mode: "list" })}
          onSigned={() => {
            setView({ mode: "list" });
            refresh();
          }}
        />
      )}
    </div>
  );
}

export default CompetencyPage;
