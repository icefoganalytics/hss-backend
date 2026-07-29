# CLAUDE.md

Guidance for Claude Code (and humans) working in this repository. Read this before
making changes so you follow the established patterns and avoid the known footguns.

## What this is

YG **Health & Social Services Backend** — an internal staff portal that ingests and
manages citizen submissions for five health programs:
**Constellation Health, HIPMA, Midwifery, Dental, and General** (analytics/audit).
It handles **PHI/PII for a government health program**, so confidentiality, integrity,
and auditability matter on every change.

Monorepo with two independently-built apps:

| Path | Stack | Role |
|---|---|---|
| `src/api` | Node.js + Express + TypeScript (CommonJS), Oracle via Knex, Redis sessions | REST API under `/api/*` |
| `src/web` | Vue 2.7 + Vuetify 2 + Vuex + Vue Router (Options API, plain JS) | Staff SPA |

The API also serves the built SPA statically in production (`src/api/index.ts`).

## Commands

All commands run **inside `src/api` or `src/web`** — there is no root `package.json`.

```bash
# API (cd src/api)
npm run start:dev     # ts-node-dev, live reload
npm run dev           # nodemon
npm run build:api     # tsc -> dist/
npm test              # jest (NOTE: no tests currently exist)

# Web (cd src/web)
npm run start:dev     # vue-cli-service serve  -> http://localhost:8080
npm run build:web     # production build
npm run build:docker  # build into ../app/dist/web
npm run lint          # eslint
```

Each app needs an env file: `cp src/api/.env src/api/.env.development` and
`cp src/web/.env.sample src/web/.env.development`, then fill in values.
`NODE_ENV` selects the file (`.env.development` / `.env.test` / `.env` for production)
in [src/api/config.ts](src/api/config.ts).

## Architecture & layout (API)

```
src/api/
  index.ts            # app bootstrap: middleware, route mounting, static SPA
  config.ts           # env loading + per-module Knex DB_CONFIG_* + REDIS_CONFIG
  routes/             # one router file per module (the bulk of the logic lives here)
    index.ts          # barrel: re-exports every *Router
    auth.ts           # OIDC/session/redis setup + EnsureAuthenticated
    {constellation,hipma,midwifery,dental,general}.ts
    user.ts
  middleware/         # authorize, checkPermissions, RequiresRoleAdmin, ReturnValidationErrors
  repository/         # data-access classes (Oracle) extending BaseRepository
    BaseRepository.ts, interfaces/IRepository.ts
    oracle/{UserPermission,User,Audit,SubmissionStatus}Repository.ts
  models/             # DTOs / domain types, barrel-exported from models/index.ts
  utils/              # helper.ts (DB client, logging), groupBy.ts, healthCheck.ts
  db/client.ts        # pre-built per-module knex clients
  @types/express/     # Request augmentation (req.user, req.oidc)
```

**Two ways DB clients are created today (both in use):** module-scoped
`let db = knex(DB_CONFIG_X)` re-fetched per request via
`helper.getOracleClient(db, DB_CONFIG_X)`, and the pre-built clients in
`db/client.ts`. Repositories hold their own `mainDb`. Prefer obtaining a
connection inside the handler; see "Gotchas" about the shared-`db` race.

## Established patterns — follow these

### Route handler shape
Every endpoint follows this template. Match it exactly for consistency:

```ts
moduleRouter.get("/show/:id", checkPermissions("module_view"),
  [param("id").isInt().notEmpty()],
  async (req: Request, res: Response) => {
    try {
      db = await helper.getOracleClient(db, DB_CONFIG_MODULE);
      const result = await db(`${SCHEMA_MODULE}.TABLE`).where("ID", req.params.id).first();
      res.send({ data: result });
    } catch (e) {
      console.log(e); // debug if needed
      res.send({ status: 400, message: 'Request could not be processed' });
    }
  });
```

