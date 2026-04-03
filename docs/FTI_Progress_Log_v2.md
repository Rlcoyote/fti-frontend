# FTI Operations App — Progress Log
*Governed by: The Constitution of the Ancient Mariner*
*Purpose: Record mistakes, fixes, and lessons learned. Inform future decisions.*
*Format: Append forward. Never delete. Amend when wrong.*
*Last updated: 2026-04-03*

---

## HOW TO USE THIS LOG

Read this before touching any code. When a mistake is made, log it here before fixing it. When a fix is implemented, log the fix and the reasoning. When a session ends, note what was left unresolved. When a new session begins, start here.

A summary is often incomplete. If the lesson requires a story, write the story. Match depth to severity.

---

## LOG ENTRIES

---

### [2026-03-10] PROJECT INCEPTION
**What happened:** Started from a contaminated knowledge base (451KB). Non-FTI content mixed throughout.
**Fix:** Manually rebuilt clean knowledge base (270KB).
**Lesson:** Never assume an inherited document is clean. Audit the source before building on it.
**Status:** Resolved.

---

### [2026-03-10] APP STARTED FROM 728 LINES — NO BACKEND
**What happened:** Initial app was UI-only. No persistence.
**Fix:** Full backend built — Node.js + Express + PostgreSQL on Railway. 16 tables.
**Lesson:** Mock data is fine for prototyping. The moment persistence matters, the backend must be real. Do not let mock data linger.
**Status:** Backend live. Mock data still partially present in frontend — flagged for code review pass.

---

### [2026-03-XX] NAMING CONFLICT ON RAILWAY DEPLOY — 5 HOURS LOST
**What happened:** Naming conflict during Railway deployment caused push to silently fail. Not identified until Reggie asked methodical questions.
**Fix:** Identified mismatch. Corrected. Redeployed.
**Lesson:** Verify version string in nav after every deploy. If it does not match, the deploy did not take.
**Prevention protocol:** Always check live URL for version string after every git push.
**Status:** Resolved.

---

### [2026-04-02] SIGNINGTRACKER NOT RENDERING POST-SIGN
**What happened:** After signing via public page, SigningTracker rendered nothing.
**Root cause:** handleSign called setTicket but did not include emailed_at. SigningTracker requires both.
**Fix (v26.40):** Captured response JSON from sign API. Merged result.emailed_at into state update.
**Lesson:** Trace every code path that updates state containing fields that downstream components depend on.
**Status:** Resolved in v26.40.

---

### [2026-04-02] TIME INPUT FORMAT ISSUES
**What happened:** type="time" inputs rendered inconsistently. Leading zeros confused field personnel.
**Fix (v26.41):** Replaced with select dropdowns — 48 options, 30-min increments, 12hr AM/PM.
**Lesson:** For field-facing inputs, controlled dropdowns are more reliable than native browser inputs.
**Status:** Resolved in v26.41.

---

### [2026-04-02] DUPLICATE COMPONENT BODY AFTER STR_REPLACE
**What happened:** AddTicketModal rewritten by replacing only the function signature. Old body remained below the new one.
**Root cause:** str_replace targeted only the signature, not the full function.
**Fix:** Python delete of orphaned lines by index.
**Lesson:** Full-function replacements must include signature through closing brace. After any full-function rewrite, grep for the function name — confirm exactly one instance exists.
**Prevention protocol:** grep for function name after every full-function replacement before build test.
**Status:** Resolved in v26.43.

---

### [2026-04-02] PERMISSIONS BUTTON MISSING FOR MANAGER ROLE
**What happened:** Eli (manager) had all permissions checked but could not see the ⚙ button.
**Root cause:** Both nav locations guarded with ["owner", "admin"] only.
**Fix (v26.42):** Updated both guards to include "manager".
**Lesson:** When a role is added or renamed, audit every role-based guard in the entire file.
**Prevention protocol:** Role change checklist — rename all strings, audit all permission arrays, update DB, verify UI.
**Status:** Resolved in v26.42.

---

