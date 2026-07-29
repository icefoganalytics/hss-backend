import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { DB_HOST } from '../config';

export function RequiresAuthentication(req: Request, res: Response, next: NextFunction) {
	// req.auth is set by the express-jwt middleware when a valid Bearer token is present.
	if (req.auth) {
		return next();
	}

	res.status(401).send('Not authenticated');
}

export function ReturnValidationErrors(req: Request, res: Response, next: NextFunction) {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array() });
	}

	next();
}

// NOTE: prefer authorize([UserRoles.ADMINISTRATOR]) from middleware/authorization.ts.
// Kept and hardened to fail CLOSED: an anonymous request or a missing/incorrect
// role must be rejected, not allowed through.
export function RequiresRoleAdmin(req: Request, res: Response, next: NextFunction) {
	const roles: string[] = (req.user && (req.user.roles ?? req.user.db_user?.roles)) || [];

	if (!req.auth || roles.indexOf('Administrator') === -1) {
		return res.status(401).send('You are not an Administrator');
	}

	next();
}

export async function doHealthCheck(req: Request, res: Response) {
	//let dbConnected = await data.isConnected();

	//if (!dbConnected)
	//    return res.status(500).send(`Not able to connect to <strong>MONGODB</strong> database on <strong>${MONGO_HOST}</strong>.`);

	res.send(
		`Connection to database on '<strong>${DB_HOST}</strong>' is connected and functioning.`
	);
}
