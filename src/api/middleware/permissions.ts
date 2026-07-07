import { Request, Response, NextFunction } from "express";
import { SKIP_PERMISSIONS } from '../config';
import { logger } from '../utils';

// Enforces that the request carries a valid Bearer JWT (req.auth, set by the
// express-jwt middleware) AND that the resolved DB user (req.user.db_user, set
// by loadUser) holds every named permission.
export function checkPermissions(...permission: string[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Skip permissions system validation (intended for local development only).
            if (SKIP_PERMISSIONS) {
                return next();
            }

            // Reject anonymous requests (no valid token → no req.auth).
            if (!req.auth) {
                return res.status(401).json({ message: "Not authenticated" });
            }

            const permissions = req.user?.db_user?.permissions ?? null;

            const hasAllPermissions =
                !!permissions &&
                permission.every((x) =>
                    (permissions ?? []).some((p: any) => p.permission_name === x)
                );

            if (!hasAllPermissions) {
                return res.status(401).json({ message: "Not Authorized" });
            }

            return next();
        } catch (e) {
            logger.error("Permission check failed", e);
            return res.status(401).json({ message: "Not Authorized" });
        }
    };
}