### [2026-04-02] ROLE RENAME REQUIRED SEPARATE DB MIGRATION
**What happened:** Renaming ops_mgr → manager in frontend did not update existing DB records.
**Fix:** Manual SQL UPDATE on users table.
**Lesson:** Frontend role string changes and DB role value changes are two separate operations. Always pair with explicit DB migration.
**Status:** Resolved in v26.42.

---

### [2026-04-02] NAV ENCROACHING ON BROWSER CHROME
**What happened:** Nav rendered flush to top of browser window on mobile.
**Root cause:** No top padding, no safe area inset awareness.
**Fix (v26.43):** padding-top: max(8px, env(safe-area-inset-top)).
**Lesson:** Any element at top of mobile layout must account for env(safe-area-inset-top).
**Status:** Resolved in v26.43.

---

### [2026-04-02] REPO FOLDER LOCATION UNKNOWN — REPEATED FAILED DEPLOYS
**What happened:** fti-backend folder not found at expected path. Multiple deploy attempts failed. Significant time lost.
**Root cause:** Repo folders never formally documented at project inception.
**Fix:** Located fti-backend inside FT - AI Claude GPT Files. Paths documented in Constitution Article XVI.
**Lesson:** Deploy paths must be documented at project inception. Never assume folder locations.
**Status:** Resolved. Paths documented.

---

### [2026-04-03] GOOGLE MAPS PIN RESOLVER FAILING — 30+ MINUTES LOST TO ASSUMPTIONS
**What happened:** resolve-map-pin route returned "Resolving..." indefinitely. Backend logs showed no request received for that route.
**What the AI did wrong:** Instead of immediately providing a verification command, proposed three successive theories without confirming what was actually deployed. Suggested two different Google APIs. Never ran git log or checked Railway logs first.
**Root cause:** Unknown at session end. git log --oneline -5 in fti-backend was never run.
**What should have happened:** Provide git log immediately. Read result. Diagnose from evidence. One command. 60 seconds.
**Lesson:** Never assume the cause of a system failure. Verify deployment state first, always.
**New Article:** Constitution Article XV — Never Assume. Verify First.
**Status:** UNRESOLVED. First task of next session — run git log --oneline -5 in fti-backend.

---

### [2026-04-03] MODEL SILENTLY SWITCHED TO SONNET MID-SESSION
**What happened:** Claude.ai automatically switched from Opus to Sonnet. Behavior degraded — increased accommodation, assumption-based responses, circular debugging.
**How it was caught:** Reggie noticed the behavior change and checked manually.
**Impact:** Pin resolver debugging became circular. Constitution quality degraded in the Sonnet portion.
**Lesson:** Verify model at session start. Sonnet is not acceptable for this project. The AI should flag it; if it cannot, the human checks.
**New Article:** Constitution Article XVII — Verify the Model.
**Status:** Resolved for this session. Protocol in place.

---

### [2026-04-03] PIN RESOLVER FIXED — v26.47
**What happened:** Google Maps pin resolver hung indefinitely on both short URL formats. Previous approach (v26.46) attempted to follow the full HTTP redirect chain — Google blocked or stalled the connection.
**Root cause:** Server-side HTTP GET/follow-redirect requests to maps.app.goo.gl are blocked or rate-limited by Google. The redirect chain never completes.
**Fix:** Single HEAD request captures only the first redirect `Location` header. Google returns the full URL with coordinates in the first hop. No chain following. No body parsing. Added `/maps/search/lat,+lng` pattern for desktop Chrome share links (different URL format than mobile).
**Time lost to previous approach:** ~45 minutes across v26.45-v26.46 sessions.
**Lesson:** Article XIX — check if the tool already exists before building custom. A single curl HEAD request proved the solution in 5 seconds. Article XV — verify before theorizing.
**Status:** Resolved in v26.47.

---

### [2026-04-03] MJC CREATE MODAL CALLING WRONG ROUTE
**What happened:** MJC create modal's Google pin resolver called `/resolve-map-link` (old route name) instead of `/jobs/resolve-map-pin`.
**Root cause:** Route was renamed during v26.44 refactor but this call site was missed.
**Fix:** Updated to `/jobs/resolve-map-pin` in v26.47.
**Lesson:** When renaming a route, grep the entire frontend for ALL references. One missed call site is a silent failure.
**Status:** Resolved in v26.47.

---

