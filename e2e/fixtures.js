// ─── E2E fixtures + API mock router (v28.321) ────────────────────────────────
// One home for the mocked backend. mockApi(page, overrides) intercepts every
// /api/** request: exact-path matches from the map win, otherwise GET falls
// back to an empty list (safe for every list endpoint) so an unmocked call
// can never hang a spec. Overrides let each spec shape only what it asserts.

export const TEST_USER = {
  id: "e2e00000-0000-0000-0000-000000000001",
  name: "E2E Tester",
  role: "admin",
  token: "e2e-fake-jwt",
  permissions: {},
};

// API shape — usePageData maps customer_name → customer, wells strings →
// {well_name} objects. Fixtures mirror the WIRE format, never the UI format.
export const TEST_JOB = {
  id: 300999,
  customer_name: "E2E OIL CO",
  customer_id: 1,
  location: "TEST LEASE, PECOS COUNTY",
  wells: ["TEST WELL 1H"],
  status: "Scheduled",
  crew: [],
  equipment: [],
  created_by_name: "E2E Tester",
  created_at: "2026-07-14T12:00:00Z",
};

export const TEST_TICKET = {
  id: 9001,
  jobId: 300999,
  job_id: 300999,
  ticketNumber: 1,
  ticket_number: 1,
  type: "Tester",
  date: "2026-07-14",
  status: "incomplete",
  lineItems: [],
  line_items: [],
  crew: [],
};

export const TEST_JSA_ROW = {
  id: "e2e00000-0000-0000-0000-00000000aaaa",
  job_id: 300999,
  ticket_id: 9001,
  date: "2026-07-14",
  time: "07:00",
  operator: "E2E OIL CO",
  well_name: "TEST WELL 1H",
  designated_driver: "E2E Tester",
  weather: [],
  ppe_fr_clothing: true,
  ppe_tools_trained: true,
  ppe_confined_space: false,
  presenter_review: "E2E presenter notes",
  completed_at: null,
  signatures: [],
  additional_steps: [],
};

export const SIGN_LANDING = {
  pending_token: "e2e-pending-token",
  authentication_options: { challenge: "e2e-challenge", allowCredentials: [], rpId: "localhost", timeout: 60000, userVerification: "required" },
  user_name: "E2E Tester",
  jsa: {
    id: TEST_JSA_ROW.id,
    ticket_number: 1,
    job_number: 300999,
    ticket_type: "Tester",
    ticket_date: "2026-07-14",
    customer_name: "E2E OIL CO",
    job_location: "TEST LEASE, PECOS COUNTY",
    jsa_date: "2026-07-14",
    jsa_time: "07:00",
    operator: "E2E OIL CO",
    well_name: "TEST WELL 1H",
    designated_driver: "E2E Tester",
    weather: [],
    ppe_fr_clothing: true,
    ppe_tools_trained: true,
    ppe_confined_space: false,
    presenter_review: "E2E presenter notes",
  },
};

export const REQUIRED_SIGNERS = {
  jsa_id: TEST_JSA_ROW.id,
  ticket_id: 9001,
  ticket_number: 1,
  job_number: 300999,
  ticket_type: "Rig Up",
  ticket_date: "2026-07-14",
  customer_name: "E2E OIL CO",
  jsa_completed_at: null,
  ticket_is_closed: false,
  crew_count: 1,
  all_signed: false,
  crew: [
    {
      user_id: "e2e00000-0000-0000-0000-000000000001",
      is_lead: true,
      user_name: "E2E Tester",
      user_email: "e2e@flotest.com",
      user_phone: null,
      user_role: "admin",
      user_job_title: "Tester",
      signature_id: null,
      sign_method: null,
      signed_at: null,
      witnessed_by_user_id: null,
      override_reason_code: null,
      witness_name: null,
    },
  ],
};

// Baseline GET map — every endpoint the app boot + dashboard touches.
const BASE_GETS = {
  "/api/settings": {},
  "/api/users": [{ id: TEST_USER.id, name: TEST_USER.name, role: "admin", is_active: true }],
  "/api/work-orders": [TEST_JOB], // v28.418 — congruency: the app speaks work-orders since v28.404
  "/api/customers": [{ id: 1, name: "E2E OIL CO" }],
  "/api/inventory": [],
  "/api/qb-items": [],
  "/api/todos": [],
  "/api/assets": [],
  "/api/vehicles": [],
  "/api/yards": [],
  "/api/config/roles": [],
};

export async function mockApi(page, { gets = {}, posts = {}, puts = {} } = {}) {
  const getMap = { ...BASE_GETS, ...gets };
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const key = path + (url.search || "");
    const method = req.method();

    const pick = (map) => (key in map ? map[key] : path in map ? map[path] : undefined);

    if (method === "GET") {
      const hit = pick(getMap);
      return route.fulfill({ json: hit !== undefined ? hit : [] });
    }
    if (method === "POST") {
      const hit = pick(posts);
      if (hit !== undefined) return route.fulfill(typeof hit === "function" ? await hit(req) : hit);
      return route.fulfill({ json: { ok: true } });
    }
    if (method === "PUT") {
      const hit = pick(puts);
      if (hit !== undefined) return route.fulfill(typeof hit === "function" ? await hit(req) : hit);
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { ok: true } });
  });
}

// Seed a logged-in session the way the app persists one (sessionStorage,
// read synchronously at first render by AppContext).
export async function seedSession(page, user = TEST_USER) {
  await page.addInitScript((u) => {
    sessionStorage.setItem("fti_user", JSON.stringify(u));
  }, user);
}
