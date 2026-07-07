# Pattern-Conformance Remediation Plan

**Repository:** `hss-backend`
**Date:** 2026-06-12
**Companion docs:** [CLAUDE.md](../CLAUDE.md) (the patterns) ·
[code-quality-and-security-audit.md](./code-quality-and-security-audit.md) (the full audit)

## Purpose

[CLAUDE.md](../CLAUDE.md) documents the patterns this codebase *intends* to follow. This
document lists the places where the code **deviates from its own patterns** and gives an
ordered, concrete plan to bring them back into line. Each item references the affected
files and the audit finding it maps to.

The dominant problem is **inconsistent application of controls that already exist** — the
right helpers (`EnsureAuthenticated`, `checkPermissions`, `authorize`,
`ReturnValidationErrors`, bound SQL, `helper.insertLog`) are present but only used in a
handful of places. Most fixes are "apply the existing pattern everywhere," not "invent
something new."

## How to verify scope quickly

```bash
cd src/api
# Routes that DO enforce permissions (should be ~all PHI routes; currently 2):
grep -rn "checkPermissions(" routes/
# Routes that enforce auth (currently only user.ts + 2 show routes):
grep -rn "EnsureAuthenticated" routes/
# Total route handlers:
grep -rEn "\.(get|post|put|patch|delete)\(" routes/ | wc -l
# String-concatenated SQL (should be zero hits of user data in raw strings):
grep -rn "query = query +" routes/ *.js
# Raw exception leakage:
grep -rn "could not be processed ' + e\|message: 'Request could not be processed ' +" routes/
# await-in-forEach misuse:
grep -rn "forEach(.*async" routes/
```

---

## Phase 0 — Stop-the-bleeding (security-blocking, do first)

These are deviations severe enough to block production. Map to audit CRIT-01..07 / HIGH-01.

### P0-1 — Enforce authentication on every `/api/*` router
**Pattern violated:** "every route uses `EnsureAuthenticated`" (CLAUDE.md → Auth).
**Reality:** `authRequired: false` and only `user.ts` + 2 `/show/:id` routes are gated.
**Fix:**
1. In [src/api/index.ts](../src/api/index.ts), apply `EnsureAuthenticated` at the
   router-mount loop for every `/api/*` router **except** genuinely public
   citizen-submission endpoints (enumerate those explicitly and gate them individually).
2. Remove reliance on `authRequired: false` for protected areas.
3. Leave `/api/healthCheck` and OIDC login/callback public.
**Files:** `index.ts`, `routes/auth.ts`, all five module routers.
**Audit:** CRIT-01.

### P0-2 — Add `checkPermissions(...)` per route
**Pattern violated:** "each route layers `checkPermissions`" — currently 2 of ~63 routes.
**Fix:** add the correct snake_case permission to every handler, mirroring the existing
`dental.ts:282` / `constellation.ts:224` `/show` examples. Use the module's existing
permission family (`dental_view`, `hipma_view`, `midwifery_view`, `constellation_view`,
`dashboard_view`, `dental_logs`). Write-type routes should require a write/edit permission
distinct from `_view` (define new permission names if none exist yet).
**Files:** all five module routers (hipma/midwifery/general import the guard but never use it).
**Audit:** CRIT-01.

### P0-3 — Add per-record authorization (close IDOR)
**Pattern violated:** record/file endpoints fetch by raw `:id` with no ownership/scope check.
**Fix:** on every endpoint that takes a record identifier (`/show/:id`,
`/downloadFile/:id`, `/duplicates/details/:id`, `/update`, `/changeStatus`), verify the
caller is permitted to access *that* record (role/scope/ownership), not merely
authenticated.
**Files:** `dental.ts`, `constellation.ts`, `hipma.ts`, `midwifery.ts`.
**Audit:** CRIT-03.

