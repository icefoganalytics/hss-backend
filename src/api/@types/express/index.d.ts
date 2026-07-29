namespace Express {
    export interface Request {
        user?: any;
        // Validated JWT claims, set by the express-jwt middleware (requestProperty: "auth").
        auth?: any;
        sessionId?: string;
        oidc?: any;
    }
}
