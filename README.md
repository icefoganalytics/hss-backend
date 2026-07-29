# YG Health & Social Services Backend

Internal staff portal for YG Health & Social Services — ingests and manages citizen
submissions for five programs (Constellation Health, HIPMA, Midwifery, Dental, and a
General analytics/audit module).

- **`src/api`** — Node.js + Express + TypeScript, Oracle via Knex. REST API under `/api/*`.
- **`src/web`** — Vue 2 + Vuetify SPA (staff portal).

Authentication is **stateless JWT**: the SPA logs in with Auth0 and the API validates the
Bearer access token against Auth0's JWKS. See [docs/jwt-auth-migration.md](docs/jwt-auth-migration.md).

---

## Prerequisites

- **Docker Desktop** (for the Oracle XE database + Redis)
- **Node.js 20 LTS** and npm
- An **Auth0** tenant (for login — see step 4)

---

## Get it running (first time)

### 1. Start the database (and Redis)

From the **repo root**, on a **fresh** volume so the schema auto-builds:

```powershell
docker compose -f docker-compose.development.yml down -v
docker compose -f docker-compose.development.yml up -d
docker compose -f docker-compose.development.yml logs -f oracle-db   # wait for "HSS schema init complete"
```

This starts Oracle XE (PDB `XEPDB1`) and, on first boot, runs the scripts in
[src/db/oracle/scripts](src/db/oracle/scripts) in order to build the full schema **and seed an
admin user**. Oracle XE takes a couple of minutes to open on first boot — be patient.

> **If the schema doesn't build** (the Oracle image can be finicky about its init dir), run the
> mount-independent builder against the running container instead:
> ```powershell
> cd src/db/oracle
> .\build-schema.ps1
> ```
> It waits for the DB, runs every script in order, seeds the admin, and prints a permission count.

The seeded admin lives in `scripts/99_seed_admin_user.sql` — **edit the email/name there** to
your own account before building (it defaults to a placeholder). Your login email must match a
row in `GENERAL.USER_DATA`. More detail: [src/db/oracle/SETUP.md](src/db/oracle/SETUP.md).

To rebuild from scratch later: `down -v` then `up` again (the `-v` wipes the volume).

### 2. Start the API

```bash
cd src/api
cp .env.sample .env.development     # DB values already match the DB container
npm install
npm run start:dev                   # http://localhost:3000
```

The DB settings in `.env.sample` (`XEPDB1`, `SYSTEM`/`Oracle123`) already match the Docker
database — no edits needed for local dev. You **do** need to fill in the Auth0 values (step 4).

### 3. Start the web app

```bash
cd src/web
npm install
npm run start:dev                   # http://localhost:8080
```

### 4. Configure Auth0 (required for login)

Auth is real Auth0 — there's no local bypass, so this must be set up once.

**In the Auth0 dashboard:**
1. **API** — create/confirm an API whose *Identifier* you'll use as the audience (RS256).
2. **Application** — a **Single Page Application**. Set *Allowed Callback URLs* to include
   `http://localhost:8080/login-complete`, *Allowed Logout URLs* to `http://localhost:8080/sign-in`,
   and *Allowed Web Origins* to `http://localhost:8080`.
The API maps your token to your DB user **by email**. Auth0 access tokens don't include
email by default, so the API fetches it from Auth0's **`/userinfo`** endpoint using your
access token — **no custom claim or Action required** (the SPA already requests the
`openid profile email` scopes). Your login email must match a row in `GENERAL.USER_DATA`.

*(Optional optimization: to avoid the per-login `/userinfo` call, add a Post-Login Action
that sets a namespaced email claim and set `AUTH_EMAIL_CLAIM` to its name.)*

**In the API** — `src/api/.env.development`:
```
ISSUER_BASE_URL=https://<your-tenant>.us.auth0.com
AUTH_AUDIENCE=<the API identifier from step 1>
# AUTH_EMAIL_CLAIM=   # optional — only if you add a custom email claim via an Auth0 Action
```

**In the SPA** — `src/web/src/config.js`, fill the `auth0Configs.development` block (these are
public client identifiers, not secrets; selected per `NODE_ENV`):
```js
development: {
  domain: "<your-tenant>.us.auth0.com",
  clientId: "<the SPA application client id>",
  audience: "<must equal the API's AUTH_AUDIENCE>",
},
```

### 5. Log in

Open http://localhost:8080, sign in through Auth0, and you're in. If you get a **401 after
login**, check the API console — a temporary `[auth debug]` line reports exactly what the API
sees (whether the token carries your email, and whether your DB user resolved).

---

## Everyday commands

```bash
# API (cd src/api)
npm run start:dev     # live reload
npm run build:api     # tsc -> dist/
npm test              # jest

# Web (cd src/web)
npm run start:dev     # dev server
npm run build:web     # production build
npm run lint
```

---

## Troubleshooting

- **Spinner forever / empty nav after login** → your DB user has no permissions, or the token
  has no email claim. Check the API `[auth debug]` line and confirm
  `SELECT * FROM GENERAL.USER_PERMISSIONS_V WHERE LOWER(USER_EMAIL)=LOWER('<you>')` returns rows.
- **`ORA-00942: table or view does not exist`** → the schema didn't fully build; rebuild the DB
  (step 1) or run `build-schema.ps1`.
- **DB init never ran** → make sure you run compose from the **repo root** with
  `-f docker-compose.development.yml` (the mounts are relative to that file), and that the volume
  was fresh (`down -v`).

---

## EDMS data migration (legacy, optional)

To migrate data from the legacy EDMS database, run the migration scripts from `src/api`:
```bash
node dataMigration.js
```
Requires the EDMS connection + migration env vars in `src/api/.env.development`:
- `DENTAL_IDS`, `CONSTELLATION_IDS` — comma-separated EDMS ids to migrate.
- `DB_HOST_EDMS`, `DB_USER_EDMS`, `DB_PASS_EDMS`, `DB_NAME_EDMS`, `DB_PORT_EDMS` — EDMS DB connection.
