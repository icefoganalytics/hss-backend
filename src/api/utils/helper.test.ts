// Tests for getOracleClient — the pool-lifecycle choke point.
//
// The bug being guarded against: the old implementation probed the connection
// on every request and rebuilt the entire knex instance whenever that probe
// failed, without destroying the old one. Each rebuild orphaned a pool's worth
// of Oracle sessions, ending in "KnexTimeoutError: Timeout acquiring a
// connection. The pool is probably full". Recovery from lost connections is
// knex's job (its oracledb dialect disposes broken connections individually);
// this helper's only job is to hand out one client per config.

const mockKnex = jest.fn();
jest.mock('knex', () => ({ __esModule: true, default: (cfg: any) => mockKnex(cfg) }));
jest.mock('../config', () => ({ DB_CONFIG_GENERAL: { client: 'oracledb' }, SCHEMA_GENERAL: 'GEN' }));
jest.mock('./logger', () => ({ logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }));

const makeClient = () => {
    const client: any = jest.fn();
    client.raw = jest.fn().mockResolvedValue([]);
    client.destroy = jest.fn().mockResolvedValue(undefined);
    return client;
};

describe('getOracleClient', () => {
    let getOracleClient: any;
    const CONFIG_A = { client: 'oracledb', tag: 'a' };
    const CONFIG_B = { client: 'oracledb', tag: 'b' };

    beforeEach(() => {
        jest.resetModules();
        mockKnex.mockReset().mockImplementation(makeClient);
        getOracleClient = require('./helper').getOracleClient;
    });

    it('opens exactly one pool per config, however many times it is called', async () => {
        const a = await getOracleClient(undefined, CONFIG_A);
        const b = await getOracleClient(undefined, CONFIG_A);
        const c = await getOracleClient(a, CONFIG_A);

        expect(b).toBe(a);
        expect(c).toBe(a);
        expect(mockKnex).toHaveBeenCalledTimes(1);
    });

    it('keeps separate pools for separate configs', async () => {
        const a = await getOracleClient(undefined, CONFIG_A);
        const b = await getOracleClient(undefined, CONFIG_B);

        expect(b).not.toBe(a);
        expect(mockKnex).toHaveBeenCalledTimes(2);
    });

    it("adopts a caller's existing client rather than opening a second pool", async () => {
        const existing = makeClient();

        expect(await getOracleClient(existing, CONFIG_A)).toBe(existing);
        expect(await getOracleClient(undefined, CONFIG_A)).toBe(existing);
        expect(mockKnex).not.toHaveBeenCalled();
    });

    it('never probes the connection — knex validates on acquire', async () => {
        const client = await getOracleClient(undefined, CONFIG_A);
        await getOracleClient(client, CONFIG_A);
        await getOracleClient(client, CONFIG_A);

        expect(client.raw).not.toHaveBeenCalled();
    });

    it('never discards a pool, so sessions cannot be orphaned', async () => {
        const client = await getOracleClient(undefined, CONFIG_A);
        for (let i = 0; i < 50; i++) await getOracleClient(client, CONFIG_A);

        expect(client.destroy).not.toHaveBeenCalled();
        expect(mockKnex).toHaveBeenCalledTimes(1);
    });
});
