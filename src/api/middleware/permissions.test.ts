// Tests for the checkPermissions middleware — the choke point that enforces
// authentication + authorization on every staff route (audit CRIT-01).
// With JWT auth, a valid Bearer token populates req.auth and loadUser populates
// req.user.db_user; checkPermissions reads those (no DB call of its own).

jest.mock('../config', () => ({ SKIP_PERMISSIONS: false }));
jest.mock('../utils', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

import { checkPermissions } from './permissions';

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

// An authenticated request: req.auth = validated claims, req.user.db_user loaded.
const authedReq = (permissionNames: string[] = []): any => ({
    auth: { sub: "auth0|123", email: "staff@example.com" },
    user: {
        oid_user: { email: "staff@example.com" },
        db_user: { permissions: permissionNames.map((permission_name) => ({ permission_name })) },
    },
});

const anonReq = (): any => ({ auth: undefined, user: undefined });

describe('checkPermissions', () => {
    beforeEach(() => jest.clearAllMocks());

    it('rejects anonymous requests (no req.auth) with 401', async () => {
        const res = mockRes();
        const next = jest.fn();

        await checkPermissions('dental_view')(anonReq(), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows a user that holds the required permission', async () => {
        const res = mockRes();
        const next = jest.fn();

        await checkPermissions('dental_view')(authedReq(['dental_view']), res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('rejects an authenticated user that lacks the permission with 401', async () => {
        const res = mockRes();
        const next = jest.fn();

        await checkPermissions('dental_view')(authedReq(['hipma_view']), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('requires ALL permissions when several are passed', async () => {
        const res = mockRes();
        const next = jest.fn();

        await checkPermissions('dental_view', 'dental_update')(authedReq(['dental_view']), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects when the user has no resolved permissions', async () => {
        const res = mockRes();
        const next = jest.fn();

        await checkPermissions('dental_view')({ auth: { sub: "x" }, user: { db_user: {} } } as any, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });
});
