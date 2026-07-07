// Verifies SKIP_PERMISSIONS is parsed as a real boolean (audit CRIT-06).
// The original `process.env.SKIP_PERMISSIONS || false` made the string "false"
// truthy, which ENABLED the bypass when an operator tried to disable it.

describe('SKIP_PERMISSIONS parsing (CRIT-06)', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...ORIGINAL_ENV };
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    function loadSkipPermissions(): unknown {
        let value: unknown;
        jest.isolateModules(() => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            value = require('./config').SKIP_PERMISSIONS;
        });
        return value;
    }

    it('defaults to false when the variable is unset', () => {
        delete process.env.SKIP_PERMISSIONS;
        expect(loadSkipPermissions()).toBe(false);
    });

    it('is false for the string "false" (the footgun being fixed)', () => {
        process.env.SKIP_PERMISSIONS = 'false';
        expect(loadSkipPermissions()).toBe(false);
    });

    it('is false for any other non-"true" string', () => {
        process.env.SKIP_PERMISSIONS = 'yes';
        expect(loadSkipPermissions()).toBe(false);
    });

    it('is true only for the exact string "true"', () => {
        process.env.SKIP_PERMISSIONS = 'true';
        expect(loadSkipPermissions()).toBe(true);
    });
});