### [2026-04-03] RATE SHEET DROPDOWN CLIPPED BY MODAL
**What happened:** Rate sheet item picker opened as a small absolute-positioned dropdown inside the Add Ticket modal. On scrolled-down modals, the dropdown was clipped below the viewport — "like looking through a tank slit."
**Fix:** Replaced with full-screen centered overlay. Search bar at top, item count, full scrollable list, backdrop close. Article X — field hand at 2 AM needs to see and tap clearly.
**Status:** Resolved in v26.47.

---

### [2026-04-03] TIME DROPDOWNS START AT MIDNIGHT
**What happened:** All time fields (LV Yard through Ret Yard) started at 12:00 AM. Field personnel rarely leave the yard at midnight — scrolling past 12 irrelevant options every time.
**Fix:** Rotated dropdown options. LV Yard, Arrival, Due On Loc, Job Start start at 6:00 AM. Job End and Ret Yard start at 12:00 PM. All 48 options still available — they wrap around.
**Status:** Resolved in v26.47.

---

### [2026-04-03] COPY COORDS BUTTON COPIED WRONG DATA
**What happened:** COPY COORDS button on MJC modal copied raw `lat,lng` instead of the Google Maps link.
**Fix:** Renamed to COPY PIN. Now copies the Google Maps link from the input field.
**Status:** Resolved in v26.47.

---

### [2026-04-03] CONSTITUTION ARTICLES XVIII, XIX, XX ADDED
**What happened:** Three gaps identified during this session's debugging.
**Articles added:**
- XVIII — The Roadblock Protocol (don't repeat failed approaches, don't ask "what do you want to do")
- XIX — Think Outside the Box (check if the tool exists before building custom)
- XX — File Naming and Versioning (consistent naming convention for all project files)
**Status:** Complete.

---

### [2026-04-03] EDIT JOB MODAL — NO DIRTY STATE WARNING
**What happened:** Clicking outside the Edit Job modal after making changes closed it without warning. All edits lost.
**Root cause:** EditJobModal used ModalWrap which passes onClose directly to backdrop click. No dirty state detection existed.
**Fix (v26.47):** Added origRef tracking all 17 fields (customer, state, county, wells, AFE, contacts, billing, status, pin). isDirty() compares current state to origRef. handleClose intercepts backdrop click — shows "Unsaved Changes" dialog if dirty.
**Lesson:** Every modal that accepts user input needs dirty state protection. ModalWrap is shared — dirty logic belongs in the individual modal, not the wrapper.
**Status:** Resolved in v26.47.

---

### [2026-04-03] VERSION SUFFIX ANTI-PATTERN
**What happened:** Asset filenames were given letter suffixes (26.47b, 26.47c) to bust Railway cache, but the version string in the footer stayed v26.47. No way to visually confirm which build was deployed.
**Lesson:** Every change gets a full version bump. No letter suffixes. Article XX.
**Status:** Protocol established. Future changes advance the number.

---

## OPEN ISSUES (as of 2026-04-03)

| # | Issue | Severity | First Noted |
|---|---|---|---|
| 1 | ~~resolve-map-pin failing~~ | ~~Critical~~ | ~~v26.46~~ RESOLVED v26.47 |
| 2 | req_loc_time DB column orphaned | Low | v26.41 |
| 3 | Mock data still in frontend | Medium | inception |
| 4 | ReportsPage is placeholder | High | v26.34 |
| 5 | JSA crew signatures not built | Medium | v26.35 |
| 6 | Manager cannot modify owner/admin — verify | Medium | v26.42 |
| 7 | ~~origRef dirty tracker missing time/mileage fields~~ | ~~Medium~~ | ~~v26.40~~ RESOLVED v26.47 |
| 8 | QB API not started | Critical | inception |
| 9 | File/folder reorganization deferred | Medium | 2026-04-03 |
| 10 | Edit Job modal pin — verify saving to DB | Medium | v26.45 |
| 11 | Drive distance calculation — monitor for incorrect results | Low | v26.47 |

---

*Progress Log v2 — initiated 2026-04-02 | updated 2026-04-03*
*Governed by Constitution of the Ancient Mariner, Article VI*
*Append forward. Never delete. Amend when wrong.*
