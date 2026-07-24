// ─── tutorialContent.js — THE tutorial (v28.419) ────────────────────────────
// One home for every word of the in-app tutorial. TutorialPage renders this;
// nothing else holds tutorial prose. Written against the STABLE SPINE
// (create WO → add ticket → crew/JSA → sign → approve) in field voice, using
// the EXACT button labels the glass shows (caps = a real button/label).
//
// Shape: modules → lessons → numbered steps. `gate` hides a module from
// users who can't reach the surface it teaches:
//   { perm: "approve_tickets" }      — permission-matrix key via can()
//   { roles: ["owner", "admin"] }    — hardcoded-role surfaces
//   null                             — everyone
//
// WHITE-LABEL: content speaks the app's own vocabulary (Work Order, ticket,
// JSA, DVIR) — nothing FTI-specific beyond the module set itself, and gated
// modules vanish for tenants whose roles never see those surfaces.
//
// ── THE STANDING RULE (Reggie, ratified 260723: "No rotting.") ──────────────
// Any version that ships a teachable feature updates its lesson HERE, in the
// SAME version. scripts/check-tutorial.mjs enforces the structural half in
// CI (nav coverage, tour anchors, gate keys) and fails the build on drift;
// the judgment half — "does this change deserve a lesson?" — is on whoever
// ships the change. If you're adding a surface and wondering whether to
// teach it: yes.

