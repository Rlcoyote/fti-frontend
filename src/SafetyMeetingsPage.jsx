import { useState, useEffect, useCallback } from "react";
import { C, F, SP, R } from "./config.js";
import { api } from "./api.js";
import { useApp } from "./AppContext.jsx";
import { Btn, ModalWrap, inputStyle, labelStyle } from "./SharedUI.jsx";
import { MeetingStatusChip, fmtMeetingDate, fmtMeetingTime } from "./SafetyMeetingShared.jsx";
import SafetyMeetingDetail from "./SafetyMeetingDetail.jsx";

// ─── SafetyMeetingsPage (v28.335) ────────────────────────────────────────────
// Top-level page, visible to everyone (spec §8b.7 — field hands sign in here).
// List of meetings newest-first + NEW MEETING (open to all, created_by always
// recorded — "I want it to feel all inclusive"). Detail view handles the rest.

function todayISO() {
  const now = new Date();
  const tz = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" });
  return tz.format(now); // en-CA gives YYYY-MM-DD
}

function NewMeetingModal({ onClose, onCreated }) {
  const { currentUser, userNames, userIdByName } = useApp();
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("11:00");
  const [conductor, setConductor] = useState(currentUser.name || "");
  const [recordType, setRecordType] = useState("backfill"); // for past dates: backfill | historical
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isPast = date < todayISO();

  const submit = async () => {
    if (!conductor || !userIdByName[conductor]) {
      setError("Every meeting names who conducted it");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = { meeting_date: date, start_time: start, end_time: end, conducted_by: userIdByName[conductor] };
      if (isPast) {
        body.is_backfill = recordType === "backfill";
        body.is_historical = recordType === "historical";
      }
      const created = await api.post(`/safety-meetings`, body);
      onCreated(created.id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <ModalWrap title="New Safety Meeting" onClose={onClose} width={440}>
      <label style={labelStyle}>MEETING DATE</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: SP.lg }} />
      {isPast && (
        <>
          <label style={labelStyle}>THIS MEETING HAPPENED ON PAPER — RECORD TYPE</label>
          <select value={recordType} onChange={(e) => setRecordType(e.target.value)} style={{ ...inputStyle, marginBottom: SP.lg }}>
            <option value="backfill">Backfill — a recent meeting missed in the app</option>
            <option value="historical">Historical import — from before this module existed</option>
          </select>
          <div style={{ fontSize: F.label, color: C.muted, marginBottom: SP.lg, lineHeight: 1.5 }}>
            Attendance on a paper-record meeting is typed in and labeled as recorded from the paper record — biometric sign-in is forward-only.
          </div>
        </>
      )}
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
        <option value="">— Select —</option>
        {userNames.map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      {error && <div style={{ color: C.red, fontSize: F.meta, fontWeight: 700, marginBottom: SP.lg }}>{error}</div>}
      <div style={{ display: "flex", gap: SP.md }}>
        <Btn onClick={submit} disabled={busy}>
          {busy ? "CREATING…" : "CREATE MEETING"}
        </Btn>
        <Btn variant="ghost" onClick={onClose}>
          CANCEL
        </Btn>
      </div>
    </ModalWrap>
  );
}

function SafetyMeetingsPage() {
  const [meetings, setMeetings] = useState(null);
  const [err, setErr] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  const refresh = useCallback(() => {
    api
      .get(`/safety-meetings`)
      .then(setMeetings)
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: `${SP.xxl + 2}px ${SP.xl + 2}px 60px` }}>
      {openId ? (
        <SafetyMeetingDetail
          meetingId={openId}
          onBack={() => {
            setOpenId(null);
            refresh();
          }}
        />
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: SP.lg, flexWrap: "wrap", marginBottom: SP.xs }}>
            <h1 style={{ fontSize: F.h1, margin: 0, color: C.text }}>SAFETY MEETINGS</h1>
            <Btn onClick={() => setShowNew(true)}>+ NEW MEETING</Btn>
          </div>
          <div style={{ fontSize: F.body, color: C.muted, marginBottom: SP.xxl }}>
            Tuesday 10–11 AM. Sign in with your own biometric — the signature attests you attended.
          </div>
          {err && <div style={{ color: C.red, marginBottom: SP.lg }}>{err}</div>}
          {!meetings && !err && <div style={{ color: C.muted }}>Loading meetings…</div>}
          {meetings && meetings.length === 0 && (
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.card, color: C.muted, fontSize: F.body }}>
              No meetings recorded yet. Start Tuesday's meeting with NEW MEETING.
            </div>
          )}
          {meetings &&
            meetings.map((m) => (
              <div
                key={m.id}
                onClick={() => setOpenId(m.id)}
                style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: R.card,
                  padding: `${SP.xl}px ${SP.xl + 2}px`,
                  marginBottom: SP.lg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: SP.lg,
                  flexWrap: "wrap",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: "1 1 220px" }}>
                  <div style={{ fontWeight: 800, fontSize: F.lg, color: C.text }}>
                    {fmtMeetingDate(m.meeting_date)} · {fmtMeetingTime(m.start_time)}–{fmtMeetingTime(m.end_time)}
                  </div>
                  <div style={{ fontSize: F.meta, color: C.muted, marginTop: 2 }}>
                    Conducted by {m.conducted_by_name} · {m.attendance_count} signed in · {m.topic_count} topic{m.topic_count === 1 ? "" : "s"}
                  </div>
                </div>
                <MeetingStatusChip meeting={m} />
              </div>
            ))}
        </>
      )}
      {showNew && (
        <NewMeetingModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            setOpenId(id);
            refresh();
          }}
        />
      )}
    </div>
  );
}

export default SafetyMeetingsPage;