- **Table names are always schema-qualified** with a template literal:
  `` db(`${SCHEMA_DENTAL}.DENTAL_SERVICE_SUBMISSIONS`) ``. Schemas come from `config.ts`.
- **Oracle returns UPPERCASE columns**; `config.ts` `postProcessResponse` lowercases
  every result key. So query/write in `UPPER_CASE`, read results in `lower_case`
  (`result.first_name`, `req.user.db_user.user.id`).
- **POST request payloads are nested under `req.body.params`** (Vue side wraps them):
  `req.body.params.page`, `req.body.params.data`, etc.
- **Responses** use `res.send({ data, ... })` for success and the
  `{ status: 400, message: 'Request could not be processed' }` shape on error.
- **Pagination**: `page`/`pageSize`/`offset`, with a cloned count query
  (`query.clone().count('* as count').first()`) — see [dental.ts](src/api/routes/dental.ts) `POST /`.

### SQL — always parameterize
Use Knex query builder or **bound** raw fragments. The codebase does this correctly
almost everywhere:
```ts
db(`${SCHEMA_GENERAL}.USER_PERMISSIONS_V`).whereRaw('LOWER("USER_EMAIL") = LOWER(?)', [email])
db.raw("EXTRACT(YEAR FROM ?) = ?", [createdAt, dateYear])
```
**Never** concatenate user input into a SQL/PL-SQL string (see CRIT-02 in the audit —
the one place this rule is broken).

### Auth, permissions, audit
- **Authentication**: stateless **JWT** (Auth0 access tokens). The API validates the
  `Authorization: Bearer <token>` against the IdP's JWKS via `express-jwt` + `jwks-rsa`
  ([middleware/jwt.ts](src/api/middleware/jwt.ts)); a valid token populates `req.auth`
  (claims), and `loadUser` resolves the DB user onto `req.user.db_user`. `EnsureAuthenticated`
  (from `routes/auth.ts`) rejects requests without a valid token (no `req.auth`) with 401.
  The SPA obtains the token via the Auth0 SPA SDK and attaches it in an axios interceptor.
  (The old `express-openid-connect` session/redirect flow + Redis sessions were removed —
  see [docs/jwt-auth-migration.md](docs/jwt-auth-migration.md).)
- **Authorization**: `checkPermissions("perm_name", ...)` middleware
  ([middleware/permissions.ts](src/api/middleware/permissions.ts)) — checks the user's
  `permissions` from `UserPermissionRepository`. Permission names are snake_case
  (`dental_view`, `constellation_view`, `dashboard_view`, `dental_logs`). The same
  names gate the SPA nav in [src/web/src/config.js](src/web/src/config.js).
- **Role guard**: `authorize([UserRoles.ADMINISTRATOR])`
  ([middleware/authorization.ts](src/api/middleware/authorization.ts)) is the canonical,
  correct role check. (`RequiresRoleAdmin` in `middleware/index.ts` is **broken** — see Gotchas.)
- **Audit logging**: write user actions via `helper.insertLog(logFields)` /
  `helper.insertLogIdReturn(...)` into `${SCHEMA_GENERAL}.ACTION_LOGS`. Standard fields:
  `ACTION_TYPE`, `TITLE`, `SCHEMA_NAME`, `TABLE_NAME`, `SUBMISSION_ID`, `USER_ID`.
  **Always derive `USER_ID` from `req.user.db_user.user.id`, never from the request body.**
- **Input validation**: declare `express-validator` `param(...)/body(...)` arrays on the
  route, **and** wire `ReturnValidationErrors` (from `middleware/index.ts`) as a handler
  so the rules actually run — declaring them alone is a no-op (see Gotchas / MED-08).

### Repository pattern
Data-access classes extend `BaseRepository<DTO>` and live in `repository/oracle/`.
They hold a `mainDb` knex instance, refresh it with `helper.getOracleClient(...)`, run
the query, and normalize rows through `this.loadResults(...)`. See
[UserPermissionRepository.ts](src/api/repository/oracle/UserPermissionRepository.ts) as the
reference implementation. New cross-cutting data access should go in a repository rather
than being inlined into a route — though most existing module CRUD is currently inline.