export const TUTORIAL_MODULES = [
  {
    key: "start",
    icon: "🚀",
    title: "START HERE",
    gate: null,
    blurb: "Logging in, finding your way around, and the three controls you'll touch every day.",
    lessons: [
      {
        title: "Logging in",
        steps: [
          "Open the app and enter your username and password. The first login on a new phone asks you to set up biometrics (Face ID / fingerprint) — do it. Signing tickets, JSAs, and safety meetings all use it.",
          "If biometrics ever stops matching, your manager can reset your PIN. The PIN is the fallback, not the main path.",
        ],
        tip: "One phone = one person. Your biometric signature is YOUR attendance and YOUR name on safety records — never sign on someone else's device.",
      },
      {
        title: "The navigation bar",
        steps: [
          "The pills across the top are the app. DASHBOARD is home — your active Work Orders.",
          "Grouped pills (TIME, SAFETY, HISTORY) open on hover or tap and hold their related pages.",
          "The 🔍 button in the header searches EVERYTHING you can see — WO numbers, ticket numbers like 300178-1, people, customers, documents, vehicles.",
          "The sun/moon button flips light and dark mode. Every screen honors it.",
          "ALL TICKETS is every ticket across every job in one filterable list — when you know the ticket but not the job.",
          "Under HISTORY: Work Order History is every past job, Archive holds completed ones, and Deleted is the recoverable trash — nothing hard-deletes from the glass.",
        ],
      },
      {
        title: "The back button is safe",
        steps: [
          "Your phone's back button (or browser back) closes the top-most thing first — a modal, then the page. It will not dump you out of unsaved work without the unsaved-changes warning.",
        ],
      },
    ],
  },
  {
    key: "workorders",
    icon: "📋",
    title: "WORK ORDERS",
    gate: null,
    blurb: "The container everything else lives in. One customer, one location, its wells, and every ticket written against the job.",
    lessons: [
      {
        title: "Creating a Work Order",
        steps: [
          "On the Dashboard, press + NEW WORK ORDER.",
          "Pick the customer, then the contact. The contact list shows the customer's own people first; the ALL CUSTOMERS link searches across companies for a rep who moved.",
          "Enter the location and wells. Add every well the job touches — tickets pick from this list later.",
          "Paste a Google Maps pin link if you have one — the app resolves it to coordinates and the crew gets drive-time and GPS tracking for free.",
        ],
      },
      {
        title: "Reading a Work Order card",
        steps: [
          "Each card on the Dashboard is one active job: customer, location, and a colored dot per ticket (each ticket type has its color — Rig Down is black).",
          "A peach-tinted card is the app telling you something on that WO needs attention — the card says why on its face.",
          "Tap a card to open the WO: its tickets, wells, contacts, and documents.",
        ],
      },
    ],
  },
  {
    key: "tickets",
    icon: "🎫",
    title: "TICKETS — RIG UP, RIG DOWN, RENTAL",
    gate: null,
    blurb: "The visit family: one dated trip to location. Everything the customer signs lives here.",
    lessons: [
      {
        title: "Adding a ticket",
        steps: [
          "Open the Work Order and press + ADD TICKET. Pick the type from the dropdown — each shows its color dot.",
          "Confirm the wells for THIS ticket. Every ticket asks, even on a one-well job — one tap and you're through.",
          "Fill the form: date, site manager, equipment, line items. SAVE & CLOSE or keep going straight to crew and JSA.",
        ],
      },
      {
        title: "Crew",
        steps: [
          "Inside the ticket, CREW SELECTION lists who's on this ticket. Add people one at a time, and mark the lead.",
          "COPY CREW FROM RIG UP appears when the WO has a Rig Up — it's a button, never automatic. Crews change between visits; nobody lands on a ticket unless a person puts them there.",
          "The crew list feeds the JSA: everyone on the crew must sign the JSA before it can complete.",
        ],
      },
      {
        title: "Time, mileage, and GPS",
        steps: [
          "The GPS block pulls yard-out and yard-back times from the assigned vehicle automatically — that's the canonical record.",
          "The manual TIME & MILEAGE stamps below are the fallback for non-GPS vehicles: LV YARD → ARRIVAL → JOB START → JOB END → RET YARD, plus begin/end mileage.",
          "The app sanity-checks the stamps — arrival before departure, or faster than the drive allows, gets caught at save.",
        ],
      },
      {
        title: "RENTAL & the RIGGED DOWN button",
        steps: [
          "A Rental ticket has a start date, a billing cycle, and no time stamps — it bills days, not hours.",
          "When the rental equipment comes off location, open the Rental and press RIGGED DOWN? at the top. Confirm, and the ticket renames to RENTAL & RIG DOWN everywhere the customer sees it — and turns black like a Rig Down.",
          "Rigging down opens the time-tracking sections (clock-in, GPS, TIME & MILEAGE) — the rig-down crew's labor and travel get entered ON this ticket, and labor line items get added like any other ticket.",
          "If the rental had no end date, rigging down sets it to today — the billing clock stops.",
          "Pressed it by mistake? Press ✓ RIGGED DOWN again to undo — allowed until the ticket is signed. A signed or approved ticket refuses to change.",
        ],
      },
      {
        title: "Getting the ticket signed",
        steps: [
          "A JSA must exist before a signature can be collected — the button says CREATE JSA TO COLLECT SIGNATURE until it does (Rentals are the exception; their JSA is optional).",
          "COLLECT SIGNATURE opens the signature pad for the customer rep standing in front of you.",
          "No rep on location? Email the sign link from the ticket — the customer signs on their own phone and the ticket updates itself.",
          "SIG NOT REQUIRED is for tickets that genuinely need none — it asks for the reason and records it.",
        ],
        tip: "A signed ticket is locked. Editing it wipes the signature — the document changed, so the attestation no longer covers it. The app warns you first.",
      },
    ],
  },
  {
    key: "logtickets",
    icon: "📅",
    title: "TESTER & PUMPER WEEKS",
    gate: null,
    blurb: "The log family: a Mon–Sun week of daily hours and well readings, signed once at week's end.",
    lessons: [
      {
        title: "The week ticket",
        steps: [
          "Create a Tester or Pumper ticket and it OPENS ITSELF — the DAYS & HOURS grid and WELL LOG tabs live on the ticket, not in the create form.",
          "Each day is one row: IN and OUT. That's a continuous shift — one pair covers it, even a 24-hour tower.",
          "Went off location and came back the same day? Press + SPLIT DAY on that row for a second IN/OUT pair. It's there when you need it, hidden when you don't.",
          "A shift that runs past midnight ends with the end-of-day stamp (→ 24:00) and continues on the next day's row.",
          "Press SAVE WEEK when you're done — TOTAL TEST HOURS updates from what you entered.",
        ],
      },
      {
        title: "One JSA per worked day — the gate",
        steps: [
          "Every day with hours needs its own completed JSA. The moment you type a time on a day without one, a red strip appears on that row: START JSA is right there in the strip.",
          "A JSA completes when it's filled out AND every crew member has signed it biometrically. The strip clears itself the moment that happens.",
          "The week CANNOT be signed, marked sig-not-required, or emailed to the customer while any worked day is missing its completed JSA. The app tells you exactly which days.",
          "Days with no time entered need nothing.",
        ],
        tip: "One continuous 24-hour shift is one JSA on one day's row. A shift CHANGE is new time on a new row — which demands its own JSA. That's the rule working as intended.",
      },
      {
        title: "Travel and the well log",
        steps: [
          "TRAVEL & MILEAGE is entered ONCE per ticket — the out-leg and the return-leg, even if they're weeks apart.",
          "The WELL LOG tab records per-well readings by date and hour. Day and night testers on the same well feed one continuous stream — each keeps their own week ticket.",
        ],
      },
    ],
  },
  {
    key: "safety",
    icon: "🦺",
    title: "SAFETY MEETINGS & JSAs",
    gate: null,
    blurb: "Attendance is attestation. Both surfaces sign with the biometrics on your own phone.",
    lessons: [
      {
        title: "Signing into a safety meeting",
        steps: [
          "Open the meeting under SAFETY → Safety Meetings and press SIGN IN — I'M HERE. Face ID/fingerprint on your own phone is the signature.",
          "No links get sent — the phone in your pocket is the signing device.",
          "Sign-in closes when the meeting closes or its date passes. Late? A manager can add you — with a recorded reason.",
        ],
      },
      {
        title: "Near misses — every meeting",
        steps: [
          "Every meeting asks about near misses. If one is raised, a REQUIRED report action item is created automatically.",
          "None raised? The meeting stamps that too — an affirmative record beats a blank.",
        ],
      },
      {
        title: "Certifications",
        steps: ["SAFETY → Training holds your certifications and their expiries — what you're carded for and when it lapses."],
      },
      {
        title: "What a JSA signature means",
        steps: [
          "Signing a JSA attests you were there and briefed — attendance, not authorship.",
          "The JSA stays editable after signing BY DESIGN: conditions change on location and the paper must follow the truth.",
        ],
      },
    ],
  },
  {
    key: "dvir",
    icon: "🛻",
    title: "VEHICLE INSPECTIONS (DVIR)",
    gate: { perm: "perform_inspections" },
    blurb: "FMCSA-grade pre/post-trip inspections, red tags, and why a ticket won't sign without them.",
    lessons: [
      {
        title: "Pre-trip before you roll",
        steps: [
          "Start the day's inspection from the DVIR bar on your ticket or the inspection page — pick the vehicle, walk the checklist.",
          "A ticket will NOT sign while its vehicle is missing a passing pre-trip for that date. The DVIR bar on the ticket shows green or red so you know before you're standing in front of the customer.",
          "Defects found? The inspection records them and the vehicle needs a re-inspection after repair.",
        ],
      },
      {
        title: "Red tags",
        steps: [
          "A red-tagged vehicle is OUT OF SERVICE — no tickets sign against it until the tag is cleared.",
          "Red tags carry the reason and the full time-stamped trail: who tagged, who repaired, who cleared.",
        ],
      },
    ],
  },
  {
    key: "time",
    icon: "🕐",
    title: "CLOCK & MY HOURS",
    gate: null,
    blurb: "Clocking in and out, and checking your own hours.",
    lessons: [
      {
        title: "The clock",
        steps: [
          "TIME → Clock. CLOCK IN when you start, CLOCK OUT when you stop. The ticket's clock-in readiness strip shows when the job is set up enough to clock into.",
          "TIME → My Hours shows your own record. Something wrong? Submit a correction — it routes to a reviewer, nothing gets silently edited.",
        ],
      },
    ],
  },
  {
    key: "fleet",
    icon: "📦",
    title: "FLEET & INVENTORY",
    gate: { perm: "view_inventory" },
    blurb: "Equipment, trucks, and where everything is.",
    lessons: [
      {
        title: "The four surfaces",
        steps: [
          "INVENTORY tracks equipment out against Work Orders — what's on which location and what's home.",
          "ASSETS is the registry of owned equipment; VEHICLES is the fleet with its DVIR standing and red-tag status.",
          "YARDS defines the bases trucks roll from — drive-time math and the LV YARD / RET YARD stamps key off them.",
        ],
      },
    ],
  },
  {
    key: "todos",
    icon: "✓",
    title: "ACTION ITEMS",
    gate: null,
    blurb: "Your tasks first, the whole board one tap away, and a by-person view for managers.",
    lessons: [
      {
        title: "Working the list",
        steps: [
          "ACTION ITEMS in the nav (or ☐ My Tasks on the Dashboard) opens YOUR tasks — assigned to you or created by you. Flip SHOW to ALL for the whole board; nothing is hidden, your work just comes first.",
          "Every card says FOR who and by who on its face — FOR YOU lights up blue. Overdue dates go red.",
          "Assigned a task? The assignee's phone gets a text the moment it lands (if they've opted in to SMS).",
          "Checking the box asks before it completes and requires completion notes — that's the closure record a manager reviews.",
          "Tasks are editable after creation, and safety-meeting action items land in this same pool automatically.",
          "Managers see a third view — BY PERSON: every employee's open, overdue, and completed-this-week at a glance, completion notes readable. Assigned work is audited work.",
        ],
      },
    ],
  },
  {
    key: "approval",
    icon: "✅",
    title: "OFFICE — APPROVAL & BILLING",
    gate: { perm: "approve_tickets" },
    blurb: "Final Review, the variance gate, and what approval actually asserts.",
    lessons: [
      {
        title: "Approving tickets",
        steps: [
          "FINAL REVIEW queues every signed / sig-not-required ticket. Open one and press APPROVE TICKET.",
          "If the crew's clocked time and the ticket's billed hours disagree, the variance gate shows both numbers and asks before approving — the difference is noted in the audit trail.",
          "Billed-vs-worked is office-only knowledge; the invoice carries what the user entered, untouched.",
          "Approved tickets flow to accounting (SENT TO ACCOUNTING → QB VERIFIED) and lock hard.",
        ],
      },
    ],
  },
  {
    key: "reports",
    icon: "📊",
    title: "REPORTS",
    gate: { perm: "view_reports" },
    blurb: "Revenue, operations, and efficiency views over everything the field entered.",
    lessons: [
      {
        title: "Reading the reports",
        steps: [
          "REPORTS renders from live ticket data — there is no separate entry step; if the field entered it, it's here.",
          "Revenue slices by customer and type; operations by crew and well; efficiency by hours and travel.",
        ],
      },
    ],
  },
  {
    key: "admin",
    icon: "⚙️",
    title: "ADMIN",
    gate: { roles: ["owner", "admin"] },
    blurb: "People, permissions, and the app's own health.",
    lessons: [
      {
        title: "People & permissions",
        steps: [
          "The gear menu holds Employees, Job Titles, and Permissions. The permissions matrix is enforced server-side — unchecking a box actually closes the door, not just hides the button.",
          "New hires get the onboarding packet (New Hire Packet page) — documents sign biometrically, office items get office-marked.",
        ],
      },
      {
        title: "Watching the app itself",
        steps: [
          "ERROR LOG (gear menu) is the app reporting its own failures — frontend crashes, backend errors, with the breadcrumb story of what the user did leading up to it.",
          "ACTIVITY LOG is the who-did-what trail — every sign, approve, edit, and override, in plain words.",
        ],
      },
    ],
  },
];

