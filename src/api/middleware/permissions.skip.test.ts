// Verifies the SKIP_PERMISSIONS bypass only engages when the flag is truly true.
// Paired with config.test.ts, this covers audit CRIT-06 (the "false" string footgun).

jest.mock('../config', () => ({ SKIP_PERMISSIONS: true }));
jest.mock('../utils', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

import { checkPermissions } from './permissions';

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

describe('checkPermissions with SKIP_PERMISSIONS = true', () => {
    it('bypasses auth/permission checks and calls next', async () => {
        const res = mockRes();
        const next = jest.fn();

        // Even an anonymous request (no req.auth) passes when the bypass is enabled.
        await checkPermissions('dental_view')({ auth: undefined, user: undefined } as any, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
