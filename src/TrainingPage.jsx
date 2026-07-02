import { useState, useEffect, useCallback } from "react";
import { C } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";

// ─── TrainingPage (v28.251) ──────────────────────────────────────────────────
// Policy knowledge tests — one per PPM policy/program (37 at launch). Backend
// is routes/training.js (v28.250): questions arrive WITHOUT answer keys;
// grading is server-side; a completed attempt's review (with correct answers)
// is the only surface that shows the key.
//
// Views: MY TRAINING (every employee) — test list → take → graded result →
// review (+ PRINT, PublicSignPage no-print pattern). ALL EMPLOYEES (gated
// can("view_all_training")) — per-employee pass/total with per-test drill-in.
// Mobile-first stacked cards, big touch targets (Articles XIV + XV).

const PASS_GREEN = "#0f3d22";
const FAIL_RED = "#3d0f0f";
const LETTERS = ["A", "B", "C", "D"];

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
}
function pct(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)}%` : "—";
}

// Status chip shared by the list rows and the grid drill-in (one home for the
// pass/fail/not-taken visual rule — Anti-Pattern Candidate 7).
function StatusChip({ passed, score, when }) {
  if (passed === null || passed === undefined) {
    return (
      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: C.text,
          opacity: 0.55,
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          padding: "3px 8px",
          whiteSpace: "nowrap",
        }}
      >
        NOT TAKEN
      </span>
    );
  }
  const good = passed === true;
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: good ? C.green : C.red,
        border: `1px solid ${good ? C.green : C.red}66`,
        background: good ? `${C.green}18` : `${C.red}18`,
        borderRadius: 6,
        padding: "3px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {good ? "PASSED" : "FAILED"} {pct(score)}
      {when ? ` · ${fmtDate(when)}` : ""}
    </span>
  );
}

// ─── Take-test view ──────────────────────────────────────────────────────────
function TakeTest({ testId, onDone, onCancel }) {
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [busy, setBusy] = useState(false);
  // v28.255 — load error and submit error are SEPARATE states. The original
  // used one `err` for both, and the early-return error render meant a failed
  // SUBMIT blanked the whole test (Reggie hit this on the v28.254 submit bug:
  // answers gone, just "failed to submit test" at the top). A submit failure
  // now keeps every answer on screen and the button live for a retry.
  const [loadErr, setLoadErr] = useState(null);
  const [submitErr, setSubmitErr] = useState(null);

  useEffect(() => {
    api
      .get(`/training/tests/${testId}`)
      .then(setTest)
      .catch((e) => setLoadErr(e.message));
  }, [testId]);

  if (loadErr) return <div style={{ color: C.red, padding: 20 }}>{loadErr}</div>;
  if (!test) return <div style={{ padding: 20, opacity: 0.7 }}>Loading test…</div>;

  const total = test.questions.length;
  const answered = test.questions.filter((q) => answers[q.n] !== undefined).length;
  const allAnswered = answered === total;

  const submit = async () => {
    setBusy(true);
    setSubmitErr(null);
    try {
      const result = await api.post(`/training/tests/${testId}/submit`, { answers });
      onDone(result);
    } catch (e) {
      setSubmitErr(`Your test could not be submitted (${e.message}). Your answers are still here — press SUBMIT TEST to try again.`);
      setBusy(false);
    }
  };

  const optBtn = (q, value, label) => {
    const sel = answers[q.n] === value;
    return (
      <button
        key={String(value)}
        onClick={() => setAnswers((a) => ({ ...a, [q.n]: value }))}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          marginTop: 6,
          borderRadius: 8,
          border: `2px solid ${sel ? C.blue : C.border}`,
          background: sel ? `${C.blue}22` : C.cardBg,
          color: C.text,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{test.title}</h2>
        <button
          onClick={onCancel}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
        >
          CANCEL
        </button>
      </div>
      <div style={{ margin: "6px 0 14px", fontSize: 13, opacity: 0.7 }}>
        Passing score: {test.pass_pct}% · Answered {answered} of {total}
      </div>
      {test.questions.map((q) => (
        <div key={q.n} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            {q.n}. {q.question}
          </div>
          {q.type === "mc" ? q.options.map((opt, i) => optBtn(q, i, `${LETTERS[i]}.  ${opt}`)) : [optBtn(q, true, "True"), optBtn(q, false, "False")]}
        </div>
      ))}
      {submitErr && (
        <div
          style={{
            color: C.red,
            border: `1px solid ${C.red}66`,
            background: `${C.red}18`,
            borderRadius: 8,
            padding: "10px 12px",
            marginBottom: 10,
            fontWeight: 700,
          }}
        >
          {submitErr}
        </div>
      )}
      <button
        onClick={submit}
        disabled={!allAnswered || busy}
        style={{
          width: "100%",
          padding: "14px 0",
          fontSize: 16,
          fontWeight: 800,
          borderRadius: 10,
          border: "none",
          cursor: allAnswered && !busy ? "pointer" : "not-allowed",
          background: allAnswered ? C.green : C.border,
          color: C.white,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? "GRADING…" : allAnswered ? "SUBMIT TEST" : `ANSWER ALL QUESTIONS (${total - answered} LEFT)`}
      </button>
    </div>
  );
}

// ─── Attempt review (own or management) — printable ─────────────────────────
function AttemptReview({ attemptId, onBack }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api
      .get(`/training/attempts/${attemptId}`)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [attemptId]);

  if (err) return <div style={{ color: C.red, padding: 20 }}>{err}</div>;
  if (!data) return <div style={{ padding: 20, opacity: 0.7 }}>Loading…</div>;

  const good = data.passed === true;
  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } .training-print { color: #000 !important; } .training-print * { color: #000 !important; border-color: #999 !important; background: #fff !important; } @page { size: letter; margin: 0.5in; } }`}</style>
      <div className="no-print" style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}
        >
          ← BACK
        </button>
        <button
          onClick={() => window.print()}
          style={{ background: C.blue, border: "none", color: C.white, borderRadius: 8, padding: "8px 14px", fontWeight: 700, cursor: "pointer" }}
        >
          PRINT
        </button>
      </div>
      <div className="training-print">
        <h2 style={{ margin: "0 0 2px", fontSize: 18 }}>{data.title} — Policy Knowledge Test</h2>
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
          {data.user_name || "Employee"} · {fmtDate(data.completed_at)} · Flo-Test, Inc.
        </div>
        <div
          style={{
            background: good ? PASS_GREEN : FAIL_RED,
            border: `2px solid ${good ? C.green : C.red}`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            fontWeight: 800,
            fontSize: 16,
            color: good ? C.green : C.red,
          }}
        >
          {good ? "PASSED" : "FAILED"} — {data.correct_count} of {data.question_count} correct ({pct(data.score_pct)}; passing {data.pass_pct}%)
        </div>
        {data.review.map((q) => {
          const giveLabel =
            q.type === "mc"
              ? Number.isInteger(q.given)
                ? `${LETTERS[q.given]}. ${q.options[q.given]}`
                : "—"
              : q.given === true
                ? "True"
                : q.given === false
                  ? "False"
                  : "—";
          const correctLabel = q.type === "mc" ? `${LETTERS[q.correct]}. ${q.options[q.correct]}` : q.correct ? "True" : "False";
          return (
            <div
              key={q.n}
              style={{ background: C.cardBg, border: `1px solid ${q.is_correct ? C.border : C.red}`, borderRadius: 10, padding: 12, marginBottom: 10 }}
            >
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {q.n}. {q.question}
              </div>
              <div style={{ fontSize: 13, marginTop: 6, color: q.is_correct ? C.green : C.red, fontWeight: 700 }}>
                {q.is_correct ? "✓" : "✗"} Your answer: {giveLabel}
              </div>
              {!q.is_correct && <div style={{ fontSize: 13, marginTop: 2, color: C.green, fontWeight: 700 }}>Correct answer: {correctLabel}</div>}
              {/* v28.255 — the teaching moment (Reggie): a missed question shows
                  the answer straight from the PPM so the retest is studied, not
                  guessed. Correct answers stay uncluttered. */}
              {!q.is_correct && q.ref && (
                <div
                  style={{
                    fontSize: 12.5,
                    marginTop: 8,
                    padding: "8px 10px",
                    borderLeft: `3px solid ${C.blue}`,
                    background: `${C.blue}12`,
                    borderRadius: "0 6px 6px 0",
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ fontWeight: 800, color: C.blue }}>FROM THE POLICY MANUAL: </span>
                  {q.ref}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Management grid — every employee × every test ──────────────────────────
function ResultsGrid({ onViewAttempt }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState(null);
  const [openUser, setOpenUser] = useState(null);

  useEffect(() => {
    api
      .get(`/training/results`)
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: C.red, padding: 20 }}>{err}</div>;
  if (!rows) return <div style={{ padding: 20, opacity: 0.7 }}>Loading results…</div>;

  // group rows (user × test) by user
  const byUser = new Map();
  rows.forEach((r) => {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, { name: r.user_name, role: r.role, tests: [] });
    byUser.get(r.user_id).tests.push(r);
  });

  return (
    <div>
      {[...byUser.entries()].map(([uid, u]) => {
        const passed = u.tests.filter((t) => t.passed === true).length;
        const isOpen = openUser === uid;
        const allPassed = passed === u.tests.length;
        return (
          <div key={uid} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
            <div
              onClick={() => setOpenUser(isOpen ? null : uid)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                padding: "12px 14px",
                cursor: "pointer",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                {u.name} <span style={{ fontWeight: 400, fontSize: 12, opacity: 0.6, textTransform: "uppercase" }}>{u.role}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: allPassed ? C.green : C.text }}>
                  {passed} / {u.tests.length} PASSED
                </span>
                <span style={{ opacity: 0.6 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}` }}>
                {u.tests.map((t) => (
                  <div
                    key={t.test_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      padding: "9px 14px",
                      borderTop: `1px solid ${C.border}33`,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 13, flex: "1 1 220px" }}>{t.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {t.attempts > 0 && (
                        <span style={{ fontSize: 11, opacity: 0.55 }}>
                          {t.attempts} attempt{t.attempts === 1 ? "" : "s"}
                        </span>
                      )}
                      <StatusChip passed={t.passed} score={t.score_pct} when={t.completed_at} />
                      {t.attempt_id && (
                        <button
                          onClick={() => onViewAttempt(t.attempt_id)}
                          style={{
                            background: "none",
                            border: `1px solid ${C.blue}`,
                            color: C.blue,
                            borderRadius: 6,
                            padding: "3px 10px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          VIEW
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
function TrainingPage() {
  const { can } = useApp();
  const [tab, setTab] = useState("mine"); // mine | all
  const [view, setView] = useState({ mode: "list" }); // list | take | result | review
  const [tests, setTests] = useState(null);
  const [err, setErr] = useState(null);

  const refresh = useCallback(() => {
    api
      .get(`/training/tests`)
      .then(setTests)
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tabBtn = (key, label) => (
    <button
      onClick={() => {
        setTab(key);
        setView({ mode: "list" });
      }}
      style={{
        padding: "10px 18px",
        fontSize: 14,
        fontWeight: 800,
        borderRadius: 8,
        border: `2px solid ${tab === key ? C.red : C.border}`,
        background: tab === key ? `${C.red}22` : "none",
        color: C.text,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "18px 14px 60px" }}>
      {view.mode === "list" && (
        <>
          <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>TRAINING</h1>
          <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 14 }}>
            Policy knowledge tests from the Flo-Test Policies &amp; Procedures Manual. Passing score is 80%.
          </div>
          {can("view_all_training") && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {tabBtn("mine", "MY TRAINING")}
              {tabBtn("all", "ALL EMPLOYEES")}
            </div>
          )}
        </>
      )}

      {view.mode === "take" && (
        <TakeTest
          testId={view.testId}
          onCancel={() => setView({ mode: "list" })}
          onDone={(result) => {
            refresh();
            setView({ mode: "review", attemptId: result.attempt_id });
          }}
        />
      )}
      {view.mode === "review" && (
        <AttemptReview
          attemptId={view.attemptId}
          onBack={() => {
            setTab((t) => t);
            setView({ mode: "list" });
          }}
        />
      )}

      {view.mode === "list" && tab === "all" && can("view_all_training") && (
        <ResultsGrid onViewAttempt={(attemptId) => setView({ mode: "review", attemptId })} />
      )}

      {view.mode === "list" && tab === "mine" && (
        <>
          {err && <div style={{ color: C.red, marginBottom: 10 }}>{err}</div>}
          {!tests && !err && <div style={{ opacity: 0.7 }}>Loading tests…</div>}
          {tests &&
            tests.map((t) => (
              <div
                key={t.id}
                style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 240px" }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                    {t.question_count} questions{t.attempts > 0 ? ` · ${t.attempts} attempt${t.attempts === 1 ? "" : "s"}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <StatusChip passed={t.last_passed} score={t.last_score_pct} when={t.last_completed_at} />
                  {t.last_attempt_id && (
                    <button
                      onClick={() => setView({ mode: "review", attemptId: t.last_attempt_id })}
                      style={{
                        background: "none",
                        border: `1px solid ${C.blue}`,
                        color: C.blue,
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      VIEW
                    </button>
                  )}
                  <button
                    onClick={() => setView({ mode: "take", testId: t.id })}
                    style={{
                      background: C.red,
                      border: "none",
                      color: C.white,
                      borderRadius: 8,
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {t.last_attempt_id ? "RETAKE" : "TAKE TEST"}
                  </button>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

export default TrainingPage;
