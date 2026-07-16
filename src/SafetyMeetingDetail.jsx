import { useState, useEffect, useCallback } from "react";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";
import { Btn, ModalWrap, ConfirmModal, inputStyle, labelStyle } from "./SharedUI.jsx";
import { AttendanceRow, MeetingStatusChip, fmtMeetingDate, fmtMeetingTime } from "./SafetyMeetingShared.jsx";
import SafetyMeetingSignModal from "./SafetyMeetingSignModal.jsx";

// ─── SafetyMeetingDetail (v28.335) ───────────────────────────────────────────
// One meeting: header + lock state, topics (random picker / bank / free-form),
// attendance (biometric self sign-in, manager override-with-reason, typed rows
// for backfill/historical, visitors), Q&A pulls, the Tuesday recap (open
// Action Items, REQUIRED and TO-DO under separate headings), equipment needs,
// notes. Content edit is open to everyone (JSA doctrine — the audit trail
// carries changes); attestation rows are append-only; delete is admin.

const sectionStyle = { background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, marginBottom: SP.xl, overflow: "hidden" };
const sectionHead = { padding: `${SP.lg}px ${SP.xl}px`, fontWeight: 800, fontSize: F.md, color: C.text, borderBottom: `1px solid ${C.border}` };
const emptyNote = { padding: `${SP.lg}px ${SP.xl}px`, fontSize: F.meta, color: C.muted };

