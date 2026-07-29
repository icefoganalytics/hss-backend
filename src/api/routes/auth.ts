import { Express, NextFunction, Request, Response } from "express";
import { SCHEMA_GENERAL } from "../config";
import { helper, logger } from "../utils";
import { parseJwt, loadUser, jwtErrorHandler } from "../middleware/jwt";

// Authentication is now stateless JWT (Auth0 access tokens validated against the
// IdP's JWKS) — the express-openid-connect session/redirect flow and Redis-backed
// sessions have been removed. Login/logout happen in the SPA via the Auth0 SDK.
export function configureAuthentication(app: Express) {
    // Validate the Bearer JWT (if present) and resolve the DB user onto req.user.
    // Rate limiting + body parsing run earlier (see index.ts).
    app.use(parseJwt);
    app.use(jwtErrorHandler);
    app.use(loadUser);

    // Returns the user resolved from the Bearer token, or 401 if unauthenticated.
    app.get("/api/auth/isAuthenticated", (req: Request, res: Response) => {
        if (req.auth && req.user) {
            return res.send({ data: req.user });
        }
        return res.status(401).send();
    });

    // The SPA calls this once after a successful login so the action is audited
    // (there is no longer a server-side login redirect to hook the audit onto).
    app.post("/api/auth/loginEvent", async (req: Request, res: Response) => {
        try {
            if (!req.auth || !req.user?.db_user?.user) {
                return res.status(401).send();
            }

            const loggedAction = await helper.insertLog({
                ACTION_TYPE: 1,
                TITLE: "Login",
                SCHEMA_NAME: SCHEMA_GENERAL,
                USER_ID: req.user.db_user.user.id,
            });

            if (!loggedAction) {
                logger.error("Login action could not be logged");
            }

            return res.send({ data: { ok: true } });
        } catch (e) {
            logger.error("Unhandled error in request handler", e);
            return res.send({ status: 400, message: 'Request could not be processed' });
        }
    });
}

export function EnsureAuthenticated(req: Request, res: Response, next: NextFunction) {
    if (req.auth) {
        return next();
    }

    res.status(401).send("Not authenticated");
}
