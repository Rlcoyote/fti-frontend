// ─── Ticket time validation (v28.221) ───────────────────────────────────────
// Sanity gate for the five Time & Mileage stamps on a job ticket:
//   LV YARD → ARRIVAL → JOB START → JOB END → RET YARD
//
// Two physical rules, both HARD (block the save):
//   1. Order: the stamps must be non-decreasing through the day. You can't
//      arrive before you left, or finish before you started.
//   2. Route floor: you can't beat the drive. ARRIVAL must be at least the
//      yard→pin drive after LV YARD (and RET YARD at least the drive back
//      after JOB END), allowing a small tolerance for estimate slop.
//
// GPS anchors LV YARD / RET YARD, but everything between must still add up —
// this gate enforces that for manual entry. Only filled stamps are checked;
// blanks are skipped (a partially-filled ticket is allowed to save).
//
// Same-day stamps are assumed (field tickets don't cross midnight); a future
// overnight case would need a date component, not just a clock time.

// "8:23 AM" → minutes since midnight, or null if blank/unparseable.
export function toMinutes(v) {
  if (!v) return null;
  const m = String(v).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10) % 12;
  const min = parseInt(m[2], 10);
  if (/PM/i.test(m[3])) h += 12;
  return h * 60 + min;
}

// minutes since midnight → "h:mm AM/PM"
export function fmtMinutes(mins) {
  if (mins == null) return "";
  const h24 = Math.floor(mins / 60) % 24;
  const m = ((mins % 60) + 60) % 60;
  const period = h24 < 12 ? "AM" : "PM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// Returns { ok, errors[] }. driveMinutes is the cached yard→pin drive (integer)
// or null when it can't be resolved — in which case the route-floor checks are
// skipped (we never block real work on a routing outage; the ordering check
// still applies).
export function validateTicketTimes({ lvYard, arrivalTime, jobStartTime, jobEndTime, retYard, driveMinutes, toleranceMin = 10 }) {
  const errors = [];
  const stamps = [
    { key: "LV YARD", raw: lvYard, v: toMinutes(lvYard) },
    { key: "ARRIVAL", raw: arrivalTime, v: toMinutes(arrivalTime) },
    { key: "JOB START", raw: jobStartTime, v: toMinutes(jobStartTime) },
    { key: "JOB END", raw: jobEndTime, v: toMinutes(jobEndTime) },
    { key: "RET YARD", raw: retYard, v: toMinutes(retYard) },
  ];

  // Rule 1 — non-decreasing order among filled stamps.
  let prev = null;
  for (const s of stamps) {
    if (s.v == null) continue;
    if (prev && s.v < prev.v) {
      errors.push(`${s.key} (${s.raw}) can't be earlier than ${prev.key} (${prev.raw}).`);
    }
    prev = s;
  }

  // Rule 1b — travel legs must be STRICTLY later. You can't cover road
  // distance in zero minutes, so LV YARD→ARRIVAL and JOB END→RET YARD can't
  // be the same stamp. This holds even when drive time can't be resolved (the
  // route floor below self-skips in that case), so an impossible same-minute
  // entry is still caught. The < case is already reported by Rule 1; here we
  // only add the equal-time message so we don't double-report.
  const lvM = toMinutes(lvYard);
  const arM = toMinutes(arrivalTime);
  const jeM = toMinutes(jobEndTime);
  const ryM = toMinutes(retYard);
  if (lvM != null && arM != null && arM === lvM) {
    errors.push(`ARRIVAL (${arrivalTime}) can't be the same as LV YARD (${lvYard}) — there's a drive between leaving the yard and arriving.`);
  }
  if (jeM != null && ryM != null && ryM === jeM) {
    errors.push(`RET YARD (${retYard}) can't be the same as JOB END (${jobEndTime}) — there's a drive back to the yard.`);
  }

  // Rule 2 — route floor (skipped when drive time is unknown).
  const drive = Number.isFinite(driveMinutes) ? driveMinutes : null;
  if (drive != null) {
    const lv = toMinutes(lvYard);
    const ar = toMinutes(arrivalTime);
    // Only when ARRIVAL isn't already flagged as before LV YARD by Rule 1.
    if (lv != null && ar != null && ar >= lv && ar < lv + drive - toleranceMin) {
      errors.push(
        `ARRIVAL (${arrivalTime}) is sooner than the ${drive}-min drive allows — ` +
          `earliest arrival after leaving the yard at ${lvYard} is ${fmtMinutes(lv + drive)}.`,
      );
    }
    const je = toMinutes(jobEndTime);
    const ry = toMinutes(retYard);
    if (je != null && ry != null && ry >= je && ry < je + drive - toleranceMin) {
      errors.push(
        `RET YARD (${retYard}) is sooner than the ${drive}-min drive back allows — ` +
          `earliest return after leaving the job at ${jobEndTime} is ${fmtMinutes(je + drive)}.`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