**RESOLUTION (2026-06-25):** Investigated the data model. The submission tables
(`DENTAL_SERVICE`, `HEALTH_INFORMATION`, `CONSTELLATION_HEALTH`, `MIDWIFERY_SERVICES`, …)
carry **no per-applicant ownership/assignee/region column** — `USER_ID` appears only on the
`GENERAL` audit/permission tables, never on the submission records. This is a staff
case-management portal: a caseworker with a module's permission is, by design, entitled to
every submission in that module. Per-record authorization therefore collapses to
**module-level permission**, which P0-2 now enforces on every record/file endpoint. The
IDOR exposure described in CRIT-03 was a consequence of CRIT-01 (anonymous access); with
authentication + module permissions enforced, an attacker can no longer enumerate records.
A *finer* scoping model (e.g. regional restriction) is **not applicable** to the current
schema and would be a new feature, not a remediation — so CRIT-03 is considered addressed
by P0-1/P0-2. Revisit only if a per-region/ownership requirement is introduced.

### P0-4 — Fix the PL/SQL injection (bind file data)
**Pattern violated:** "never concatenate user input into SQL."
**Fix:** replace the chunk-concatenation BLOB writes with bound parameters / the
`oracledb` LOB streaming API.
**Files:** `routes/hipma.ts` (~504-520), `dataMigration.js` (~851),
`dentalMigrationByIDs.js` (~334).
**Audit:** CRIT-02.

### P0-5 — Sanitize file handling; stop writing to the web root
**Pattern violated:** "never write client-derived paths to disk."
**Fix:** sanitize/validate `file_name`/`file_type` on upload (`sanitize-filename` is
already a dependency); store attachments **outside** the statically-served `dist/web`;
stream BLOB downloads from the DB to the response instead of writing files.
**Files:** `routes/hipma.ts` (603-619), `routes/dental.ts` (1121-1143), `index.ts:75`.
**Audit:** CRIT-05.

### P0-6 — Fix the two auth footguns
- `SKIP_PERMISSIONS`: parse explicitly (`=== 'true'`), default secure, `return next()`
  from the bypass branch, and remove the bypass outside local dev.
  **Files:** `config.ts:30`, `middleware/permissions.ts:11-15`. **Audit:** CRIT-06.
- `RequiresRoleAdmin`: use `UserRoles.ADMINISTRATOR`, treat missing user as unauthorized,
  or replace all call sites with `authorize([UserRoles.ADMINISTRATOR])`.
  **Files:** `middleware/index.ts:23-29`. **Audit:** HIGH-01.

### P0-7 — Remove secrets from the Docker image
**Fix:** delete the `.env` copy from `Dockerfile`, add `.env` to `.dockerignore`, inject
secrets at runtime, and rotate anything previously imaged.
**Files:** root `Dockerfile:28`, `src/api/docker-compose.yml:11`, `.dockerignore`.
**Audit:** CRIT-07.

---

## Phase 1 — Pattern conformance (correctness & hygiene)

### P1-1 — Make declared validators actually run
**Pattern violated:** "declare validators **and** wire `ReturnValidationErrors`."
**Reality:** `param(...).isInt()` arrays are attached but no handler runs
`validationResult`/`ReturnValidationErrors`, so validation is decorative; POST bodies have
none. **Fix:** insert `ReturnValidationErrors` as a middleware on each validated route and
add `body(...)` validators for POST/PATCH payloads (remember bodies are under
`req.body.params`).
**Files:** all module routers. **Audit:** MED-08.

### P1-2 — Allow-list mass-assignment updates
**Pattern violated:** updates should write an explicit column allow-list.
**Reality:** `req.body.params.data` is passed wholesale into `db(...).update(data)`.
**Fix:** allow-list updatable columns; reject unknown keys; derive acting user from session.
**Files:** `dental.ts` (~1585, 1832-1834, 1915), `storeComments` (~1541-1553).
**Audit:** CRIT-04.

### P1-3 — Stop leaking raw exceptions
**Pattern violated:** error responses must be generic.
**Reality:** several handlers do `message: 'Request could not be processed ' + e`.
**Fix:** return the generic message (+ a correlation id); log details server-side only.
**Files:** `hipma.ts:538`, `midwifery.ts:544`, `constellation.ts:510`, `dental.ts:1434`, et al.
**Audit:** HIGH-02.