// Flat count for the page header ("N modules · M lessons for your role").
export const countLessons = (modules) => modules.reduce((n, m) => n + m.lessons.length, 0);

// ─── Dashboard tour steps (SpotlightTour anchors: data-tut="...") ───────────
// A step whose anchor is absent for this user/layout auto-skips.
export const DASHBOARD_TOUR_STEPS = [
  { tut: "nav", title: "The nav", body: "Every page lives in these pills. Grouped ones (TIME, SAFETY, HISTORY) open on hover or tap." },
  {
    tut: "search",
    title: "Search everything",
    body: "WO numbers, ticket numbers like 300178-1, people, customers, documents, vehicles — one box, scoped to what you're allowed to see.",
  },
  {
    tut: "tasks",
    title: "Tasks",
    body: "The action-item pool — every open task, including the ones safety meetings create automatically. The → name on each row is who it's for.",
  },
  { tut: "new-wo", title: "Start here", body: "A Work Order is the container: one customer, one location, its wells. Every ticket is written against one." },
  {
    tut: "wo-card",
    title: "A Work Order card",
    body: "One active job. The colored dots are its tickets — each type has its color. Tap to open everything on the job.",
  },
  { tut: "gear", title: "Admin lives here", body: "Employees, permissions, documents, the error log — the office side of the house." },
];
