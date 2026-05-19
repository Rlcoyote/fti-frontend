import { describe, it, expect } from "vitest";
import { makeCan } from "./utils.js";

// ─── permissions.test (v28.168 — automated tests, suite 2) ────────────────
// Permission resolution: makeCan(user) returns the can(key) checker the
// whole app gates UI and actions on. owner = all-true; no role = all-false;
// every other role = its DEFAULT_PERMS template overlaid with the user's
// stored per-user permissions. A silent regression here is a security
// regression, so this suite pins both the resolution mechanics and the
// role policy itself.

describe("makeCan — resolution mechanics", () => {
  it("returns all-false when there is no user", () => {
    expect(makeCan(null)("view_jobs")).toBe(false);
    expect(makeCan(undefined)("edit_tickets")).toBe(false);
  });

  it("returns all-false when the user has no role", () => {
    expect(makeCan({})("view_jobs")).toBe(false);
    expect(makeCan({ permissions: { view_jobs: true } })("view_jobs")).toBe(false);
  });

  it("grants everything to owner", () => {
    const can = makeCan({ role: "owner" });
    expect(can("manage_users")).toBe(true);
    expect(can("delete_jobs")).toBe(true);
  });

  it("owner is unconditional — per-user permissions cannot revoke it", () => {
    const can = makeCan({ role: "owner", permissions: { manage_users: false } });
    expect(can("manage_users")).toBe(true);
  });

  it("returns all-false for an unrecognized role", () => {
    expect(makeCan({ role: "intern" })("view_jobs")).toBe(false);
  });

  // !!perms[key]: a key absent from the resolved map coerces to false.
  it("returns false for an unknown permission key", () => {
    expect(makeCan({ role: "admin" })("fly_to_moon")).toBe(false);
  });
});

describe("makeCan — role policy (DEFAULT_PERMS templates)", () => {
  it("admin can do the privileged things", () => {
    const can = makeCan({ role: "admin" });
    expect(can("view_jobs")).toBe(true);
    expect(can("manage_users")).toBe(true);
    expect(can("delete_jobs")).toBe(true);
    expect(can("manage_settings")).toBe(true);
    expect(can("edit_contacts")).toBe(true);
  });

  it("field can run tickets but not jobs, users, or contacts", () => {
    const can = makeCan({ role: "field" });
    expect(can("view_jobs")).toBe(true);
    expect(can("edit_tickets")).toBe(true);
    expect(can("sign_tickets")).toBe(true);
    expect(can("edit_jobs")).toBe(false);
    expect(can("delete_jobs")).toBe(false);
    expect(can("manage_users")).toBe(false);
    expect(can("view_contacts")).toBe(false);
  });

  it("salesman can view jobs and contacts but cannot edit", () => {
    const can = makeCan({ role: "salesman" });
    expect(can("view_jobs")).toBe(true);
    expect(can("view_contacts")).toBe(true);
    expect(can("edit_jobs")).toBe(false);
    expect(can("edit_tickets")).toBe(false);
    expect(can("manage_users")).toBe(false);
  });

  it("lead can edit jobs and tickets but not archive or delete", () => {
    const can = makeCan({ role: "lead" });
    expect(can("edit_jobs")).toBe(true);
    expect(can("edit_tickets")).toBe(true);
    expect(can("view_inventory")).toBe(true);
    expect(can("view_archive")).toBe(false);
    expect(can("delete_jobs")).toBe(false);
    expect(can("manage_users")).toBe(false);
  });

  it("manager is broad but cannot touch users, settings, activity log, or contacts", () => {
    const can = makeCan({ role: "manager" });
    expect(can("edit_jobs")).toBe(true);
    expect(can("edit_tickets")).toBe(true);
    expect(can("delete_jobs")).toBe(true);
    expect(can("view_inventory")).toBe(true);
    expect(can("manage_users")).toBe(false);
    expect(can("view_activity_log")).toBe(false);
    expect(can("manage_settings")).toBe(false);
    expect(can("edit_contacts")).toBe(false);
  });
});

describe("makeCan — per-user permission overrides", () => {
  it("a per-user grant beats a role template that denies", () => {
    const can = makeCan({ role: "field", permissions: { delete_jobs: true } });
    expect(can("delete_jobs")).toBe(true);
  });

  it("a per-user denial beats a role template that grants", () => {
    const can = makeCan({ role: "admin", permissions: { manage_users: false } });
    expect(can("manage_users")).toBe(false);
    expect(can("view_jobs")).toBe(true); // untouched keys stay at the template
  });

  it("an override changes only its own key, not the rest of the template", () => {
    const can = makeCan({ role: "field", permissions: { delete_jobs: true } });
    expect(can("manage_users")).toBe(false);
    expect(can("edit_tickets")).toBe(true);
  });
});
