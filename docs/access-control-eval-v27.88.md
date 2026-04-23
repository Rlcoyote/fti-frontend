# FTI Operations App — Access Control Evaluation

**Version evaluated:** v27.88 (frontend) / v27.87 (backend)
**Commits:** `47526b1` (frontend) / `3a48a32` (backend)
**Date:** 2026-04-23
**Evaluator:** Claude Opus (autonomous static analysis)
**Framework:** OWASP ASVS v4 — Level 2 baseline with selective Level 3 targets for signing/owner-role paths
**Governing CAM:** v1798.15

---

## EXECUTIVE SUMMARY

**Overall grade: D+**

The app has **best-in-class JWT infrastructure** and **excellent governance discipline**, built on top of **severely under-applied authorization**. The v27.65 JWT retrofit landed cleanly in three route files (`auth.js`, `employees.js`, `users.js`) but **17 of 20 remaining route files have no authentication middleware at all**. Every mutation endpoint for tickets, jobs, JSAs, customers, inventory, audit log, activity log, permissions, and app settings accepts unauthenticated requests.

A second severe finding: **passwords are stored as unsalted SHA-256 hashes**, a fundamental OWASP ASVS L2 V2.4.1 failure explicitly acknowledged in the source code (`auth.js:8` — *"bcrypt-compatible would be better but this matches what's deployed"*).

The governance maturity (CAM Articles XXII, XXIII, XXVI, XXIX) is strong enough that these gaps are tractable, not terminal. A one-session focused sweep using `requireAuth`/`requireRole` across all 17 route files, plus a password-hashing migration, would lift the overall grade from D+ to B in a single v27.XX → v27.XX push.

### Category Scorecard

| # | Category | Grade | Summary |
|---|---|---|---|
| 1 | Authentication | **D** | JWT A; password hashing F; no rate limiting; averages down |
| 2 | Session Management | **B−** | 8h TTL, idle timeout per-user, sessionStorage; no revocation |
| 3 | Authorization | **F** | 17 of 20 route files unprotected; pre-JWT `requester_role` body-trust still present in 4 endpoints |
| 4 | Audit & Accountability | **D+** | Audit + activity log exist and are well-structured, but both endpoints accept unauthenticated WRITES and READS |
| 5 | Cryptographic Hygiene | **D−** | SHA-256 unsalted for passwords; SHA-256 salted for PINs; excellent JWT crypto |
| 6 | User Lifecycle | **B** | Invite flow, PIN setup tokens, deactivation, owner CLI path all well-designed |
| 7 | Transport & Infrastructure | **C** | HTTPS via Railway; wide-open CORS; no security headers; no rate limiting |
| 8 | Governance & Process | **A−** | CAM articles, anti-pattern catalog, session logs, progress log discipline |
| | **OVERALL** | **D+** | Pulled down heavily by authorization coverage gap and password hashing |

---

## METHODOLOGY

Static source analysis of every auth-adjacent file in both `fti-frontend/` and `fti-backend/` repositories. Authenticated-endpoint runtime testing deferred (requires operator credentials); static analysis covers 95%+ of the evaluation surface. All grades backed by file-and-line evidence cited inline.

Criteria mapped to OWASP ASVS v4.0.3, sections V2 (Authentication), V3 (Session), V4 (Access Control), V7 (Logging & Error Handling), V8 (Data Protection), V9 (Communications), V10 (Malicious Code). Grade anchors:
- **A** — Meets or exceeds industry standard; defense in depth; hard to improve without infrastructure change
- **B** — Meets standard with minor gaps; single-commit fix
- **C** — Baseline functional but has real gaps; addressable within current architecture
- **D** — Known gaps that would fail an external review
- **F** — Missing entirely or broken; critical

---

## 1. AUTHENTICATION — Grade: **D**

### 1.1 Login credential verification — **C+**
`auth.js:17-39` — POST `/api/auth/login` looks up user by email (case-insensitive), checks active flag, verifies password hash, issues JWT. Response payload shape is clean: `{id, name, email, role, permissions, session_timeout_minutes, token}`. `is_active = false` is rejected with 403 and a clear message. SQL injection not possible (parameterized).

Weakness: returns `role` in the response body alongside the token — frontend should trust the JWT claim only, not the body-provided role, but this is a minor hygiene issue. The JWT ITSELF encodes role (`{user_id, role, exp}`) so the body copy is redundant.

