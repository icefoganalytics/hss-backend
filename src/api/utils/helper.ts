import knex, { Knex } from "knex";
import { DB_CONFIG_GENERAL, SCHEMA_GENERAL } from "../config";
import { logger } from "./logger";

// One knex instance — and therefore one Oracle connection pool — per config
// object. Knex's oracledb dialect already recovers from lost connections on its
// own: a query that fails with a connection error (see the ~25 codes in
// knex/lib/dialects/oracle/utils.js `isConnectionError` — DPI-1010, DPI-1080,
// ORA-03113/03114/03135, ORA-00028, ORA-12514, ...) closes that connection and
// marks it `__knex__disposed`, so tarn's `validate` hook refuses to reissue it
// and the pool replaces it. That happens per connection, which is the right
// granularity.
//
// This function used to hand-roll the same recovery by probing with
// `select sysdate from dual` on every request and rebuilding the whole knex
// instance whenever the probe failed — discarding the entire pool because one
// connection went bad, and never calling destroy() on the old instance. Each
// rebuild orphaned a pool's worth of Oracle sessions, which starved the next
// pool, which failed the next probe: the "connection has been closed due to an
// error" spam ending in "KnexTimeoutError: Timeout acquiring a connection.
// The pool is probably full". It is now a plain memoized accessor.
const clients = new Map<any, Knex>();

export async function getOracleClient(knexClient: any | undefined, configOptions: any): Promise<any> {
    let client = clients.get(configOptions);

    if (!client) {
        // Adopt a caller's existing instance rather than opening a second pool
        // for the same config.
        client = knexClient ?? knex(configOptions);
        clients.set(configOptions, client as Knex);
    }

    return client;
}

export const getJsonDataList = (fieldData: any): Array<any> => {
    const json = JSON.parse(fieldData);
    const list = json ?? [];
    return list;
};

export async function insertLog(dataLog: any): Promise<boolean> {
    // Audit logging must never break the request that triggered it.
    try {
        const db = await getOracleClient(undefined, DB_CONFIG_GENERAL);
        await db(`${SCHEMA_GENERAL}.ACTION_LOGS`).insert(dataLog).into(`${SCHEMA_GENERAL}.ACTION_LOGS`);
        return true;
    } catch (error) {
        logger.error("Failed to write action log", error);
        return false;
    }
};

export async function insertLogIdReturn(dataLog: any): Promise<number | boolean | string> {
    try {
        const db = await getOracleClient(undefined, DB_CONFIG_GENERAL);
        const logInsertedId = await db(`${SCHEMA_GENERAL}.ACTION_LOGS`)
            .insert(dataLog)
            .into(`${SCHEMA_GENERAL}.ACTION_LOGS`)
            .returning('ID');

        return logInsertedId[0].id;
    } catch (error) {
        logger.error("Failed to write action log", error);
        return false;
    }
};