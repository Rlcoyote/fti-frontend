import { describe, it, expect } from "vitest";
import { makeCan, DEFAULT_PERMS, PERMISSION_CATEGORIES } from "./permissions.js";

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

describe("DEFAULT_PERMS — matrix drift guard", () => {
  const categoryKeys = new Set(PERMISSION_CATEGORIES.map((p) => p.key));

  // The dangerous, NON-fail-safe drift: a role template grants a key that no
  // longer exists in PERMISSION_CATEGORIES (typo, or a key dropped from the
  // grid but left behind in a template). That's a permission with no UI toggle
  // and no backend mirror — a phantom grant. (The reverse — a category key
  // missing from a template — resolves to undefined→false, i.e. deny, which is
  // fail-safe, so it is intentionally NOT asserted here; see the labor-keys
  // policy note below.)
  it("no role template references a key outside PERMISSION_CATEGORIES", () => {
    for (const [role, perms] of Object.entries(DEFAULT_PERMS)) {
      for (const key of Object.keys(perms)) {
        expect(categoryKeys.has(key), `${role} grants unknown key "${key}"`).toBe(true);
      }
    }
  });

  // PERMISSION_CATEGORIES keys must be unique — a duplicate key silently lets a
  // later row's group/label shadow an earlier one in the Permissions modal.
  it("PERMISSION_CATEGORIES has no duplicate keys", () => {
    expect(categoryKeys.size).toBe(PERMISSION_CATEGORIES.length);
  });

  // POLICY PIN (current behavior, deliberately locked — NOT an endorsement):
  // the v28.202 labor keys (view_all_hours / approve_time_corrections) were
  // never added to the six explicit role templates, so they resolve undefined→
  // false for lead/salesman/field/hse/mechanic. manager is built via the
  // exclusion pattern and the labor keys are NOT excluded, so manager inherits
  // BOTH as true. owner/admin are all-true. This pins that exact state so any
  // future change to the labor grid is a conscious, reviewed edit — not a
  // silent resolution side effect.
  it("labor keys resolve to the current (implicit) policy", () => {
    expect(makeCan({ role: "manager" })("view_all_hours")).toBe(true);
    expect(makeCan({ role: "manager" })("approve_time_corrections")).toBe(true);
    expect(makeCan({ role: "admin" })("view_all_hours")).toBe(true);
    for (const role of ["lead", "salesman", "field", "hse", "mechanic"]) {
      expect(makeCan({ role })("view_all_hours")).toBe(false);
      expect(makeCan({ role })("approve_time_corrections")).toBe(false);
    }
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
