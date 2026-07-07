import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../models";


const USER_ACTIVE_STATUS = "Active";

export const UserRoles = {
    ADMINISTRATOR: "Administrator",
};

export const UserRoleOptions = [
    UserRoles.ADMINISTRATOR,
]

export function authorize(roles: string[] = [], allowPending: boolean = false) {
    return (req: Request, res: Response, next: NextFunction) => {
        let currentUser = req.user as AuthUser;

        if (!req.auth || !currentUser)
            return res.status(401).send('Not authenticated');

        if (currentUser.status != USER_ACTIVE_STATUS && !allowPending)
            return res.status(401).json({ message: "Unauthorized - User inactive" });

        // if route only requires an active user
        if (roles.length == 0)
            return next();

        for (let role of roles) {
            if (currentUser.roles && currentUser.roles.indexOf(role) >= 0)
                return next();
        }

        return res.status(401).json({ message: 'Unauthorized - Missing role(s): ' + roles });
    };
}
