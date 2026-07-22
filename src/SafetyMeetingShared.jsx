import { C, F, SP, R } from "./config.js";

// ─── SafetyMeetingShared (v28.335) ───────────────────────────────────────────
// THE one home (Anti-Pattern Entry 7) for how safety-meeting attendance and
// meeting status render. The attendance card, the meeting list chips, and the
// slice-6 PDF export ALL consume these — the visual rule for "what kind of
// attestation is this row" is never implemented twice.
//
// Doctrine: the four methods are structurally distinct and must LOOK distinct
// (spec §2.11 — typed rows are never presented as biometric attestation).

export const METHOD_META = {
  biometric: { label: "BIOMETRIC", color: () => C.green, note: () => null },
  manual_override: { label: "MANAGER OVERRIDE", color: () => C.orange, note: (row) => `by ${row.added_by_name || "manager"} — ${row.override_reason || ""}` },
  recorded_from_paper: { label: "PAPER RECORD", color: () => C.muted, note: (row) => `entered by ${row.added_by_name || "office"}` },
  external: { label: "VISITOR", color: () => C.blue, note: (row) => row.external_company || null },
};

// v28.372 — ONE pool for the Tuesday roll-forward recap (Reggie: "maybe they
// all need addressed and can be lumped into a pool. One thing for sure, they
// need to be categorized by date entered"). Every row comes from the same
// todos board anyway — the REQUIRED/TO-DO headings implied two lists that
// don't exist in the data. Oldest first: age is the read-out signal, and the
// category survives as an inline chip on each row. One home (Entry 7) —
// the detail card and the print export both consume THIS ordering.
export function pooledActionItems(meeting) {
  return [...(meeting.open_action_items || [])].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export function actionItemDaysOpen(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86400000));
}

// TZ-proof date formatter for DATE columns. The backend serializes DATE as
// UTC-midnight ISO ("2026-07-14T00:00:00.000Z"); localizing that in Chicago
// renders the PREVIOUS day. Slice the date part and format from parts.
export function fmtMeetingDate(d) {
  if (!d) return "";
  const iso = String(d).slice(0, 10);
  const [y, m, day] = iso.split("-");
  if (!y || !m || !day) return iso;
  return `${m}/${day}/${y.slice(2)}`;
}

// "10:00:00" → "10:00 AM"
export function fmtMeetingTime(t) {
  if (!t) return "";
  const [hh, mm] = String(t).split(":");
  const h = parseInt(hh, 10);
  if (!Number.isFinite(h)) return t;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${ampm}`;
}

export function MeetingStatusChip({ meeting }) {
  let label, color;
  if (meeting.is_historical) {
    label = "HISTORICAL — PAPER RECORD";
    color = C.muted;
  } else if (meeting.is_backfill) {
    label = "BACKFILL — PAPER RECORD";
    color = C.muted;
  } else if (meeting.closed_at) {
    label = meeting.close_method === "auto" ? "CLOSED (AUTOMATIC)" : "CLOSED";
    color = C.red;
  } else {
    label = "OPEN FOR SIGN-IN";
    color = C.green;
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
}

// One attendance row — name, method chip, note, time. Used by the meeting
// detail card and the PDF export (one home, Entry 7).
// v28.392 (Reggie: signed after the meeting date "documented today's current
// time, but did not input the date") — pass meetingDate and any signature
// whose date differs shows its FULL date plus an AFTER MEETING DATE flag.
// The record tells the truth about when the attestation actually happened.
export function AttendanceRow({ row, meetingDate }) {
  const meta = METHOD_META[row.method] || { label: row.method, color: () => C.muted, note: () => null };
  const color = meta.color();
  const note = meta.note(row);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: SP.md,
        padding: `${SP.md}px ${SP.xl}px`,
        borderTop: `1px solid ${C.border}33`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 180px" }}>
        <div style={{ fontWeight: 700, fontSize: F.md, color: C.text }}>{row.user_name || row.external_name}</div>
        {note && <div style={{ fontSize: F.label, color: C.muted, marginTop: 1 }}>{note}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: SP.md }}>
        <span
          style={{
            fontSize: F.badge,
            fontWeight: 800,
            color,
            border: `1px solid ${color}66`,
            background: `${color}18`,
            borderRadius: R.xl,
            padding: "2px 7px",
            whiteSpace: "nowrap",
          }}
        >
          {meta.label}
        </span>
        {(() => {
          if (!row.signed_at) return null;
          const signed = new Date(row.signed_at);
          const signedDate = signed.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
          const mDate = meetingDate ? String(meetingDate).slice(0, 10) : null;
          const afterFact = mDate && signedDate !== mDate;
          return (
            <span style={{ fontSize: F.label, color: afterFact ? C.orange : C.muted, whiteSpace: "nowrap", fontWeight: afterFact ? 800 : 400 }}>
              {afterFact ? `${fmtMeetingDate(signedDate)} ` : ""}
              {signed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              {afterFact ? " — AFTER MEETING DATE" : ""}
            </span>
          );
        })()}
      </div>
    </div>
  );
}