### P1-4 — Fix async/`forEach` response defects
**Pattern violated:** "don't await inside `forEach`; send exactly one response."
**Fix:** convert `_.forEach(async ...)` DB loops to `for...of` + `await` (or
`Promise.all(map)`); ensure a single `res.*` per request with a `return` after it; remove
shadowed `var filesSaved`.
**Files:** `hipma.ts:495-532`, `constellation.ts:822-844` & `483-504`, `dental.ts:1364-1377`.
**Audit:** HIGH-05.

### P1-5 — Allow-list sort parameters everywhere
**Pattern violated:** consistency across modules. Constellation & midwifery allow-list
`sortBy`/`sortOrder`; dental and hipma don't. **Fix:** apply the same allow-list to
`dental.ts:155-156` and `hipma.ts:137`.
**Audit:** MED-05.

### P1-6 — Request-local DB connections
**Pattern violated:** "prefer a request-local connection."
**Fix:** replace the shared module-level `let db = await helper.getOracleClient(db,...)`
reassignment with a local `const conn = await helper.getOracleClient(undefined, CONFIG)`
per handler.
**Files:** all four module routers (e.g. `hipma.ts:94,190,224`).
**Audit:** MED-04.

### P1-7 — Strengthen file-upload validation
**Fix:** enforce a strict server-side type/size allow-list **before** persisting; reject
(don't fall back to) the client filename extension; check size before writing.
**Files:** `hipma.ts:1190-1237`, `dental.ts:2064-2103`.
**Audit:** MED-06.

---

## Phase 2 — Infrastructure & platform hygiene

| Item | Fix | Files | Audit |
|---|---|---|---|
| P2-1 | Single rate limiter mounted **before** routes, realistic threshold; remove per-router duplicates | `index.ts:62-69`, `auth.ts:39-42`, `user.ts:10-13` | HIGH-03 |
| P2-2 | Enable full `helmet()`; configure CSP through it | `index.ts:24-40` | HIGH-09 |
| P2-3 | Lower global body limit (50mb); raise only on specific upload routes | `index.ts:21-23` | HIGH-08 |
| P2-4 | Harden session cookie (`secure/httpOnly/sameSite/maxAge`); dedicated session secret (not Redis pass) | `auth.ts:44-50` | MED-07 |
| P2-5 | Non-root container `USER`; supported LTS Node + maintained base image (Dockerfiles disagree: Node 13 vs 16) | both `Dockerfile`s | HIGH-06, MED-02 |
| P2-6 | Remove `instantclient_21_9/` from git; `.gitignore`/`.dockerignore`; fetch at build | repo root | HIGH-07, LOW-05 |
| P2-7 | Don't publish Redis to host; require password; internal network only | `docker-compose*.yml` | MED-03 |
| P2-8 | Fix `package.json start` (`dist/index.ts` → `dist/index.js`); stray `]` in compose; CMD exec form | `package.json:11`, `docker-compose.yml:9`, `Dockerfile:31` | LOW-04 |
| P2-9 | Upgrade deps: `axios`→1.x, `xlsx`→vendor build, `mysql`→`mysql2`; plan Vue 2→3 | both `package.json` | HIGH-04 |
| P2-10 | Update CI actions (checkout@v2, codeql@v1); scope GHA cache for fork PRs | `.github/workflows/*` | MED-09, MED-10 |

---

## Phase 3 — Reliability & maintainability

- **P3-1 Tests.** Jest/supertest are configured but **no tests exist**. Add coverage for
  the new auth/permission guards (P0-1/P0-2), input validation, and the data layer —
  these are the regression net for every fix above. **Audit:** MED-01.
- **P3-2 Structured logging.** Replace pervasive `console.log(e)` (often over PHI payloads)
  with a logger that redacts sensitive fields. **Audit:** LOW-01.
- **P3-3 Secure randomness.** Swap `Math.random()` filenames / `uniqid()` confirmation
  numbers for `crypto.randomUUID()` / `crypto.randomBytes`. **Audit:** LOW-02.
- **P3-4 Dead code & data-integrity nits.** Remove unused `bufferQuery`/misleading
  truncation comments (`hipma.ts:703-717`, `general.ts:389-403`); fix JSON-by-concatenation
  (`constellation.ts:1321-1327`); check affected-rows before reporting success in
  `changeStatus` (`dental.ts:202-228`, `constellation.ts:739-766`). **Audit:** LOW-06/07/09.

---

## Suggested execution order & checkpoints

1. **P0-1 → P0-2 → P0-3** together (auth + permissions + per-record checks) — these are
   one coherent change to the routing layer and should land with **P3-1 tests** proving
   anonymous/unauthorized requests are now rejected.
2. **P0-4, P0-5** (injection + file write) — isolated, high-severity, testable.
3. **P0-6, P0-7** (config footguns + image secrets) — quick, high-value.
4. **Phase 1** — sweep each module router applying the same edits consistently; do all
   five modules in one pass per item so they stay symmetric.
5. **Phase 2/3** — infra and hardening, lower coordination cost, can parallelize.

**Definition of done for Phase 0:** the scope-check greps show `checkPermissions` and
`EnsureAuthenticated` on every non-public route; no string-concatenated SQL; no raw `e`
in responses; tests assert 401/403 on the formerly-open endpoints.

---

## Implementation status

### Phase 0 — COMPLETE (2026-06-25) ✅

| Item | Status | What changed |
|---|---|---|
| P0-1 / P0-2 | ✅ Done | `checkPermissions(...)` added to **every** staff route across all 5 routers (general, dental, hipma, midwifery, constellation). Reads → `_view`, writes → `_update`, deletes → `_delete`, analytics → `dashboard_view`, logs → `dental_logs`. The four public citizen-intake `POST /store` routes were intentionally left open (confirmed with stakeholder). `checkPermissions` enforces authentication too, so this closes CRIT-01. |
| P0-3 | ✅ Resolved | No per-record ownership model exists in the schema (see P0-3 RESOLUTION above). Module-permission enforcement satisfies CRIT-03. |
| P0-4 | ✅ Done | HIPMA `/store` BLOB write and both migration scripts (`dataMigration.js`, `dentalMigrationByIDs.js`) now **bind** each base64 chunk as a parameter instead of concatenating it into the PL/SQL text. (`constellationMigrationByIDs.js` had no such pattern.) |
| P0-5 | ⚠️ Partial | File names/types are now sanitized (`sanitize-filename` + alphanumeric-only type) and use `crypto.randomBytes` in `hipma.ts`/`dental.ts` `downloadFile` and HIPMA `saveFile`, eliminating the path-traversal/arbitrary-write vector. **Remaining:** downloads are still written into the statically-served `dist/web` dir to preserve the current frontend contract. Moving attachments out of the web root + streaming from the DB needs coordinated frontend changes — tracked as a follow-up. |
| P0-6 | ✅ Done | `SKIP_PERMISSIONS` parsed with `=== 'true'`; `checkPermissions` rewritten with explicit `return`s, single response, 401 for anonymous; `RequiresRoleAdmin` hardened to fail closed with the correct `'Administrator'` role. |
| P0-7 | ✅ Done | Removed `COPY src/api/.env*` from the root `Dockerfile`; `.dockerignore` now excludes all `.env*` files and `.git`. **Ops action required:** inject DB/OIDC/Redis secrets at runtime via the orchestrator (production `config.ts` falls back to `process.env`), and **rotate any secrets that were ever baked into a published image.** |

**Verification performed:** `npx tsc --noEmit` passes (exit 0). Guard coverage verified by
grep — every `*Router.(get|post|patch|delete)` declaration carries `checkPermissions(...)`
except the four `/store` endpoints and the `user.ts` routes (which use `EnsureAuthenticated`).
**Not yet verified:** runtime behavior (no test suite yet — see P3-1; no Oracle/Redis
available in this environment). Recommend adding supertest coverage asserting 401 on the
formerly-open endpoints before deploy.

### Bonus fixes folded in during Phase 0
- **CRIT-04 (partial):** `dental.ts` `storeComments` now derives `USER_ID` from the
  authenticated session instead of the request body (was forgeable into the audit log).
- **HIGH-02 (partial):** removed the raw-exception leak (`'… ' + e`) from HIPMA `/store`.

### Phase 1 — mostly COMPLETE (2026-06-25)

| Item | Status | What changed |
|---|---|---|
| P1-1 | ✅ Done | `ReturnValidationErrors` imported and wired into **every** route that declares an `express-validator` array, across all 5 routers — the declared `param(...)` rules now actually run. (Adding richer `body(...)` validators for POST payloads remains a follow-up.) |
| P1-2 | ✅ Done | `dental.ts` `PATCH /update` now `_.pick`s an explicit allow-list of writable columns before `update()`, so the client can't overwrite `ID`/`STATUS`/`CREATED_AT` (mass-assignment, CRIT-04). |
| P1-3 | ✅ Done | Removed the raw-exception leak (`'Request could not be processed ' + e`) from `midwifery.ts`, `dental.ts`, `constellation.ts` (HIPMA done in Phase 0). |
| P1-4 | ✅ Done | Fixed the fire-and-forget / double-`res` defects: HIPMA `/store` file loop converted from `_.forEach(async)` to `for...of` + `await` with a single response; constellation `/store` family-members and dental `/store` dependents loops converted from `.then/.catch` to `try/catch` with a single guarded response. |
| P1-5 | ✅ Done | Sort params allow-listed in `dental.ts` and `hipma.ts` (direction + column), matching the existing constellation/midwifery pattern (MED-05). |
| P1-7 | ✅ Done | `saveFile` in `hipma.ts` and `dental.ts` now validates size from the in-memory buffer **before** persisting, **rejects** non-allow-listed extensions instead of falling back to the client extension, and no longer writes a temp file to disk at all (MED-06). |
| P1-6 | ⛔ Deferred (deliberate) | **Request-local DB connections.** Not done — see rationale below. |

**P1-6 deferral rationale:** converting the shared module-level `let db` to a request-local
connection touches **every handler in all five routers** (hundreds of `db(...)`/`db.raw(...)`
references) and the shared helpers in `utils/helper.ts`. With **no test suite and no
Oracle/Redis available** in this environment, a blind mechanical sweep of that size is more
likely to introduce a connection-handling regression than to fix the (MED-severity, load-only)
race it targets. It should be done as a **dedicated, separately-reviewed change with load
testing** — ideally after P3-1 (tests) lands so the refactor has a safety net. Recommend
scheduling it as its own PR.

**Verification performed (Phase 1):** `npx tsc --noEmit` passes (exit 0) after all edits.
**Not verified:** runtime behavior (no tests / no DB in this environment).

### Phase 3 — started (2026-06-25)

| Item | Status | What changed |
|---|---|---|
| P3-1 | 🟡 Started | **First tests in the repo.** Added 16 passing unit tests (4 suites) covering the security-critical units changed in Phase 0/1: `checkPermissions` (anonymous → 401, has-permission → next, missing/partial permission → 401, empty user → 401, lookup-throws → fail-closed), the `SKIP_PERMISSIONS` boolean parsing (CRIT-06: `"false"`/`"yes"`/unset → false, only `"true"` → true), `RequiresRoleAdmin` fail-closed (HIGH-01), and `ReturnValidationErrors` (MED-08). Files: `middleware/permissions.test.ts`, `middleware/permissions.skip.test.ts`, `middleware/index.test.ts`, `config.test.ts`. Tests mock the repository so **no DB is required**; `jest.config.js` was updated to load jest/node types for tests only, and `tsconfig.json` now excludes `**/*.test.ts` from the production `tsc` build. **Still to do:** supertest integration tests that mount each router and assert 401/403 on the formerly-open endpoints (needs knex/OIDC mocking), and data-layer tests. |

### Update — 2026-06-26 (Phase 2 + remaining Phase 1/3 + P0-5 completion)

Verified after all edits below: API `tsc --noEmit` exit 0; `jest` 16/16 pass; `eslint`
clean on the 3 changed Vue components. Runtime/DB behaviour still unverified (no DB here);
the Docker rewrites (P2-5/6) **must be validated in CI**.

| Item | Status | What changed |
|---|---|---|
| **P0-5** | ✅ Completed | `downloadFile` (dental + hipma) now **streams the attachment straight from the DB** (`Content-Disposition` + `application/octet-stream` + `nosniff`) and never writes to the served `dist/web`. Frontend (`DentalAttachments.vue`, `SubmissionForm/FormAttachment.vue`, `HipmaAttachments.vue`) now requests the blob (`responseType: 'blob'`), derives the filename from the header, and no longer makes the static fetch or the `deleteFile` cleanup call. CRIT-05 fully closed. |
| **P1-1** (follow-up) | ✅ Done (key endpoints) | Added `body(...)` validators (with the already-wired `ReturnValidationErrors`) to the main staff write routes: `changeStatus` (all 4 modules — `params.requests` is a non-empty array; dental/constellation also require `params.requestStatus`), dental `/update` (`params.idSubmission` int), `/storeComments` (id int + non-empty comment), `/storeInternalFields` (idSubmission int). Full body-schema validation of the large `/store` intake payloads is still a follow-up. |
| **P2-1** | ✅ Done | Single rate limiter mounted **before** routes (`index.ts`), `max: 600/min/IP` (was 5000 after the routers, i.e. ineffective). Duplicate limiter in `auth.ts` removed. |
| **P2-2** | ✅ Done | Full `helmet()` enabled, with the existing CSP configured through it. |
| **P2-3** | ✅ Done | Global body limit dropped from 50 MB to **1 MB**, with a scoped **25 MB** parser applied only to the upload paths (`/store` ×4 + dental `/update`). |
| **P2-4** | ✅ Done | Session cookie hardened (`secure` in prod, `httpOnly`, `sameSite: 'lax'`, 8 h `maxAge`); new dedicated `SESSION_SECRET` (falls back to `REDIS_PASS` only for compatibility). |
| **P2-5** | ✅ Done (validate in CI) | Both Dockerfiles moved to `node:20-bookworm-slim` (EOL OL7 + Node 13/16 retired; OL7 glibc can't run Node 18+), Instant Client fetched at build, run as non-root `node` user. |
| **P2-6** | ✅ Done | `instantclient_21_9/` untracked (`git rm --cached`, 37 files) and added to `.gitignore`/`.dockerignore`; fetched at build instead. |
| **P2-8** | ✅ Done | `package.json` `start` → `node dist/index.js`; stray `]` in `src/api/docker-compose.yml` volume removed; both Dockerfile CMDs in exec form. |
| **P2-10** | ✅ Done | `actions/checkout@v2→v4`, `github/codeql-action/*@v1→v3`; GHA `cache-to` now exports only on non-PR runs (fork PRs can't poison the cache). |
| **P3-2** | ✅ Done | New `utils/logger.ts` (structured, logs only error name/message/stack — never request/response bodies). Replaced the ~70 `console.log(e)` calls in the 5 routers + `auth.ts` with `logger.error(...)`. |
| **P3-3** | ✅ Done | `getConfirmationNumber` (hipma + midwifery) now uses `crypto.randomBytes` instead of the predictable timestamp/`Math.random` uniqid; format/length unchanged. |
| **P3-4** | ✅ Done | Constellation JSON-by-concatenation replaced with `JSON.stringify` (LOW-07); dental + constellation `changeStatus` now return an explicit error on zero matched rows instead of silently succeeding / hanging (LOW-09); removed the dead `bufferQuery` block in general export. |

### Still remaining (not requested this round)
- **P1-1 follow-up:** body-schema validation of the `/store` citizen-intake payloads.
- **P1-6:** request-local DB connections (deferred — see rationale above).
- **P2-7:** Redis hardening (don't publish to host, require password).
- **P2-9:** dependency upgrades (`axios`→1.x, `xlsx`→vendor build, `mysql`→`mysql2`) + Vue 2→3.
- **P3-1 follow-up:** supertest integration tests per router (mount + assert 401/403) and data-layer tests.
- **Minor P3-4 leftovers:** dead `bufferQuery` in the hipma export handler (harmless).

### Ops actions (not code)
- Validate the new Docker images build in CI (P2-5/P2-6).
- Set a distinct `SESSION_SECRET` in every environment (P2-4).
- Inject DB/OIDC/Redis secrets at runtime and rotate any ever baked into a published image (P0-7).