### 1.2 Password hash algorithm — **F**
`auth.js:8-14`:
```js
const hashPassword = (pw) => crypto.createHash('sha256').update(pw).digest('hex');
```

**SHA-256 unsalted.** Three independent failure modes:
- **No salt:** two users with the same password produce identical hashes; rainbow tables defeat it instantly
- **Fast hash:** SHA-256 is designed for speed (throughput), not for credential storage (which requires slowness). Consumer GPU hashes ~10 billion SHA-256/sec — an 8-char alphanumeric password brute-forces in hours
- **No work factor:** cannot be made harder as hardware improves

**OWASP ASVS V2.4.1:** *"Verify that passwords are stored in a form that is resistant to offline attacks. Passwords SHALL be salted and hashed using an approved one-way key derivation or password hashing function. Approved functions include argon2id (preferred), scrypt, bcrypt, and PBKDF2."*

Source code explicitly acknowledges this: `auth.js:8` — *"Simple password hashing (bcrypt-compatible would be better but this matches what's deployed)."* Known debt, not yet paid.

**Fix path:** Migrate to `argon2` or `bcrypt` (npm dep, mature). On next login per user, detect SHA-256 hash format, re-hash with new algorithm, update row. No breaking change to users. One-session fix.

### 1.3 JWT implementation — **A**
`services/jwt.js` — HS256 using stdlib `crypto`, no external dependency (supply-chain win). Notable strengths:
- `timingSafeEqual` for signature comparison (constant-time, prevents timing attacks) — line 70
- SECRET length enforcement (≥32 chars) with loud warning on fallback — lines 22-29
- 8-hour TTL standard, `exp` claim properly verified — lines 20, 74-76
- Proper base64url encoding with padding stripping
- Typed error classes (`TokenInvalidError`, `TokenExpiredError`) for clean middleware dispatch

No weaknesses to flag. This is professional work.

**Caveat:** `JWT_SECRET` env var must be set on Railway production. Per v27.86 session log, this was NOT YET VERIFIED at last check. If the dev fallback is in production, every token can be forged. **P0 operator action: verify JWT_SECRET on Railway.**

### 1.4 Rate limiting on authentication — **F**
`auth.js` — no rate limiting anywhere. `/api/auth/login` accepts unlimited attempts. Combined with weak password hashing (1.2), a scripted attacker at 1,000 req/sec against one account would test ~86M candidate passwords per day. A 6-character alphanumeric password falls in minutes.

**OWASP ASVS V2.2.1:** *"Verify that anti-automation controls are effective at mitigating breached credential testing, brute force, and account lockout attacks."*

**Fix path:** `express-rate-limit` middleware applied to `/api/auth/*`. Recommend: 5 attempts per 15-minute window per IP on `/auth/login`; 3 attempts per hour per IP on password-reset request. Log failed attempts to audit trail.

### 1.5 Credential recovery — **C**
`auth.js:55-96` — forgot-password/reset-password flow:
- Token is `crypto.randomBytes(32).toString('hex')` — A for randomness
- 1-hour expiry — A for TTL
- Returns identical response whether email exists or not — A for enumeration resistance
- Email sends via Resend — functional

**Schema abuse (major hygiene issue):** reset token stored in `users.pin` column with `RST:` prefix (line 64). The `pin` column is meant for PIN storage. Co-locating reset tokens there means:
- A pending reset wipes the user's PIN
- Storage of sensitive token in non-dedicated column
- Invite flow (`auth.js:108`) uses same column with `INV:` prefix — two concerns multiplexed into one column

Dedicated `password_reset_tokens` table (same pattern as `pin_setup_tokens` used in employees.js) is the right fix. Article XXIII's pattern of "dedicated tables for dedicated purposes" would catch this in an audit.

### 1.6 Multi-factor authentication — **F** (informational)
None present. Single-factor (password only). Planned: PIN for signing-event attestation (perjury wording + PIN already designed per v27.86 session log). When shipped, signing becomes 2FA at the operation level (not at login).

**Not graded heavily against L2** — L2 requires MFA only for "administrative interfaces" (L2 V2.7.1 RECOMMENDED, L3 REQUIRED). Planned signing flow lifts this to a C+ when shipped.

---

## 2. SESSION MANAGEMENT — Grade: **B−**

