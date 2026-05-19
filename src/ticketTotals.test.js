import { describe, it, expect } from "vitest";
import { calcLineTotal, calcTicketTotal } from "./utils.js";

// ─── ticketTotals.test (v28.164 — automated tests, suite 1) ───────────────
// Money path: a field ticket's dollar total is rate × qty × days summed
// across its line items. A silent regression here mis-bills a customer,
// so this suite pins the exact arithmetic — including the quirks.
//
// calcLineTotal = (li) => li.rate * li.qty * (li.days || 1)
// calcTicketTotal = (t) => t.lineItems.reduce((s, li) => s + calcLineTotal(li), 0)

describe("calcLineTotal", () => {
  it("multiplies rate × qty × days", () => {
    expect(calcLineTotal({ rate: 100, qty: 2, days: 3 })).toBe(600);
  });

  it("treats a missing days as 1", () => {
    expect(calcLineTotal({ rate: 137.5, qty: 2 })).toBe(275);
  });

  it("treats days: null as 1", () => {
    expect(calcLineTotal({ rate: 50, qty: 4, days: null })).toBe(200);
  });

  // `li.days || 1` — 0 is falsy, so a line with days: 0 still bills as 1
  // day, NOT as zero. This is intentional-by-omission behavior; the test
  // pins it so a future change to `?? 1` is a conscious decision.
  it("treats days: 0 as 1 (|| short-circuit, not ?? )", () => {
    expect(calcLineTotal({ rate: 80, qty: 5, days: 0 })).toBe(400);
  });

  it("returns 0 when qty is 0", () => {
    expect(calcLineTotal({ rate: 250, qty: 0, days: 7 })).toBe(0);
  });

  it("handles a decimal rate that is exact in binary float", () => {
    expect(calcLineTotal({ rate: 12.5, qty: 4, days: 1 })).toBe(50);
  });

  // Documents that the helper does NOT round — JS float math leaks
  // through. Callers that display money are responsible for rounding.
  it("does not round — float drift leaks through", () => {
    expect(calcLineTotal({ rate: 0.1, qty: 3, days: 1 })).toBeCloseTo(0.3, 10);
    expect(calcLineTotal({ rate: 0.1, qty: 3, days: 1 })).not.toBe(0.3);
  });
});

describe("calcTicketTotal", () => {
  it("sums every line item", () => {
    const ticket = {
      lineItems: [
        { rate: 100, qty: 2, days: 3 }, // 600
        { rate: 50, qty: 4, days: 1 }, // 200
        { rate: 137.5, qty: 2 }, // 275 (days defaults to 1)
      ],
    };
    expect(calcTicketTotal(ticket)).toBe(1075);
  });

  it("returns 0 for a ticket with no line items", () => {
    expect(calcTicketTotal({ lineItems: [] })).toBe(0);
  });

  it("returns the single line's total for a one-item ticket", () => {
    expect(calcTicketTotal({ lineItems: [{ rate: 999, qty: 1, days: 1 }] })).toBe(999);
  });

  it("counts a zero-value line as 0, not as a skipped row", () => {
    const ticket = {
      lineItems: [
        { rate: 300, qty: 1, days: 1 }, // 300
        { rate: 300, qty: 0, days: 1 }, // 0
      ],
    };
    expect(calcTicketTotal(ticket)).toBe(300);
  });
});
