// Tests for RequiresRoleAdmin (audit HIGH-01 — must fail closed) and
// ReturnValidationErrors (audit MED-08 — declared validators must be enforced).

jest.mock('express-validator', () => ({ validationResult: jest.fn() }));

import { RequiresRoleAdmin, ReturnValidationErrors } from './index';
import { validationResult } from 'express-validator';

function mockRes() {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
}

describe('RequiresRoleAdmin (fail closed)', () => {
    it('rejects an anonymous request', () => {
        const res = mockRes();
        const next = jest.fn();

        RequiresRoleAdmin(
            { auth: undefined, user: undefined } as any,
            res,
            next,
        );

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('rejects an authenticated non-administrator', () => {
        const res = mockRes();
        const next = jest.fn();

        RequiresRoleAdmin(
            { auth: { sub: 'x' }, user: { roles: ['Dental Editor'] } } as any,
            res,
            next,
        );

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('allows an authenticated Administrator', () => {
        const res = mockRes();
        const next = jest.fn();

        RequiresRoleAdmin(
            { auth: { sub: 'x' }, user: { roles: ['Administrator'] } } as any,
            res,
            next,
        );

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe('ReturnValidationErrors', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 when validation errors are present', () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({
            isEmpty: () => false,
            array: () => [{ msg: 'Invalid value', param: 'id' }],
        });
        const res = mockRes();
        const next = jest.fn();

        ReturnValidationErrors({} as any, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next when there are no validation errors', () => {
        (validationResult as unknown as jest.Mock).mockReturnValue({ isEmpty: () => true });
        const res = mockRes();
        const next = jest.fn();

        ReturnValidationErrors({} as any, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
