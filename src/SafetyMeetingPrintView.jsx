import { C, F, SP, R } from "./config.js";
import { Btn } from "./SharedUI.jsx";
import { AttendanceRow, METHOD_META, fmtMeetingDate, fmtMeetingTime, pooledActionItems } from "./SafetyMeetingShared.jsx";

// ─── SafetyMeetingPrintView (v28.337) ────────────────────────────────────────
// The auditor-facing record (spec §2.8): EXPORT PDF = the shipped print
// pattern (TrainingPage AttemptReview / PublicSignPage no-print) — print CSS +
// window.print(), Save-as-PDF in the dialog. No PDF library dependency
// (Article XII: the pattern exists; use it).
//
// Attendance renders through SafetyMeetingShared.AttendanceRow — the SAME
// formatter the live card uses (Anti-Pattern Entry 7: one home, two surfaces).
// Litigation-defense posture: the record states what happened and who was
// there, dated, with the attestation method spelled out. No absence data
// exists anywhere in this render (ratified Q4).

function SafetyMeetingPrintView({ meeting, onBack }) {
  const actionPool = pooledActionItems(meeting);

  const line = (label, value) => (
    <div style={{ display: "flex", gap: SP.md, fontSize: F.body, marginBottom: 2 }}>
      <span style={{ fontWeight: 800, minWidth: 130 }}>{label}</span>
      <span>{value}</span>
    </div>
  );
  const heading = (text) => (
    <div style={{ fontWeight: 800, fontSize: F.md, borderBottom: `1px solid ${C.border}`, margin: `${SP.xxl}px 0 ${SP.sm}px`, paddingBottom: 2 }}>{text}</div>
  );

  return (
    <div>
      <style>{`@media print { .no-print { display: none !important; } .sm-print { color: #000 !important; } .sm-print * { color: #000 !important; border-color: #999 !important; background: #fff !important; } @page { size: letter; margin: 0.5in; } }`}</style>
      <div className="no-print" style={{ display: "flex", gap: SP.lg, marginBottom: SP.xl, flexWrap: "wrap" }}>
        <Btn variant="ghost" small onClick={onBack}>
          ← BACK TO MEETING
        </Btn>
        <Btn small onClick={() => window.print()}>
          PRINT / SAVE AS PDF
        </Btn>
      </div>

      <div className="sm-print" style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: R.card, padding: SP.card, color: C.text }}>
        <div style={{ fontWeight: 900, fontSize: F.h2 }}>FLO-TEST, INC. — SAFETY MEETING RECORD</div>
        <div style={{ fontSize: F.meta, color: C.muted, marginBottom: SP.xxl }}>
          {meeting.is_historical
            ? "Historical record — attendance transcribed from the paper record"
            : meeting.is_backfill
              ? "Backfill record — attendance transcribed from the paper record"
              : "Recorded live in the FTI Operations App"}
        </div>

        {line("MEETING DATE", fmtMeetingDate(meeting.meeting_date))}
        {line("TIME", `${fmtMeetingTime(meeting.start_time)} – ${fmtMeetingTime(meeting.end_time)}`)}
        {line("CONDUCTED BY", meeting.conducted_by_name)}
        {line("RECORDED BY", meeting.created_by_name)}

        {heading(`ATTENDANCE (${meeting.attendance.length})`)}
        {meeting.attendance.length === 0 && <div style={{ fontSize: F.meta, color: C.muted }}>No attendance recorded.</div>}
        {meeting.attendance.map((row) => (
          <AttendanceRow key={row.id} row={row} />
        ))}
        {meeting.attendance.length > 0 && (
          <div style={{ fontSize: F.badge, color: C.muted, marginTop: SP.sm, lineHeight: 1.5 }}>
            {METHOD_META.biometric.label}: self sign-in by the attendee's own biometric (WebAuthn), attesting attendance. {METHOD_META.manual_override.label}:
            added by a manager with the stated reason. {METHOD_META.recorded_from_paper.label}: transcribed from the paper sign-in sheet.{" "}
            {METHOD_META.external.label}: non-employee recorded by name and company.
          </div>
        )}

        {heading("TOPICS COVERED")}
        {meeting.topics.length === 0 && <div style={{ fontSize: F.meta, color: C.muted }}>None recorded.</div>}
        {meeting.topics.map((t) => (
          <div key={t.id} style={{ fontSize: F.body, marginBottom: 2 }}>
            • {t.title}
            {t.ppm_reference ? ` — ${t.ppm_reference}` : ""}
          </div>
        ))}

        {meeting.questions.length > 0 && (
          <>
            {heading("POLICY QUESTIONS ASKED")}
            {meeting.questions.map((q) => (
              <div key={q.id} style={{ fontSize: F.body, marginBottom: 2 }}>
                {q.asked_order}. {q.question_text}
              </div>
            ))}
          </>
        )}

        {heading("NEAR MISSES")}
        {(meeting.near_misses || []).length > 0 ? (
          (meeting.near_misses || []).map((nm) => (
            <div key={nm.id} style={{ fontSize: F.body, marginBottom: 2 }}>
              • {nm.description}
              {nm.raised_by ? ` — raised by ${nm.raised_by}` : ""} ({nm.report_completed ? "report filed" : "report owed"})
            </div>
          ))
        ) : meeting.near_misses_reviewed_at ? (
          <div style={{ fontSize: F.body }}>Asked — none raised{meeting.near_misses_reviewed_by_name ? ` (${meeting.near_misses_reviewed_by_name})` : ""}</div>
        ) : (
          <div style={{ fontSize: F.meta, color: C.muted }}>Not recorded for this meeting.</div>
        )}

        {heading("OPEN ACTION ITEMS AS OF THIS EXPORT")}
        {actionPool.length === 0 && <div style={{ fontSize: F.meta, color: C.muted }}>None outstanding.</div>}
        {actionPool.map((t) => (
          <div key={t.id} style={{ fontSize: F.body, marginBottom: 2 }}>
            • [{t.category === "todo" ? "TO-DO" : "REQUIRED"}] {t.title} — {t.assigned_to_name || "unassigned"}, entered {fmtMeetingDate(t.created_at)}
          </div>
        ))}

        {meeting.notes && (
          <>
            {heading("NOTES")}
            <div style={{ fontSize: F.body, whiteSpace: "pre-wrap" }}>{meeting.notes}</div>
          </>
        )}

        {meeting.attachments.length > 0 && (
          <>
            {heading("ATTACHMENTS ON FILE")}
            {meeting.attachments.map((a) => (
              <div key={a.id} style={{ fontSize: F.body, marginBottom: 2 }}>
                • {a.filename} ({a.mime}, {Math.max(1, Math.round((a.bytes || 0) / 1024))} KB)
              </div>
            ))}
          </>
        )}

        <div style={{ fontSize: F.badge, color: C.muted, marginTop: SP.card, borderTop: `1px solid ${C.border}`, paddingTop: SP.sm }}>
          Exported from the FTI Operations App on {new Date().toLocaleDateString("en-US")} · Meeting record #{meeting.id}
        </div>
      </div>
    </div>
  );
}

export default SafetyMeetingPrintView;
