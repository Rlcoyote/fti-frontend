import { describe, it, expect } from "vitest";
import { toMinutes, fmtMinutes, validateTicketTimes, driveMinutesFromInfo } from "./ticketTimeValidation.js";

describe("driveMinutesFromInfo", () => {
  it("reads minutes from the route response shape (durationSeconds)", () => {
    // exactly what POST /jobs/drive-distance returns on success
    expect(driveMinutesFromInfo({ distance: "63.2 mi", duration: "1 hour 22 mins", distanceMeters: 101700, durationSeconds: 4920 })).toBe(82);
  });
  it("returns null for the failure / unresolved shapes", () => {
    expect(driveMinutesFromInfo(null)).toBeNull(); // coords not resolved yet
    expect(driveMinutesFromInfo({ error: "Could not calculate" })).toBeNull();
    expect(driveMinutesFromInfo({})).toBeNull();
  });
  it("tolerates the service shape too", () => {
    expect(driveMinutesFromInfo({ ok: true, driveMinutes: 82 })).toBe(82);
  });
});

describe("toMinutes", () => {
  it("parses 12-hour clock strings", () => {
    expect(toMinutes("12:00 AM")).toBe(0);
    expect(toMinutes("8:23 AM")).toBe(503);
    expect(toMinutes("12:30 PM")).toBe(750);
    expect(toMinutes("1:00 PM")).toBe(780);
    expect(toMinutes("11:59 PM")).toBe(1439);
  });
  it("returns null for blank or malformed", () => {
    expect(toMinutes("")).toBeNull();
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes("8:5 AM")).toBeNull(); // minutes must be 2 digits
    expect(toMinutes("noon")).toBeNull();
  });
});

describe("fmtMinutes", () => {
  it("round-trips with toMinutes", () => {
    for (const s of ["12:00 AM", "8:23 AM", "12:30 PM", "11:59 PM"]) {
      expect(fmtMinutes(toMinutes(s))).toBe(s);
    }
  });
});

describe("validateTicketTimes", () => {
  it("passes a clean, ordered ticket", () => {
    const r = validateTicketTimes({
      lvYard: "7:00 AM",
      arrivalTime: "8:30 AM",
      jobStartTime: "8:45 AM",
      jobEndTime: "2:00 PM",
      retYard: "3:30 PM",
      driveMinutes: 82,
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("blocks Reggie's impossible case: leave 10:30, arrive 10:00, drive 82m", () => {
    const r = validateTicketTimes({
      lvYard: "10:30 AM",
      arrivalTime: "10:00 AM",
      jobStartTime: "",
      jobEndTime: "",
      retYard: "",
      driveMinutes: 82,
    });
    expect(r.ok).toBe(false);
    // arrival-before-departure is an ordering violation
    expect(r.errors.join(" ")).toMatch(/ARRIVAL.*can't be earlier than LV YARD/);
  });

  it("blocks arrival sooner than the drive allows (ordered but too fast)", () => {
    const r = validateTicketTimes({
      lvYard: "10:30 AM",
      arrivalTime: "11:00 AM", // 30 min after leaving, but drive is 82
      driveMinutes: 82,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/sooner than the 82-min drive allows/);
  });

  it("allows arrival within the 10-min tolerance of the drive floor", () => {
    // leave 10:30 + 82 drive = 11:52 floor; tolerance 10 → 11:42 allowed
    const r = validateTicketTimes({
      lvYard: "10:30 AM",
      arrivalTime: "11:45 AM",
      driveMinutes: 82,
    });
    expect(r.ok).toBe(true);
  });

  it("blocks job end before job start", () => {
    const r = validateTicketTimes({
      jobStartTime: "2:00 PM",
      jobEndTime: "1:00 PM",
      driveMinutes: 82,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/JOB END.*can't be earlier than JOB START/);
  });

  it("blocks return-to-yard sooner than the drive back allows", () => {
    const r = validateTicketTimes({
      jobEndTime: "2:00 PM",
      retYard: "2:30 PM", // only 30 min, drive back is 82
      driveMinutes: 82,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/RET YARD.*sooner than the 82-min drive back/);
  });

  it("skips route-floor checks when drive time is unknown, still enforces order", () => {
    const tooFast = validateTicketTimes({
      lvYard: "10:30 AM",
      arrivalTime: "10:35 AM",
      driveMinutes: null,
    });
    expect(tooFast.ok).toBe(true); // can't judge the drive, so allowed

    const outOfOrder = validateTicketTimes({
      lvYard: "10:30 AM",
      arrivalTime: "10:00 AM",
      driveMinutes: null,
    });
    expect(outOfOrder.ok).toBe(false); // ordering still applies
  });

  it("blocks identical LV YARD / ARRIVAL even when drive can't resolve", () => {
    // Reggie's Rig Down case: 9:25 leave, 9:25 arrival, drive unresolved.
    const r = validateTicketTimes({
      lvYard: "9:25 AM",
      arrivalTime: "9:25 AM",
      driveMinutes: null,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/ARRIVAL.*can't be the same as LV YARD/);
  });

  it("blocks identical JOB END / RET YARD (zero drive back)", () => {
    const r = validateTicketTimes({
      jobEndTime: "2:00 PM",
      retYard: "2:00 PM",
      driveMinutes: null,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.join(" ")).toMatch(/RET YARD.*can't be the same as JOB END/);
  });

  it("still allows equal non-travel adjacencies (arrive == job start)", () => {
    const r = validateTicketTimes({
      lvYard: "7:00 AM",
      arrivalTime: "8:30 AM",
      jobStartTime: "8:30 AM", // arrive and start immediately — legitimate
      driveMinutes: null,
    });
    expect(r.ok).toBe(true);
  });

  it("allows a partially-filled ticket (blanks skipped)", () => {
    const r = validateTicketTimes({
      lvYard: "7:00 AM",
      arrivalTime: "",
      jobStartTime: "",
      jobEndTime: "",
      retYard: "",
      driveMinutes: 82,
    });
    expect(r.ok).toBe(true);
  });
});