### Frontend (src/web)
- **Options API, plain JS, single-file components.** Components are grouped by module
  folder (`components/Dental`, `components/Hipma`, …); shared views in `views/`.
- **All API endpoints are centralized in [src/web/src/urls.js](src/web/src/urls.js)** as
  exported constants (`DENTAL_SHOW_URL`, etc.). Add new endpoints there; don't hardcode
  URLs in components.
- **HTTP via `axios`** (global, `withCredentials` for the session cookie). `apiBaseUrl`
  is `http://localhost:3000` in dev, `""` (same-origin) in prod — see `config.js`.
- **State**: Vuex modules in `store/` (`auth.js`, `profile.js`), `state/getters/actions/mutations`.
- **Nav & permissions** are data-driven from `config.js` `sections[]`.
- Dates use `moment`; charts use `chart.js` + `vue-chartjs`; XLSX export via `xlsx`.

## Conventions

- TypeScript is `strict` but the code leans on `any` heavily (`req.user`, DB rows,
  `Object()` placeholders). Match the surrounding style; prefer typing new DTOs in `models/`.
- 4-space indentation in the API; double quotes; semicolons.
- Module barrels: add new routes/models/utils to the respective `index.ts`.
- Keep the per-module symmetry: dental/hipma/midwifery/constellation routers mirror each
  other (`/submissions`, `/show/:id`, `/changeStatus`, `/export`, `/downloadFile/:id`,
  `/duplicates/...`). When you change one module's pattern, check whether the others
  should change too.

## Known gotchas & anti-patterns (DO NOT replicate)

A full security & quality audit lives at
[docs/code-quality-and-security-audit.md](docs/code-quality-and-security-audit.md)
(35 findings). The remediation plan is at
[docs/pattern-conformance-remediation-plan.md](docs/pattern-conformance-remediation-plan.md).
The highlights you must keep in mind while editing:

- **Most routes are unauthenticated.** Only `user.ts` and the two `/show/:id` routes
  (dental, constellation) actually enforce auth/permissions. Auth is configured
  `authRequired: false`. **When you add or touch a route, add `EnsureAuthenticated` +
  `checkPermissions(...)`** — do not copy the unprotected handlers.
- **No string-built SQL.** Bind everything (the HIPMA file-data concatenation is the
  cautionary example).
- **`SKIP_PERMISSIONS`** is parsed as a truthy string (`config.ts:30`): setting it to
  `"false"` *enables* the bypass. Don't rely on it; parse booleans with `=== 'true'`.
- **`RequiresRoleAdmin`** (`middleware/index.ts`) checks the wrong role string (`'Admin'`
  vs `'Administrator'`) and fails open for anonymous users. Use `authorize([...])` instead.
- **Don't `await` inside `_.forEach`/`Array.forEach`** for DB writes — callbacks aren't
  awaited, causing fire-and-forget writes and double `res` sends. Use `for...of` + `await`
  or `Promise.all(arr.map(...))`, and **send exactly one response, then `return`**.
- **Shared module-level `db`**: reassigning `let db = await helper.getOracleClient(db,...)`
  on every request races under load. Prefer a request-local connection variable.
- **Never write client-derived paths/filenames to disk**, and never echo raw exceptions
  (`'... ' + e`) to clients — both are live vulnerabilities in the current code.
- **No tests exist** despite jest/supertest being configured. New, security-relevant code
  should come with tests under `src/api` (`*.test.ts`).

## Related code outside this repo

`c:/dev/sfa-client/src/api/middleware` (an additional working dir) contains a more
complete middleware set (`admin-authentication`, `portal-authentication`,
`path-format-middleware`) — useful as a reference when hardening this API's auth.
