import { describe, it, expect } from "vitest";
import { normalizeJsaRow } from "./useTicketJSA.js";

// ─── normalizeJsaRow fence (v28.322) ─────────────────────────────────────────
// The 7/14 "checkmarks differ per user" bug: the per-day JSA open path passed
// the RAW db row to JSAModal, which reads camelCase (ppe.frClothing) — every
// per-day JSA rendered ALL PPE boxes false regardless of saved state, while
// the lead saw his own in-memory checked state. v28.313 gave the row→modal
// shape ONE home; this fence pins it. (The UI-level E2E fence was flaky at
// the modal seam — tracked on the suite's growth list; this unit fence
// covers the shape contract deterministically.)

const RAW_ROW = {
  id: "jsa-1",
  date: "2026-07-14",
  time: "07:00",
  operator: "E2E OIL CO",
  well_name: "TEST WELL 1H",
  designated_driver: "Angel Martinez",
  latitude: 31.4,
  longitude: -103.5,
  weather: ["windy"],
  ppe_fr_clothing: true,
  ppe_tools_trained: true,
  ppe_confined_space: false,
  presenter_review: "watch the H2S monitor",
  signatures: [{ name: "Josh Trevino" }, "Bill Hardy"],
  additional_steps: [{ step: "rig walk", hazard: "pinch points", procedure: "gloves on", extra_db_field: "x" }],
};

describe("normalizeJsaRow", () => {
  it("maps the PPE flags into the shape the modal reads", () => {
    const n = normalizeJsaRow(RAW_ROW);
    expect(n.ppe).toEqual({ frClothing: true, toolsTrained: true, confinedSpace: false });
  });

  it("maps snake_case fields the modal seeds from", () => {
    const n = normalizeJsaRow(RAW_ROW);
    expect(n.wellName).toBe("TEST WELL 1H");
    expect(n.designatedDriver).toBe("Angel Martinez");
    expect(n.presenterReview).toBe("watch the H2S monitor");
    expect(n.lat).toBe(31.4);
    expect(n.lng).toBe(-103.5);
  });

  it("flattens signatures to name strings and trims steps to modal fields", () => {
    const n = normalizeJsaRow(RAW_ROW);
    expect(n.signatures).toEqual(["Josh Trevino", "Bill Hardy"]);
    expect(n.additionalSteps).toEqual([{ step: "rig walk", hazard: "pinch points", procedure: "gloves on" }]);
  });

  it("keeps raw fields available (spread first, mapped names win)", () => {
    const n = normalizeJsaRow(RAW_ROW);
    expect(n.id).toBe("jsa-1");
    expect(n.date).toBe("2026-07-14");
    expect(n.weather).toEqual(["windy"]);
  });
});
