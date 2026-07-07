import { Request, Response, NextFunction } from "express";
import { expressjwt } from "express-jwt";
import { expressJwtSecret, GetVerificationKey } from "jwks-rsa";
import axios from "axios";
import { AUTH_ISSUER, AUTH_AUDIENCE, AUTH_JWKS_URI, AUTH_EMAIL_CLAIM } from "../config";
import { UserPermissionRepository } from "../repository/oracle/UserPermissionRepository";
import { logger } from "../utils";

const userRepo = new UserPermissionRepository();

// Validates an Auth0-issued RS256 access token presented as `Authorization:
// Bearer <token>`. The signing key is fetched from the IdP's JWKS endpoint.
//
// credentialsRequired:false means a request WITHOUT a token passes through
// (so the public citizen-intake /store routes and the static SPA still work);
// per-route guards (checkPermissions / EnsureAuthenticated) do the enforcing.
// A request WITH an invalid/expired token is rejected by jwtErrorHandler below.
export const parseJwt = expressjwt({
    secret: expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: AUTH_JWKS_URI,
    }) as GetVerificationKey,
    audience: AUTH_AUDIENCE || undefined,
    issuer: AUTH_ISSUER ? `${AUTH_ISSUER}/` : undefined,
    algorithms: ["RS256"],
    requestProperty: "auth",
    credentialsRequired: false,
});

// Extracts the user's email from the validated token claims.
export function emailFromClaims(claims: any): string {
    if (!claims) return "";
    if (AUTH_EMAIL_CLAIM && claims[AUTH_EMAIL_CLAIM]) return claims[AUTH_EMAIL_CLAIM];
    return claims.email ?? "";
}

// Small per-sub cache of the email resolved from /userinfo, so we don't call
// Auth0 on every request (loadUser runs globally). TTL well under token lifetime.
const emailCache = new Map<string, { email: string; exp: number }>();
const EMAIL_CACHE_TTL_MS = 10 * 60 * 1000;

// Resolves the user's email. Auth0 access tokens don't carry email by default,
// so: (1) use a custom email claim if one is configured/present, otherwise
// (2) call Auth0's /userinfo with the access token (the SPA requests the
// `openid profile email` scopes, so userinfo returns it) — no Auth0 Action needed.
async function resolveEmail(claims: any, authHeader: string): Promise<string> {
    const claimEmail = emailFromClaims(claims);
    if (claimEmail) return claimEmail;

    const sub = claims?.sub;
    if (sub) {
        const cached = emailCache.get(sub);
        if (cached && cached.exp > Date.now()) return cached.email;
    }

    if (!authHeader || !AUTH_ISSUER) return "";

    try {
        const resp = await axios.get(`${AUTH_ISSUER}/userinfo`, {
            headers: { authorization: authHeader },
        });
        const email = resp.data?.email ?? "";
        if (sub && email) {
            emailCache.set(sub, { email, exp: Date.now() + EMAIL_CACHE_TTL_MS });
        }
        return email;
    } catch (e) {
        logger.error("Failed to fetch /userinfo", e);
        return "";
    }
}

// When a valid token is present, resolve the DB user once per request and attach
// it in the same shape the route handlers already expect (req.user.db_user...).
export async function loadUser(req: Request, res: Response, next: NextFunction) {
    try {
        const claims = req.auth;
        if (claims) {
            const email = await resolveEmail(claims, req.headers.authorization || "");
            if (email) {
                req.user = {
                    oid_user: {
                        email,
                        displayName: claims.name ?? email,
                        name: claims.name,
                        sub: claims.sub,
                    },
                    db_user: await userRepo.getUserByEmail(email),
                };
            }
        }
    } catch (e) {
        logger.error("Failed to resolve authenticated user", e);
    }
    return next();
}

// Converts express-jwt validation failures (invalid/expired/wrong-audience
// token) into a 401 rather than letting them surface as a 500.
export function jwtErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    if (err && (err.name === "UnauthorizedError" || err.status === 401)) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
    return next(err);
}