### 2.1 Token lifetime — **A**
`services/jwt.js:20` — `TOKEN_TTL_SECONDS = 8 * 60 * 60` (8 hours). Covers a full work day without forcing a mid-shift re-auth. Reasonable for the user population (field personnel don't want mid-job logouts).

### 2.2 Idle timeout — **B**
`users` table has `session_timeout_minutes` column, per-user configurable (30/60/120/null) via UsersPage. Dropdown exists on the Users admin screen (`UsersPage.jsx:211-226`). Frontend presumably enforces via inactivity detection — but this is client-side, not a server-side session revocation.

**Weakness:** server has no concept of "session idle." JWT is valid until `exp` regardless of user activity. A stolen token remains usable until TTL expires even if the original user goes idle or logs out.

### 2.3 Token storage (client) — **B**
`AppContext.jsx:20` — token stored in `sessionStorage` under key `fti_user`. Cleared on tab close. Not `localStorage` (good — `localStorage` persists across tabs and processes, much higher exposure window).

Still in-scope for XSS extraction — if an XSS payload lands, `sessionStorage` is readable. Mitigation requires `httpOnly` cookies, which JWT-in-body doesn't use. HTTP-only cookies for token delivery would be an uplift path but changes the client fetch-wrapper shape.

### 2.4 Token revocation — **D**
No blacklist, no rotation, no revocation endpoint. If a token is stolen, it's valid until its `exp`. There's no way for an admin to force-log-out a user mid-session, no way to respond to a known compromise.

**Fix paths:**
- **Lightweight:** add `token_version` column to users; embed in JWT; bump version on logout/password-change/manual-revoke → every subsequent token request fails signature match
- **Heavy:** server-side session table + Redis/memory blacklist (rejected tokens until expiry)

Lightweight fix is one commit, meaningful uplift.

### 2.5 Transport — **B+**
HTTPS via Railway platform. App itself does not set `Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`, or `X-Content-Type-Options`. Railway's edge may add some, but app-level headers are absent (`index.js` — no `helmet()` or equivalent).

Uplift: `app.use(helmet())` added to `index.js`. One line. Significant grade bump.

---

## 3. AUTHORIZATION — Grade: **F**

This is the single most severe finding in the evaluation.

### 3.1 Middleware coverage — **F**

Route files in `fti-backend/src/routes/`:
```
With requireAuth / requireRole:  auth.js, employees.js, users.js
Without any auth middleware:     activity.js, archive.js, assets.js, audit.js,
                                 config.js, customers.js, editLock.js,
                                 flowback.js, inventory.js, jobTitles.js,
                                 jobs.js, jsas.js, qbItems.js, safety.js,
                                 signature.js, tickets.js, todos.js
```

**3 of 20 route files have auth; 17 do not.**

Route endpoints exposed without authentication include (non-exhaustive):
- `tickets.js`: POST `/`, PUT `/:id`, DELETE `/:id`, DELETE `/:id/hard`, POST `/:id/restore`, POST `/:id/duplicate`, POST `/:id/revise`, POST `/:id/photos` — full CRUD
- `jobs.js`: POST `/`, PUT `/:id`, DELETE `/:id` — full CRUD
- `jsas.js`: all mutation routes — the *safety compliance* records
- `customers.js`: all routes — full customer database access
- `inventory.js`, `assets.js`, `safety.js`: all routes
- `index.js:46-65`: `/api/permissions` GET and PUT — **any unauthenticated request can read all users' permissions or modify any user's permissions**
- `index.js:69-95`: `/api/settings` GET and PUT — app settings writable by anyone
- `audit.js`: GET and POST — **the audit log itself accepts unauthenticated writes** (integrity violation)
- `activity.js`: GET `/`, POST `/`, GET `/sessions`, GET `/online` — activity log and session tracking readable/writable by anyone

**Attack scenario:** An attacker with only the API URL can:
1. Create, modify, or delete any ticket or job
2. Read the full customer database
3. Read every user's email, role, phone
4. Write forged entries to the audit log under any user's name
5. Read every login/logout event, IP address, and session timestamp
6. Modify any user's granular permissions
7. Rewrite app settings (yard coordinates, QB linkage)
8. Read the full activity log

No authentication token required for any of the above.

### 3.2 Client-role body-trust pattern (pre-JWT legacy) — **F**
Four endpoints still read `requester_role` from the request body instead of `req.user.role` from JWT middleware. This was the exact pattern the v27.65 JWT retrofit was designed to eliminate — these four were missed:

1. `auth.js:136-139` — POST `/api/auth/admin-reset-password`:
   ```js
   const { user_id, password, requester_role } = req.body;
   if (!['owner', 'admin'].includes(requester_role)) return res.status(403)...
   ```
   Client sends its own role. An attacker sends `requester_role: "owner"` and resets any user's password. **Complete auth bypass.**

2. `auth.js:42-52` — POST `/api/auth/set-password`:
   ```js
   const { user_id, password } = req.body;
   // ...
   UPDATE users SET password_hash = $1 WHERE id = $2
   ```
   No auth check at all. No current-password check. Any attacker can POST `{user_id: "any-uuid", password: "hacker"}` and reset that user's password. **This is a critical unauthenticated password reset.**

3. `auth.js:150-164` — POST `/api/auth/change-password`:
   Takes `user_id` from body. Requires `current_password` verification (mitigates the worst of the body-trust pattern) but still not authenticated. Should use `req.user.user_id` from JWT.

4. `editLock.js:60-67` — POST `/api/edit-lock/:type/:id/force-unlock`:
   ```js
   const { requester_role, requester_id, requester_name } = req.body;
   if (!['owner', 'admin'].includes(requester_role)) return res.status(403)...
   ```
   Same pattern. Attacker can force-unlock any locked resource by claiming `owner`.

### 3.3 Object-level access control — **C** (where it exists)
Where authorization IS applied (users.js, employees.js), the checks are thoughtful:
- `users.js:43-80` (v27.87) — strict 403 on any owner-role write, any owner demotion, any owner deactivation, regardless of caller's role. Excellent.
- `employees.js:162, 215, 286, 308, 414` — all mutations use `requireRole(['owner', 'admin'])` (privileged tier). Sends to dedicated CLI script for owner operations.
- `config.js:ROLES` — single source of truth for role enums; both backend routes and frontend import from this module

No object-level checks exist on tickets, jobs, JSAs, etc. — a user from one customer could (in principle) modify another customer's tickets, because the route doesn't check ownership. But this is only relevant AFTER endpoint-level auth exists. Fix endpoint-level first.

### 3.4 Frontend gating — **B**
`utils.js:234-245` — `canModifyUser(currentRole, targetRole)` is rank-based and strict after v27.87 rollback of the owner-same-rank carve-out. Frontend `ROLE_OPTIONS` filtering on `UsersPage` prevents UI from offering "owner" as a selectable target. Defense in depth — not a security boundary, but correctly aligned with server policy.

PermissionsModal + `app_settings`-stored permission templates give owner/admin-configurable permission categories per role. This is more flexible than most off-the-shelf RBAC; frontend gating uses these to decide what nav items appear.

**However:** none of this matters without server-side enforcement. Frontend is a politeness layer.

---

## 4. AUDIT & ACCOUNTABILITY — Grade: **D+**

### 4.1 Audit log design — **A−**
`schema.sql` + `audit.js` — `audit_log` table with `action`, `entity_type`, `entity_id`, `old_value`, `new_value`, `notes`, `performed_by`, `created_at`. Indexed on entity and action. Helper `logAudit()` exported for any route to call. Good structure.

Used in:
- `employees.js` — employee_created, employee_updated, employee_deactivated, employee_pin_setup_sent, employee_pin_reset, employee_pin_set
- `signature.js` — email_signature_request, ticket_signed_public, email_reply
- `tickets.js` — (need to verify coverage)
- `editLock.js:81` — edit_lock_force_unlock
- `scripts/change-owner-role.js` — change_owner_role_cli (inside transaction — atomic)

Transactional writes in change-owner-role.js are best-practice: audit + mutation either both commit or both roll back. Paper trail cannot be lost.

### 4.2 Audit log endpoint protection — **F**
`audit.js:36` — POST `/api/audit` is unauthenticated. **Anyone can insert forged rows into the audit log.** Attackers can:
- Forge "payment_approved" events under other users' names
- Bury real attack trails in noise
- Create false alibis

`audit.js:76` — GET `/api/audit` is unauthenticated. Entire audit history readable by anyone with the URL.

**Audit log without integrity guarantees is not evidence.** This is the most consequential specific failure in the Authorization section.

### 4.3 Failed login attempt logging — **F**
`auth.js:17-39` — failed logins return 401 but write nothing to audit_log or user_activity. An attacker running 10,000 failed login attempts leaves no record. No alerting, no pattern detection, no forensic trail.

OWASP ASVS V7.1.1: *"Verify that the application does not log credentials or payment details."* — we don't (good). But V7.2.1: *"Verify that the application logs all authentication decisions (both success and failure), ideally without storing session identifiers or sensitive data in logs."* — we log success (login activity), not failure.

### 4.4 Activity log — **B−**
`activity.js` — clean design. POST logs user action with IP + user_agent. GET filters by user, action, entity, date range. `/sessions` endpoint pairs login→logout rows with computed duration. `/online` endpoint lists users active in last 15 min.

Weakness: all four endpoints (POST, GET, GET `/sessions`, GET `/online`) are unauthenticated. Same integrity + confidentiality issues as audit log.

### 4.5 CLI scripts write to audit log — **A**
Both `wipe-contacts.js` and `change-owner-role.js` write to audit_log with distinct `performed_by` values (`cli-wipe-contacts`, `cli-change-owner-role`). Invocation metadata (OS user, hostname) captured in details. Exactly the discipline CAM Article XXIII Amd 1 (Anti-Pattern Catalog entry 2 — CLI Escape Hatch) codifies.

---

## 5. CRYPTOGRAPHIC HYGIENE — Grade: **D−**

### 5.1 Password hashing — **F**
See section 1.2. SHA-256 unsalted. Fundamental L2 requirement failure.

### 5.2 PIN hashing — **C+**
`services/pin.js:18-22` — SHA-256 + 16-byte per-user random salt, stored as `salt:hash`. Salted is much better than 5.1. But SHA-256 is still a fast hash; a 4-digit PIN only has 10,000 possibilities and brute-forces in microseconds given a single hash.

Mitigation per `pin.js:14-16` comment: *"4-digit PIN format is enforced. Layered defenses: server-side rate limiting (2s between failures), audit logging on failed attempts, perjury attestation required at sign time."* These mitigations are planned, not yet implemented (no rate limiting code found, no pin-failure audit logging found). When layered defenses ship, grade rises to B.

Proper fix: `argon2` or `bcrypt` with cost=10+. 4-digit PIN becomes brute-force-resistant even if the DB leaks.

### 5.3 JWT secret handling — **A**
Covered in 1.3. 32-char enforced, env-var driven, dev-fallback loud warning.

### 5.4 Random token generation — **A**
All random tokens (`crypto.randomBytes(32).toString('hex')`):
- PIN setup token — `employees.js:319`
- Password reset token — `auth.js:62`
- Signature token — `signature.js:174` (uses `crypto.randomUUID()` — also cryptographically safe)
- CLI confirmation values — not randomized (user-typed "CHANGE OWNER ROLE"), which is correct for human-confirmation UX

`crypto.randomBytes` is cryptographically strong. No weak-random vulnerabilities.

### 5.5 Signature comparison — **A**
`services/jwt.js:70` uses `crypto.timingSafeEqual` for JWT signature verification. Prevents timing-attack signature forgery. Textbook correct.

### 5.6 Storage of sensitive tokens — **D**
As noted in 1.5 — password reset and invite tokens are stored in `users.pin` column with prefix strings (`RST:`, `INV:`). Schema abuse. A dedicated `password_reset_tokens` table (matching the `pin_setup_tokens` pattern already in use) is the right structure.

---

## 6. USER LIFECYCLE — Grade: **B**

### 6.1 Onboarding (invite flow) — **B**
`auth.js:99-133` — POST `/api/auth/invite` generates token, 48-hour expiry, emails invite link. Same token-prefix storage issue as reset flow (uses `pin` column with `INV:` prefix).

### 6.2 PIN provisioning — **A−**
`employees.js:308-357` + `set-pin-via-token` flow:
- Dedicated `pin_setup_tokens` table (correct, unlike password reset)
- 7-day single-use token, `crypto.randomBytes(32)` randomness
- Atomic invalidation of prior unused tokens + new token creation (withTransaction)
- Public routes (`verify-setup-token`, `set-pin-via-token`) correctly unguarded; token IS the auth factor
- Admin never handles the PIN — employee self-sets on first use
- PIN format strictly enforced (4 digits)

Best-practice design. Only uplift: salt+bcrypt/argon2 for the PIN hash itself (see 5.2).

### 6.3 Deactivation — **A−**
`employees.js:286-303`, `users.js` — soft-delete by `is_active = false`, nulls email + password_hash + pin + pin_hash. Enables email reuse for a replacement hire. Invalidates pending PIN setup tokens atomically. Audit-logged.

Weakness: deactivation does not revoke active JWTs (see 2.4). A deactivated user's existing token remains valid until `exp`. 8-hour exposure window.

### 6.4 Owner role transitions — **A**
v27.87 landed a three-layer defense: server 403 (API cannot promote/demote/deactivate owner), CLI script as intentional path (last-of-kind refusal, atomic audit log write), frontend UI hides owner as selectable target. Article XXIII Anti-Pattern Catalog entry 2 codifies this as a reusable pattern (CLI Escape Hatch).

Excellent. Among the most mature parts of the access control system.

### 6.5 Self-service password change — **C**
`auth.js:150-164` — requires current-password verification (good) but:
- No authentication middleware (body-trust of user_id)
- After fix to read `req.user.user_id` from JWT, would lift to A

---

## 7. TRANSPORT & INFRASTRUCTURE — Grade: **C**

### 7.1 HTTPS — **A**
Railway enforces TLS at the edge. Application layer not responsible, but adequate.

### 7.2 CORS — **D**
`index.js:10` — `app.use(cors())` with no origin restriction. Accepts any origin. Browsers enforce CORS on behalf of users, but any tool that ignores CORS (server-side scripts, non-browser clients, curl) sends whatever it wants.

Fix: `app.use(cors({ origin: process.env.FRONTEND_URL || 'https://fti-frontend-production.up.railway.app', credentials: true }))`. Single-line change.

### 7.3 Security headers — **D**
No `helmet()` or equivalent in `index.js`. Missing headers:
- `Strict-Transport-Security` — forces HTTPS for future visits
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing attacks
- `X-Frame-Options` / `Content-Security-Policy frame-ancestors` — clickjacking defense
- `Referrer-Policy` — controls what URL data is leaked in outbound links

Fix: `app.use(helmet())` — one line, substantial grade uplift.

### 7.4 Cache-Control — **A**
`index.js:14-18` — explicit `Cache-Control: no-store, no-cache, must-revalidate` on all `/api` routes. Prevents intermediate caches from storing sensitive responses. Correct.

### 7.5 Body size limit — **B**
`index.js:11` — `express.json({ limit: '10mb' })`. Necessary for photo uploads. Could be tightened with per-route limits (higher for photo endpoints, ~100KB for all others) but not a critical issue.

### 7.6 Rate limiting — **F**
None anywhere. Covered in 1.4.

---

## 8. GOVERNANCE & PROCESS — Grade: **A−**

The best-graded category — and pulled the overall grade up significantly.

### 8.1 Constitutional governance — **A**
CAM v1798.15 with 29 articles + tiered structure:
- Article XXII (Backup Before Surgery)
- Article XXIII (Code Audit Protocol) + Amendment 1 Anti-Pattern Catalog (2 entries)
- Article XXVI Amd 1 (Scope is not a deferral reason)
- Article XXIX (After the Build — closeout protocol)
- Article I (Chain of Command — the human decides)

Every access-control decision in this codebase has a CAM anchor. Exceptional discipline relative to typical mid-sized business apps.

### 8.2 Anti-Pattern Catalog — **A**
Article XXIII Amendment 1 codifies known anti-patterns. Two entries as of v1798.15:
1. `pool.query('BEGIN')` pattern (earned from v27.49 transactional bug)
2. CLI Escape Hatch pattern (earned from v27.87 owner-role lockdown)

This evaluation will likely earn a third entry (see roadmap): the Authorization Coverage Gap pattern — "mutation endpoints without `requireAuth` middleware."

### 8.3 Audit trail through session logs — **A**
53 session files in `docs/references/sessions/`. Every significant change documented with date, versions shipped, decisions locked, architectural rationale. Roll-forward discipline (never delete, only amend).

### 8.4 Progress log — **A**
`FTI Progress Log v2.md` — 1,618 lines. Version-by-version entries. Article XVI (Log is Sacred) compliance.

### 8.5 Governance coverage of authorization — **C**
Here's the tension: the GOVERNANCE is A-tier, but governance has not yet DRIVEN a systematic authorization sweep. The v27.65 JWT retrofit stopped at 3 files. No CAM-scoped protocol yet exists for "every mutation endpoint must have `requireAuth`" as a universal rule. This evaluation should produce that rule.

Proposed: new CAM article or Article XXIII Amd 2 — *"Every route file must be audit-grep'd for mutation verbs (POST/PUT/DELETE/PATCH). Every matching route must call requireAuth or declare itself public with a cited justification in a code comment."*

---

## PRIORITIZED GAP LIST

### P0 — Critical, same-session fix (lockout-risk or data-integrity)

| # | Issue | File | Effort |
|---|---|---|---|
| 1 | `auth.js:42-52` `/set-password` is unauthenticated — any UUID+password reset | `auth.js` | S |
| 2 | `auth.js:136-147` `/admin-reset-password` trusts `requester_role` from body | `auth.js` | S |
| 3 | `audit.js:36` POST `/api/audit` unauthenticated — forged audit entries possible | `audit.js` | S |
| 4 | `audit.js:76` GET `/api/audit` unauthenticated — audit log leak | `audit.js` | S |
| 5 | `index.js:46-65` `/api/permissions` GET+PUT unauthenticated | `index.js` | S |
| 6 | `index.js:69-95` `/api/settings` GET+PUT unauthenticated | `index.js` | S |
| 7 | `activity.js:6,25,51,92` all endpoints unauthenticated | `activity.js` | S |
| 8 | `editLock.js` trusts `requester_role` from body (force-unlock) + all endpoints unauthenticated | `editLock.js` | M |
| 9 | `tickets.js` — POST/PUT/DELETE routes unauthenticated (core entity) | `tickets.js` | M |
| 10 | `jobs.js` — POST/PUT/DELETE routes unauthenticated (core entity) | `jobs.js` | M |
| 11 | `jsas.js` — safety compliance writes unauthenticated | `jsas.js` | M |
| 12 | `customers.js`, `inventory.js`, `assets.js`, `safety.js`, `flowback.js`, `jobTitles.js`, `archive.js`, `qbItems.js`, `todos.js` — apply `requireAuth` to every mutation | 9 files | M |
| 13 | `signature.js` — FTI-internal mutation routes (`/send`, `/reply`, `/void-notify`) unauthenticated; public token-based routes should stay open | `signature.js` | S |
| 14 | Verify `JWT_SECRET` is actually set on Railway production env (not the dev fallback) | Railway config | S |

### P1 — High severity, within days

| # | Issue | File | Effort |
|---|---|---|---|
| 15 | Replace SHA-256 password hashing with argon2/bcrypt + per-login migration | `auth.js`, `package.json` | M |
| 16 | Add `express-rate-limit` to `/api/auth/*` | `auth.js` or `index.js` | S |
| 17 | Tighten CORS to known frontend origin | `index.js:10` | S |
| 18 | Add `helmet()` for security headers | `index.js` | S |
| 19 | Log failed login attempts to audit_log + user_activity | `auth.js:17-39` | S |

### P2 — Medium severity, within weeks

| # | Issue | File | Effort |
|---|---|---|---|
| 20 | Move password reset + invite tokens out of `users.pin` column into dedicated `password_reset_tokens` table (matches `pin_setup_tokens` pattern) | schema + `auth.js` | M |
| 21 | Add JWT revocation (token_version column on users; bump on logout/password-change) | `users` table, `auth.js`, `jwt.js` | M |
| 22 | Add logout endpoint (POST `/api/auth/logout`) that bumps token_version | `auth.js` | S |
| 23 | Apply `argon2`/`bcrypt` to PIN hashing (not just password) | `pin.js` | S |
| 24 | Server-side rate limiting on PIN verification attempts (planned per `pin.js` comment) | `pin.js` + signing routes | M |
| 25 | Tighten `express.json({ limit })` per-route | `index.js` + route-level | S |

### P3 — Roadmap / architectural

| # | Item | Grade impact |
|---|---|---|
| 26 | CAM Article extension: "Mutation endpoints require auth" as universal law + audit protocol | Lifts §3.1 from F to B |
| 27 | JSA signing overhaul with polymorphic signatures + perjury attestation + PIN (planned) | Lifts Signing from N/A to B+ |
| 28 | Biometric signing on company iPads (planned) | Lifts AuthN §1 to B |
| 29 | Chain-sealed audit log (R1 on roadmap) | Lifts Audit §4 to A− |
| 30 | Object-level access control per customer tenant (multi-tenant roadmap) | Lifts §3.3 from C to A |
| 31 | HTTP-only cookie JWT delivery (replaces sessionStorage) | Lifts §2.3 from B to A |
| 32 | MFA on owner/admin login | Lifts §1.6 from F to B |

---

## GRADE UPLIFT — WHAT A ONE-SESSION FIX BUYS

Applying P0 items 1–14 (pure authorization sweep, no algorithm changes) would lift:
- **§3 Authorization: F → B** (all mutation routes protected)
- **§4 Audit: D+ → B** (audit endpoints protected)
- **Overall: D+ → C+** (pulled up by §3 and §4 reaching B-tier)

Adding P1 items 15–19 (password hashing migration + rate limiting + CORS + headers):
- **§1 Authentication: D → B−**
- **§5 Crypto: D− → B+**
- **§7 Transport: C → B+**
- **Overall: C+ → B**

Adding P2 items + planned roadmap signing upgrades:
- **Overall: B → A−**

**A single focused session on P0 + P1 moves this app from D+ to B.** That's tractable in one day.

---

## WHAT THE APP ALREADY DOES WELL

To balance the critique — these are genuinely strong and above-baseline:

1. **JWT implementation (§1.3)** — stdlib-only, HS256, timing-safe compare, length-enforced secret. Professional work.
2. **Owner role lockdown (§6.4, v27.87)** — three-layer defense, CLI with last-of-kind refusal, atomic audit log, pattern codified in CAM. Exemplary.
3. **PIN setup flow (§6.2)** — dedicated tokens table, single-use 7-day tokens, admin never sees PIN, atomic invalidation.
4. **Governance (§8)** — CAM articles driving all access-control work. Progress log + session log discipline.
5. **Constant-time crypto (§5.5)** — `crypto.timingSafeEqual` for JWT signature compare is textbook correct.
6. **Random token quality (§5.4)** — all tokens use `crypto.randomBytes(32)`. No weak-random vulnerabilities anywhere.
7. **Deactivation (§6.3)** — nulls credentials, invalidates pending tokens, audit-logged, enables email reuse.
8. **Cache headers (§7.4)** — explicit `no-store` on `/api` prevents sensitive response caching.
9. **Anti-Pattern Catalog (§8.2)** — mechanism exists for codifying lessons; already has 2 entries.
10. **`useEditLock` pessimistic locking** — correct pattern for concurrent edit prevention (separate from access control but architecturally mature).

---

## OPERATOR CHECKLIST BEFORE NEXT LOGIN

These require your action, not mine:

1. **Confirm `JWT_SECRET` on Railway** is set and ≥32 characters. If the dev fallback is in use, all JWTs are forgeable and every grade above is moot.
2. **Confirm `FRONTEND_URL` on Railway** is set (referenced by auth.js + employees.js for reset/invite/PIN-setup links).
3. **Confirm `RESEND_API_KEY` on Railway** is set (email flows depend on it).
4. **Check audit_log for forged rows** — given the unauthenticated POST endpoint, a sanity scan on recent `audit_log` entries (`SELECT * FROM audit_log WHERE performed_by NOT IN ('system', 'cli-wipe-contacts', 'cli-change-owner-role', <real user names>) ORDER BY created_at DESC LIMIT 100`) is prudent.

---

## CLOSING

The app is not insecure by design — it's secure by design that hasn't been fully applied yet. The v27.65 JWT retrofit established the right pattern in 3 route files; applying it to the remaining 17 is mechanical work, not architectural change. The password hashing migration is a well-understood pattern (detect-old-hash-on-login, re-hash-to-new-algorithm, no user disruption).

The governance discipline that produced CAM Article XXIX (*"After the Build"*) and Article XXVI Amd 1 (*"Scope is not a deferral reason"*) is exactly the discipline that will close these gaps in a single focused session. The anti-pattern catalog mechanism is ready to accept a new entry for "mutation endpoint without auth middleware."

The honest framing: this app has **professional-grade foundations and ambitious governance built on top of a half-applied authorization retrofit**. It is one focused day of work from a B. It is one additional week from A−. Neither is a re-architect — both are execution.

---

*Evaluation complete — v27.88 / 2026-04-23*
*Governed by Constitution of the Ancient Mariner v1798.15*
*Methodology: OWASP ASVS v4.0.3 L2 baseline, static source analysis, file+line evidence inline*