function Section({ title, right, children }) {
  return (
    <div style={sectionStyle}>
      <div style={{ ...sectionHead, display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.md, flexWrap: "wrap" }}>
        <span>{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

// ─── Manager override sign-in (JSA override logic: reason required) ─────────
function OverrideSignInModal({ meeting, onClose, onDone }) {
  const { userNames, userIdByName, currentUser } = useApp();
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alreadyIn = new Set(meeting.attendance.filter((a) => a.user_name).map((a) => a.user_name));
  const candidates = userNames.filter((n) => !alreadyIn.has(n) && n !== currentUser.name);

  const submit = async () => {
    if (!name || !reason.trim()) {
      setError("Pick the person and give the reason — both are required");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post(`/safety-meetings/${meeting.id}/override-signin`, { user_id: userIdByName[name], reason: reason.trim() });
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ModalWrap title="Manager Sign-In (With Reason)" onClose={onClose} width={460}>
      <div style={{ fontSize: F.meta, color: C.muted, marginBottom: SP.xl, lineHeight: 1.5 }}>
        For someone who attended but did not sign in themselves. The record shows who added them and why — it is never presented as their biometric signature.
      </div>
      <label style={labelStyle}>WHO ATTENDED</label>
      <select value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: SP.xl }}>
        <option value="">— Select person —</option>
        {candidates.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <label style={labelStyle}>REASON (REQUIRED)</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="e.g. Was at the meeting but left for a call-out before sign-in"
        style={{ ...inputStyle, resize: "vertical", marginBottom: SP.xl }}
      />
      {error && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.lg }}>{error}</div>}
      <div style={{ display: "flex", gap: SP.md }}>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "ADDING…" : "ADD TO ATTENDANCE"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

// ─── Edit meeting header fields (content edit — open to everyone) ───────────
function EditMeetingModal({ meeting, onClose, onSaved }) {
  const { userNames, userIdByName } = useApp();
  const [date, setDate] = useState(String(meeting.meeting_date).slice(0, 10));
  const [start, setStart] = useState(String(meeting.start_time).slice(0, 5));
  const [end, setEnd] = useState(String(meeting.end_time).slice(0, 5));
  const [conductor, setConductor] = useState(meeting.conducted_by_name || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const body = { meeting_date: date, start_time: start, end_time: end };
      if (conductor && userIdByName[conductor]) body.conducted_by = userIdByName[conductor];
      await api.put(`/safety-meetings/${meeting.id}`, body);
      onSaved();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ModalWrap title="Edit Meeting" onClose={onClose} width={440}>
      <div style={{ fontSize: F.meta, color: C.muted, marginBottom: SP.xl }}>Every change is recorded in the audit trail.</div>
      <label style={labelStyle}>MEETING DATE</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: SP.lg }} />
      <div style={{ display: "flex", gap: SP.md }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>START</label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>END</label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} style={inputStyle} />
        </div>
      </div>
      <label style={{ ...labelStyle, marginTop: SP.lg }}>CONDUCTED BY</label>
      <select value={conductor} onChange={(e) => setConductor(e.target.value)} style={{ ...inputStyle, marginBottom: SP.xl }}>
        {userNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {error && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.lg }}>{error}</div>}
      <div style={{ display: "flex", gap: SP.md }}>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "SAVING…" : "SAVE CHANGES"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

// ─── The page body ───────────────────────────────────────────────────────────
function SafetyMeetingDetail({ meetingId, onBack }) {
  const { currentUser, can, userNames, userIdByName } = useApp();
  const [meeting, setMeeting] = useState(null);
  const [err, setErr] = useState(null);
  const [bank, setBank] = useState([]);
  const [modal, setModal] = useState(null); // sign | override | edit | delete
  const [actionErr, setActionErr] = useState("");

  // topic add state
  const [bankPick, setBankPick] = useState("");
  const [freeTopic, setFreeTopic] = useState("");
  // typed attendance state
  const [typedName, setTypedName] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [visitorCompany, setVisitorCompany] = useState("");
  // Q&A transient reveal state
  const [pulled, setPulled] = useState([]);
  const [revealed, setRevealed] = useState({});
  // equipment need state
  const [needTitle, setNeedTitle] = useState("");
  const [needAssignee, setNeedAssignee] = useState("");
  const [needCategory, setNeedCategory] = useState("required");
  // notes
  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);

  const refresh = useCallback(() => {
    api
      .get(`/safety-meetings/${meetingId}`)
      .then((m) => {
        setMeeting(m);
        setNotes(m.notes || "");
        setNotesDirty(false);
      })
      .catch((e) => setErr(e.message));
  }, [meetingId]);

  useEffect(() => {
    refresh();
    api
      .get(`/safety-meetings/topics`)
      .then(setBank)
      .catch(() => {});
  }, [refresh]);

  if (err) return <div style={{ color: C.red, padding: SP.gutter }}>{err}</div>;
  if (!meeting) return <div style={{ padding: SP.gutter, color: C.muted }}>Loading meeting…</div>;

  const isPaperMode = meeting.is_backfill || meeting.is_historical;
  const isOpen = !meeting.closed_at && !isPaperMode;
  const canClose = can("safety_meeting_close") || meeting.conducted_by === currentUser.id;
  const iAmSignedIn = meeting.attendance.some((a) => a.user_id === currentUser.id);
  const onMeetingBankIds = meeting.topics.filter((t) => t.topic_id).map((t) => t.topic_id);

  const act = (fn) => async () => {
    setActionErr("");
    try {
      await fn();
      refresh();
    } catch (e) {
      setActionErr(e.message);
    }
  };

  const addBankTopic = act(async () => {
    if (!bankPick) return;
    await api.post(`/safety-meetings/${meeting.id}/topics`, { topic_id: Number(bankPick) });
    setBankPick("");
  });
  const addRandomTopic = act(async () => {
    const picks = await api.get(`/safety-meetings/topics/random?count=1&exclude=${onMeetingBankIds.join(",")}`);
    if (!picks.length) throw new Error("The topic bank is empty — add topics from the PPM first");
    await api.post(`/safety-meetings/${meeting.id}/topics`, { topic_id: picks[0].id });
  });
  const addFreeTopic = act(async () => {
    if (!freeTopic.trim()) return;
    await api.post(`/safety-meetings/${meeting.id}/topics`, { title: freeTopic.trim() });
    setFreeTopic("");
  });
  const removeTopic = (rowId) => act(async () => api.del(`/safety-meetings/${meeting.id}/topics/${rowId}`))();
  const addTypedEmployee = act(async () => {
    if (!typedName) return;
    await api.post(`/safety-meetings/${meeting.id}/attendance-typed`, { user_id: userIdByName[typedName] });
    setTypedName("");
  });
  const addVisitor = act(async () => {
    if (!visitorName.trim()) return;
    await api.post(`/safety-meetings/${meeting.id}/attendance-typed`, { external_name: visitorName.trim(), external_company: visitorCompany.trim() });
    setVisitorName("");
    setVisitorCompany("");
  });
  const removeAttendance = (rowId) => act(async () => api.del(`/safety-meetings/${meeting.id}/attendance/${rowId}`))();
  const pullQuestions = async () => {
    setActionErr("");
    try {
      const qs = await api.post(`/safety-meetings/${meeting.id}/questions`, { count: 3 });
      setPulled(qs);
      setRevealed({});
      refresh();
    } catch (e) {
      setActionErr(e.message);
    }
  };
  const addEquipmentNeed = act(async () => {
    if (!needTitle.trim() || !needAssignee) throw new Error("Equipment need and its owner are both required");
    await api.post(`/safety-meetings/${meeting.id}/equipment-needs`, {
      title: needTitle.trim(),
      assigned_to: userIdByName[needAssignee],
      category: needCategory,
    });
    setNeedTitle("");
    setNeedAssignee("");
    setNeedCategory("required");
  });
  const saveNotes = act(async () => api.put(`/safety-meetings/${meeting.id}`, { notes }));
  const closeMeeting = act(async () => api.post(`/safety-meetings/${meeting.id}/close`, {}));
  const reopenMeeting = act(async () => api.post(`/safety-meetings/${meeting.id}/reopen`, {}));

  const requiredItems = meeting.open_action_items.filter((t) => t.category !== "todo");
  const todoItems = meeting.open_action_items.filter((t) => t.category === "todo");
  const recapRow = (t) => (
    <div
      key={t.id}
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: SP.md,
        padding: `${SP.sm}px ${SP.xl}px`,
        borderTop: `1px solid ${C.border}33`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontSize: F.body, color: C.text, flex: "1 1 200px" }}>{t.title}</div>
      <div style={{ fontSize: F.label, color: C.muted, whiteSpace: "nowrap" }}>
        {t.assigned_to_name || "unassigned"} · since {fmtMeetingDate(t.created_at)}
      </div>
    </div>
  );

  return (
    <div>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: SP.lg, flexWrap: "wrap", marginBottom: SP.md }}>
        <Btn variant="ghost" small onClick={onBack}>
          ← ALL MEETINGS
        </Btn>
        <h2 style={{ margin: 0, fontSize: F.h3, color: C.text }}>
          SAFETY MEETING — {fmtMeetingDate(meeting.meeting_date)}, {fmtMeetingTime(meeting.start_time)}–{fmtMeetingTime(meeting.end_time)}
        </h2>
        <MeetingStatusChip meeting={meeting} />
      </div>
      <div style={{ fontSize: F.body, color: C.muted, marginBottom: SP.xl }}>
        Conducted by <strong style={{ color: C.text }}>{meeting.conducted_by_name}</strong> · created by {meeting.created_by_name}
        {meeting.closed_at && meeting.close_method === "manual" && meeting.closed_by_name ? ` · closed by ${meeting.closed_by_name}` : ""}
      </div>

      {/* ACTION BAR */}
      <div style={{ display: "flex", gap: SP.md, flexWrap: "wrap", marginBottom: SP.xxl }}>
        {isOpen && !iAmSignedIn && <Btn onClick={() => setModal("sign")}>SIGN IN — I'M HERE</Btn>}
        {!isPaperMode && can("safety_meeting_override_signin") && (
          <Btn variant="ghost" small onClick={() => setModal("override")}>
            MANAGER SIGN-IN
          </Btn>
        )}
        <Btn variant="ghost" small onClick={() => setModal("edit")}>
          EDIT MEETING
        </Btn>
        {isOpen && canClose && (
          <Btn variant="ghost" small onClick={closeMeeting}>
            CLOSE MEETING
          </Btn>
        )}
        {!isPaperMode && meeting.closed_at && canClose && (
          <Btn variant="ghost" small onClick={reopenMeeting}>
            REOPEN
          </Btn>
        )}
        {can("safety_meeting_delete") && (
          <Btn variant="danger" small onClick={() => setModal("delete")}>
            DELETE
          </Btn>
        )}
      </div>
      {actionErr && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.xl }}>{actionErr}</div>}

      {/* ATTENDANCE */}
      <Section title={`ATTENDANCE (${meeting.attendance.length})`}>
        {meeting.attendance.length === 0 && <div style={emptyNote}>Nobody has signed in yet.</div>}
        {meeting.attendance.map((row) => (
          <div key={row.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <AttendanceRow row={row} />
            </div>
            {can("safety_meeting_delete") && (
              <button
                onClick={() => removeAttendance(row.id)}
                title="Remove row (admin — audit-logged)"
                style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: F.md, padding: SP.md }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {isPaperMode && (
          <div
            style={{
              padding: `${SP.lg}px ${SP.xl}px`,
              borderTop: `1px solid ${C.border}`,
              display: "flex",
              gap: SP.md,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <select
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              style={{ ...inputStyle, width: "auto", flex: "1 1 160px", marginBottom: 0 }}
            >
              <option value="">— Employee from paper sheet —</option>
              {userNames
                .filter((n) => !meeting.attendance.some((a) => a.user_name === n))
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
            <Btn small onClick={addTypedEmployee} disabled={!typedName}>
              ADD FROM PAPER RECORD
            </Btn>
          </div>
        )}
        <div
          style={{ padding: `${SP.lg}px ${SP.xl}px`, borderTop: `1px solid ${C.border}`, display: "flex", gap: SP.md, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            placeholder="Visitor name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "1 1 140px", marginBottom: 0 }}
          />
          <input
            placeholder="Company"
            value={visitorCompany}
            onChange={(e) => setVisitorCompany(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "1 1 140px", marginBottom: 0 }}
          />
          <Btn small variant="ghost" onClick={addVisitor} disabled={!visitorName.trim()}>
            ADD VISITOR
          </Btn>
        </div>
      </Section>

      {/* TOPICS */}
      <Section title="TOPICS COVERED">
        {meeting.topics.length === 0 && <div style={emptyNote}>No topics yet — pull a random one from the bank.</div>}
        {meeting.topics.map((t) => (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: SP.md,
              padding: `${SP.md}px ${SP.xl}px`,
              borderTop: `1px solid ${C.border}33`,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: F.md, color: C.text }}>{t.title}</div>
              {t.ppm_reference && <div style={{ fontSize: F.label, color: C.blue }}>{t.ppm_reference}</div>}
            </div>
            <button
              onClick={() => removeTopic(t.id)}
              title="Remove topic (audit-logged)"
              style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: F.md }}
            >
              ✕
            </button>
          </div>
        ))}
        <div
          style={{ padding: `${SP.lg}px ${SP.xl}px`, borderTop: `1px solid ${C.border}`, display: "flex", gap: SP.md, flexWrap: "wrap", alignItems: "center" }}
        >
          <Btn small onClick={addRandomTopic}>
            🎲 RANDOM TOPIC
          </Btn>
          <select value={bankPick} onChange={(e) => setBankPick(e.target.value)} style={{ ...inputStyle, width: "auto", flex: "1 1 180px", marginBottom: 0 }}>
            <option value="">— Pick from the bank —</option>
            {bank
              .filter((b) => !onMeetingBankIds.includes(b.id))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                  {b.ppm_reference ? ` (${b.ppm_reference})` : ""}
                </option>
              ))}
          </select>
          <Btn small variant="ghost" onClick={addBankTopic} disabled={!bankPick}>
            ADD
          </Btn>
        </div>
        <div style={{ padding: `0 ${SP.xl}px ${SP.lg}px`, display: "flex", gap: SP.md, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Or type a topic discussed…"
            value={freeTopic}
            onChange={(e) => setFreeTopic(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "1 1 220px", marginBottom: 0 }}
          />
          <Btn small variant="ghost" onClick={addFreeTopic} disabled={!freeTopic.trim()}>
            ADD TOPIC
          </Btn>
        </div>
      </Section>

      {/* Q&A */}
      <Section
        title="POLICY QUESTIONS (Q&A)"
        right={
          <Btn small onClick={pullQuestions}>
            PULL 3 QUESTIONS
          </Btn>
        }
      >
        {pulled.length === 0 && meeting.questions.length === 0 && (
          <div style={emptyNote}>Pull random questions from the training bank and quiz the crew out loud.</div>
        )}
        {pulled.map((q) => (
          <div key={q.row_id} style={{ padding: `${SP.md}px ${SP.xl}px`, borderTop: `1px solid ${C.border}33` }}>
            <div style={{ fontWeight: 700, fontSize: F.md, color: C.text }}>{q.question}</div>
            {q.type === "mc" && q.options && (
              <div style={{ fontSize: F.meta, color: C.muted, marginTop: 2 }}>{q.options.map((o, i) => `${"ABCD"[i]}. ${o}`).join("   ")}</div>
            )}
            {revealed[q.row_id] ? (
              <div style={{ fontSize: F.meta, color: C.green, fontWeight: 700, marginTop: SP.sm }}>
                ANSWER: {q.type === "mc" ? `${"ABCD"[q.answer]}. ${q.options[q.answer]}` : q.answer ? "True" : "False"}
                {q.ref && <div style={{ color: C.blue, fontWeight: 400, marginTop: 2 }}>FROM THE POLICY MANUAL: {q.ref}</div>}
              </div>
            ) : (
              <Btn small variant="ghost" onClick={() => setRevealed((r) => ({ ...r, [q.row_id]: true }))} style={{ marginTop: SP.sm }}>
                REVEAL ANSWER
              </Btn>
            )}
          </div>
        ))}
        {meeting.questions.filter((mq) => !pulled.some((p) => p.row_id === mq.id)).length > 0 && (
          <div style={{ padding: `${SP.md}px ${SP.xl}px`, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: F.label, color: C.muted, fontWeight: 800, marginBottom: SP.sm }}>ASKED AT THIS MEETING</div>
            {meeting.questions
              .filter((mq) => !pulled.some((p) => p.row_id === mq.id))
              .map((mq) => (
                <div key={mq.id} style={{ fontSize: F.meta, color: C.text, padding: `${SP.xxs}px 0` }}>
                  {mq.asked_order}. {mq.question_text}
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* ROLL-FORWARD RECAP */}
      <Section title="OPEN ACTION ITEMS — READ OUT EVERY TUESDAY UNTIL CLOSED">
        {requiredItems.length === 0 && todoItems.length === 0 && <div style={emptyNote}>Nothing outstanding. Clean board.</div>}
        {requiredItems.length > 0 && <div style={{ padding: `${SP.sm}px ${SP.xl}px 0`, fontSize: F.label, fontWeight: 800, color: C.red }}>REQUIRED</div>}
        {requiredItems.map(recapRow)}
        {todoItems.length > 0 && <div style={{ padding: `${SP.sm}px ${SP.xl}px 0`, fontSize: F.label, fontWeight: 800, color: C.muted }}>TO-DO</div>}
        {todoItems.map(recapRow)}
        <div
          style={{ padding: `${SP.lg}px ${SP.xl}px`, borderTop: `1px solid ${C.border}`, display: "flex", gap: SP.md, flexWrap: "wrap", alignItems: "center" }}
        >
          <input
            placeholder="Equipment need / new action item…"
            value={needTitle}
            onChange={(e) => setNeedTitle(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "2 1 200px", marginBottom: 0 }}
          />
          <select
            value={needAssignee}
            onChange={(e) => setNeedAssignee(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "1 1 130px", marginBottom: 0 }}
          >
            <option value="">— Owner —</option>
            {userNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select
            value={needCategory}
            onChange={(e) => setNeedCategory(e.target.value)}
            style={{ ...inputStyle, width: "auto", flex: "0 1 120px", marginBottom: 0 }}
          >
            <option value="required">REQUIRED</option>
            <option value="todo">TO-DO</option>
          </select>
          <Btn small onClick={addEquipmentNeed} disabled={!needTitle.trim() || !needAssignee}>
            ADD
          </Btn>
        </div>
      </Section>

      {/* NOTES */}
      <Section
        title="NOTES"
        right={
          notesDirty ? (
            <Btn small onClick={saveNotes}>
              SAVE NOTES
            </Btn>
          ) : null
        }
      >
        <div style={{ padding: SP.xl }}>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
            rows={4}
            placeholder="Anything discussed that isn't a topic-bank item…"
            style={{ ...inputStyle, resize: "vertical", marginBottom: 0 }}
          />
        </div>
      </Section>

      {/* MODALS */}
      {modal === "sign" && (
        <SafetyMeetingSignModal
          meeting={meeting}
          onClose={() => setModal(null)}
          onSigned={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal === "override" && (
        <OverrideSignInModal
          meeting={meeting}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal === "edit" && (
        <EditMeetingModal
          meeting={meeting}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            refresh();
          }}
        />
      )}
      {modal === "delete" && (
        <ConfirmModal
          title="Delete this meeting?"
          message={`The meeting record of ${fmtMeetingDate(meeting.meeting_date)} and its ${meeting.attendance.length} attendance rows will be permanently deleted. This is audit-logged.`}
          yesLabel="DELETE MEETING"
          onYes={async () => {
            try {
              await api.del(`/safety-meetings/${meeting.id}`);
              onBack();
            } catch (e) {
              setActionErr(e.message);
              setModal(null);
            }
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}

export default SafetyMeetingDetail;
