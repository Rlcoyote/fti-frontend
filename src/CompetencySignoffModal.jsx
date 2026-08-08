import { useState, useEffect } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { C } from "./config.js";
import { api } from "./api.js";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";

// ─── CompetencySignoffModal (v28.441) ───────────────────────────────────────
// The practical competency evaluation — the one new signed instrument. It
// reuses the JSA Path B ceremony verbatim in spirit: the trainee attests with
// their 4-digit PIN on the evaluator's device, and the EVALUATOR signs with
// their own WebAuthn biometric. On success the backend writes the evaluation
// evidence AND the earned safety_certs credential (issue + expiry) atomically.
//
// Gate order (Reggie #3): a trainee must have PASSED the paired written test
// before they can be selected here.

const PIN_LENGTH = 4;

function CompetencySignoffModal({ cert, onClose, onSigned, initialTraineeId }) {
  const [detail, setDetail] = useState(null); // full cert (checklist + attestations)
  const [candidates, setCandidates] = useState(null);
  const [loadErr, setLoadErr] = useState("");

  // v28.444 — the door can arrive with the trainee already picked (the
  // employee chosen in the Certifications add flow). Preselect, still
  // changeable — and every gate (test passed, PIN set) judges as usual.
  const [traineeId, setTraineeId] = useState(initialTraineeId || "");
  const [makeModel, setMakeModel] = useState("");
  const [serial, setSerial] = useState("");
  const [results, setResults] = useState({}); // { [n]: 'pass' | 'na' }
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null); // { expiration_date }

  useEffect(() => {
    let live = true;
    Promise.all([api.get(`/competency/certs/${cert.id}`), api.get(`/competency/certs/${cert.id}/candidates`)])
      .then(([d, c]) => {
        if (!live) return;
        setDetail(d);
        setCandidates(c);
      })
      .catch((e) => live && setLoadErr(e.message));
    return () => {
      live = false;
    };
  }, [cert.id]);

  const checklist = detail?.checklist || [];
  const allMarked = checklist.length > 0 && checklist.every((it) => results[it.n] === "pass" || results[it.n] === "na");
  const trainee = candidates?.find((c) => c.id === traineeId);
  const canSubmit = trainee && trainee.test_passed && trainee.has_pin && allMarked && pin.length === PIN_LENGTH && !busy;

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      // Evaluator biometric — fired inside the CONFIRM tap (user gesture).
      const opts = await api.post(`/competency/certs/${cert.id}/sign-options`, {});
      const assertion = await startAuthentication({ optionsJSON: opts.authentication_options });
      const res = await api.post(`/competency/certs/${cert.id}/signoff`, {
        trainee_user_id: traineeId,
        equipment_make_model: makeModel || null,
        equipment_serial: serial || null,
        checklist_results: checklist.map((it) => ({ n: it.n, result: results[it.n] })),
        trainee_pin: pin,
        evaluator_webauthn_response: assertion,
      });
      setDone({ expiration_date: res.expiration_date });
    } catch (e) {
      setError(e.message || "Sign-off failed");
      setBusy(false);
    }
  };

  const eligibleLabel = (c) => {
    if (!c.test_passed) return " — must pass written test first";
    if (!c.has_pin) return " — no PIN set (they must set one first)";
    if (c.certified) return " — already certified (this will re-certify)";
    return "";
  };

  return (
    <ModalWrap title={`Practical Evaluation — ${cert.title}`} onClose={onClose} width={560}>
      <div style={{ padding: "4px 2px 10px" }}>
        {loadErr && <div style={{ color: C.red, marginBottom: 10 }}>{loadErr}</div>}

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 6px" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.green }}>Certified</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
              {trainee?.name} is now certified on {cert.title}
              {done.expiration_date ? ` — expires ${new Date(done.expiration_date).toLocaleDateString("en-US")}` : ""}. It now appears on the Certifications
              (Safety) page.
            </div>
            <Btn onClick={onSigned} style={{ marginTop: 16 }}>
              DONE
            </Btn>
          </div>
        ) : !detail || !candidates ? (
          <div style={{ opacity: 0.7, padding: 12 }}>Loading…</div>
        ) : (
          <>
            {/* 1 — trainee */}
            <label style={labelStyle}>Trainee being evaluated</label>
            <select style={{ ...inputStyle, width: "100%" }} value={traineeId} onChange={(e) => setTraineeId(e.target.value)}>
              <option value="">Select an employee…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.test_passed || !c.has_pin}>
                  {c.name}
                  {eligibleLabel(c)}
                </option>
              ))}
            </select>

            {/* 2 — equipment */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
              <div style={{ flex: "1 1 220px" }}>
                <label style={labelStyle}>Equipment (make &amp; model)</label>
                <input style={{ ...inputStyle, width: "100%" }} value={makeModel} onChange={(e) => setMakeModel(e.target.value)} placeholder="e.g. JLG 600AJ" />
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <label style={labelStyle}>Unit / serial no.</label>
                <input style={{ ...inputStyle, width: "100%" }} value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="optional" />
              </div>
            </div>

            {/* 3 — checklist */}
            <label style={{ ...labelStyle, marginTop: 14 }}>
              Performance requirements — mark each Pass or N/A ({checklist.filter((it) => results[it.n]).length}/{checklist.length})
            </label>
            <div style={{ maxHeight: 300, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8 }}>
              {checklist.map((it) => (
                <div key={it.n} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1, fontSize: 12.5 }}>
                    <strong>{it.n}.</strong> {it.text}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["pass", "na"].map((r) => {
                      const sel = results[it.n] === r;
                      const good = r === "pass";
                      return (
                        <button
                          key={r}
                          className="fti-btn"
                          onClick={() => setResults((s) => ({ ...s, [it.n]: r }))}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            border: `1.5px solid ${sel ? (good ? C.green : C.muted || C.text) : C.border}`,
                            background: sel ? (good ? `${C.green}22` : `${C.text}14`) : C.cardBg,
                            color: sel ? (good ? C.green : C.text) : C.text,
                          }}
                        >
                          {good ? "PASS" : "N/A"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 4 — trainee PIN */}
            <label style={{ ...labelStyle, marginTop: 14 }}>Trainee's 4-digit PIN (they enter it on this device)</label>
            <input
              style={{ ...inputStyle, width: 160, letterSpacing: 6, fontSize: 20, textAlign: "center" }}
              inputMode="numeric"
              type="password"
              maxLength={PIN_LENGTH}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
              placeholder={"•".repeat(PIN_LENGTH)}
            />

            {/* attestations */}
            <div style={{ fontSize: 11, opacity: 0.6, marginTop: 12, lineHeight: 1.5 }}>
              <div>{detail.attestation_trainee}</div>
              <div style={{ marginTop: 6 }}>{detail.attestation_evaluator}</div>
            </div>

            {error && <div style={{ color: C.red, marginTop: 10, fontWeight: 700, fontSize: 13 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" onClick={onClose} disabled={busy}>
                CANCEL
              </Btn>
              <Btn onClick={submit} disabled={!canSubmit} style={{ flex: 1, fontWeight: 800 }}>
                {busy ? "SIGNING…" : "SIGN & CERTIFY (EVALUATOR BIOMETRIC)"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </ModalWrap>
  );
}

export default CompetencySignoffModal;
