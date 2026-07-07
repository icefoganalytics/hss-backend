# Auth migration: express-openid-connect → JWT (Auth0)

**Date:** 2026-06-26

## What changed and why

Login was failing with `BadRequestError: access_denied (Unauthorized)` from the
`express-openid-connect` server-side callback. Rather than debug the Auth0 OIDC
*web* flow, authentication was switched to **stateless JWT**: the SPA obtains an
Auth0 **access token** and the API validates it as a `Bearer` token against the
IdP's JWKS. The OIDC session/redirect flow and the Redis-backed sessions were
removed.

`USER_DATA` has no password column, so the API can't authenticate credentials
itself — Auth0 remains the identity provider; the API only **validates** its tokens.

## How it works now

- **API** ([src/api/middleware/jwt.ts](../src/api/middleware/jwt.ts))
  - `parseJwt` — `express-jwt` validates the RS256 Bearer token against
    `AUTH_JWKS_URI`, checking `audience` (`AUTH_AUDIENCE`) and `issuer`
    (`ISSUER_BASE_URL`). `credentialsRequired: false`, so requests **without** a
    token pass through (public `/store` intake + the static SPA still work); a
    request **with** an invalid token is rejected 401 by `jwtErrorHandler`.
  - `loadUser` — when a valid token is present, resolves the user's **email**
    (a custom `AUTH_EMAIL_CLAIM` if configured, else Auth0's `/userinfo` endpoint —
    cached per `sub`), looks up the DB user, and attaches
    `req.user = { oid_user, db_user }` (the shape route handlers already use).
  - Per-route `checkPermissions(...)` / `EnsureAuthenticated` enforce auth+authz off
    `req.auth` + `req.user.db_user.permissions`.
  - `GET /api/auth/isAuthenticated` returns the resolved user (or 401);
    `POST /api/auth/loginEvent` writes the login audit entry (called once by the SPA).
- **SPA**
  - `src/web/src/auth.js` — shared Auth0 SPA client (`@auth0/auth0-spa-js`).
  - `main.js` — axios request interceptor attaches `Authorization: Bearer <token>`.
  - `store/auth.js` — `login` (redirect), `handleAuthCallback`, `checkAuthentication`,
    `signOut` all go through the Auth0 SDK. `LoginComplete.vue` handles the callback.

## Required configuration

### API (`src/api/.env*`)
```
ISSUER_BASE_URL=https://<your-tenant>.us.auth0.com   # Auth0 tenant URL
AUTH_AUDIENCE=<the API identifier configured in Auth0>
# AUTH_EMAIL_CLAIM=  # OPTIONAL — only if you add a custom email claim (see below).
#                      Otherwise the API reads email from Auth0 /userinfo.
# AUTH_JWKS_URI defaults to ISSUER_BASE_URL/.well-known/jwks.json
```

### SPA — edit `src/web/src/config.js` (per-environment, not `.env`)
Fill the `auth0Configs` block; the right entry is selected by `NODE_ENV`
(`development` / `test` / `production`), the same way `apiBaseUrl` is chosen.
These are public client identifiers (not secrets):
```js
const auth0Configs = {
    development: { domain: "<tenant>.us.auth0.com", clientId: "<spa client id>", audience: "<= API AUTH_AUDIENCE>" },
    test:        { domain: "...", clientId: "...", audience: "..." },
    production:  { domain: "...", clientId: "...", audience: "..." },
};
```
`audience` MUST equal the API's `AUTH_AUDIENCE`.

### Auth0 dashboard
1. **API**: create/confirm an API with an Identifier == `AUTH_AUDIENCE` (RS256).
2. **Application**: a **Single Page Application** app; set Allowed Callback URLs to
   include `<web-origin>/login-complete`, Allowed Logout URLs to `<web-origin>/sign-in`,
   and Allowed Web Origins to `<web-origin>`.
3. **email**: the API needs the user's email to map the token to `GENERAL.USER_DATA`.
   Auth0 access tokens don't include email by default, so the API calls Auth0's
   **`/userinfo`** endpoint with the access token — this works out of the box because
   the SPA requests the `openid profile email` scopes. **No Action required.**
   *(Optional: to avoid the per-login `/userinfo` call, add a Post-Login Action that
   sets a namespaced email claim and set `AUTH_EMAIL_CLAIM` to its name.)*
   ```js
   // OPTIONAL optimization only:
   exports.onExecutePostLogin = async (event, api) => {
     api.accessToken.setCustomClaim("https://<namespace>/email", event.user.email);
   };
   ```

## To finish / verify

- **`cd src/web && npm install`** — adds `@auth0/auth0-spa-js` (added to package.json,
  not yet installed here).
- Manual end-to-end test: sign in → redirected to Auth0 → back to `/login-complete`
  → app loads, API calls carry the Bearer token, permissions enforced, sign-out works.
- Verified here: API `tsc --noEmit` (exit 0) and `jest` (15/15) pass; `eslint` clean on
  all changed SPA files. **Runtime not verified** (needs Auth0 config + a browser).

## Removed / now-unused
- `express-openid-connect` usage; Redis-backed `express-session` for auth.
- Backend routes `/api/auth/login`, `/api/auth/logout`, and the OIDC `GET /` handler.
- The `express-openid-connect`, `express-session`, `connect-redis`, `redis` packages
  remain in `package.json` but are no longer used by auth — safe to prune later.
