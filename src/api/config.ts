import * as dotenv from "dotenv";

let path;
switch (process.env.NODE_ENV) {
  case "test":
    path = `.env.test`;
    break;
  case "production":
    path = `.env`;
    break;
  default:
    path = `.env.development`;
}
dotenv.config({ path: path });

console.log("API NODE_ENV", process.env.NODE_ENV);

export const API_PORT = parseInt(process.env.API_PORT || "3000");
export const FRONTEND_URL = process.env.FRONTEND_URL || "";
export const AUTH_REDIRECT = process.env.AUTH_REDIRECT || process.env.FRONTEND_URL || "";
export const NODE_ENV = process.env.NODE_ENV;

export const DB_USER = process.env.DB_USER || '';
export const DB_PASS = process.env.DB_PASS || '';
export const DB_HOST = process.env.DB_HOST || '';
export const DB_PORT = process.env.DB_PORT || '';
export const DB_NAME = process.env.DB_NAME || '';
export const DB_SERVICE = process.env.DB_SERVICE || '';

// Parse explicitly so SKIP_PERMISSIONS=false disables the bypass (a non-empty
// string like "false" is truthy). Defaults to the secure value (bypass off).
export const SKIP_PERMISSIONS = process.env.SKIP_PERMISSIONS === 'true';

export const SCHEMA_CONSTELLATION = process.env.SCHEMA_CONSTELLATION || '';
export const SCHEMA_MIDWIFERY = process.env.SCHEMA_MIDWIFERY || '';
export const SCHEMA_HIPMA = process.env.SCHEMA_HIPMA || '';
export const SCHEMA_GENERAL = process.env.SCHEMA_GENERAL || '';
export const SCHEMA_DENTAL = process.env.SCHEMA_DENTAL || '';

export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PASS = process.env.REDIS_PASS || '';
export const REDIS_PORT = process.env.REDIS_PORT || '6379';

// Dedicated session-signing secret. Falls back to REDIS_PASS only for backward
// compatibility; set a distinct high-entropy SESSION_SECRET in every environment
// so the session and Redis trust domains are not coupled (see audit MED-07).
export const SESSION_SECRET = process.env.SESSION_SECRET || REDIS_PASS || '';

// --- JWT / Auth0 (replaces the express-openid-connect session flow) ---
// The API now validates Auth0-issued RS256 access tokens (Bearer) against the
// IdP's JWKS rather than running a server-side OIDC login.
export const AUTH_ISSUER = (process.env.ISSUER_BASE_URL || '').replace(/\/+$/, '');
export const AUTH_AUDIENCE = process.env.AUTH_AUDIENCE || '';
export const AUTH_JWKS_URI = process.env.AUTH_JWKS_URI || (AUTH_ISSUER ? `${AUTH_ISSUER}/.well-known/jwks.json` : '');
// Auth0 access tokens do not carry email by default. Configure an Auth0 Action
// to add it as a (namespaced) custom claim, then set AUTH_EMAIL_CLAIM to that
// claim name. Falls back to a standard `email` claim if present.
export const AUTH_EMAIL_CLAIM = process.env.AUTH_EMAIL_CLAIM || '';

const postProcessToLowerCase = (result: any, queryContext: any) => {
  if (Array.isArray(result)) {
    const results: { [k: string]: unknown; }[] = [];
    result.forEach((row) => {
      const newObj = Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k.toLowerCase(), v])
      );
        
      results.push(newObj);
    });
    return results;
  } else {
    const newObj = Object.fromEntries(
      Object.entries(result).map(([k, v]) => [k.toLowerCase(), v])
    );
    return newObj;
  }
};

const wrapIdentifierUpper = (value: any, origImpl: any, queryContext: any) => origImpl(value.toUpperCase());

export const DB_CONFIG_CONSTELLATION = {
  client: 'oracledb',
  connection: {
    host: `${DB_HOST}:${DB_PORT}`,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    requestTimeout: 120000,
    instanceName: DB_SERVICE,
    // EXPIRE_TIME enables TNS dead-connection detection: the server probes idle
    // sessions every N minutes and tears down ones whose client has vanished,
    // and it keeps the TCP connection warm so firewalls don't silently drop it.
    // This is the proper cure for the stale connections the old per-request
    // `select sysdate from dual` probe was hand-rolling around.
    connectString: `(DESCRIPTION=(EXPIRE_TIME=1)
        (ADDRESS_LIST=            
        (ADDRESS=(PROTOCOL=TCP)              
        (HOST=${DB_HOST})(PORT=${DB_PORT}) ) )           
        (CONNECT_DATA=(SERVICE_NAME=${DB_SERVICE}) ) )`
  },
  pool: {
    min: 0,
    max: 10,
    propagateCreateError: true,
    idleTimeoutMillis: 120000,
    reapIntervalMillis: 10000
  },
  postProcessResponse: postProcessToLowerCase,
  wrapIdentifier: wrapIdentifierUpper
};

export const DB_CONFIG_MIDWIFERY = {
  client: 'oracledb',
  connection: {
    host: `${DB_HOST}:${DB_PORT}`,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    requestTimeout: 120000,
    instanceName: DB_SERVICE,
    // EXPIRE_TIME enables TNS dead-connection detection: the server probes idle
    // sessions every N minutes and tears down ones whose client has vanished,
    // and it keeps the TCP connection warm so firewalls don't silently drop it.
    // This is the proper cure for the stale connections the old per-request
    // `select sysdate from dual` probe was hand-rolling around.
    connectString: `(DESCRIPTION=(EXPIRE_TIME=1)
        (ADDRESS_LIST=            
        (ADDRESS=(PROTOCOL=TCP)              
        (HOST=${DB_HOST})(PORT=${DB_PORT}) ) )           
        (CONNECT_DATA=(SERVICE_NAME=${DB_SERVICE}) ) )`
  },
  pool: {
    min: 0,
    max: 10,
    propagateCreateError: true,
    idleTimeoutMillis: 120000,
    reapIntervalMillis: 10000
  },
  postProcessResponse: postProcessToLowerCase
};

export const DB_CONFIG_HIPMA = {
  client: 'oracledb',
  connection: {
    host: `${DB_HOST}:${DB_PORT}`,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    requestTimeout: 120000,
    instanceName: DB_SERVICE,
    // EXPIRE_TIME enables TNS dead-connection detection: the server probes idle
    // sessions every N minutes and tears down ones whose client has vanished,
    // and it keeps the TCP connection warm so firewalls don't silently drop it.
    // This is the proper cure for the stale connections the old per-request
    // `select sysdate from dual` probe was hand-rolling around.
    connectString: `(DESCRIPTION=(EXPIRE_TIME=1)
        (ADDRESS_LIST=            
        (ADDRESS=(PROTOCOL=TCP)              
        (HOST=${DB_HOST})(PORT=${DB_PORT}) ) )           
        (CONNECT_DATA=(SERVICE_NAME=${DB_SERVICE}) ) )`
  },
  pool: {
    min: 0,
    max: 10,
    propagateCreateError: true,
    idleTimeoutMillis: 120000,
    reapIntervalMillis: 10000
  },
  postProcessResponse: postProcessToLowerCase
};

export const DB_CONFIG_GENERAL = {
  client: 'oracledb',
  connection: {
    host: `${DB_HOST}:${DB_PORT}`,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    requestTimeout: 120000,
    instanceName: DB_SERVICE,
    // EXPIRE_TIME enables TNS dead-connection detection: the server probes idle
    // sessions every N minutes and tears down ones whose client has vanished,
    // and it keeps the TCP connection warm so firewalls don't silently drop it.
    // This is the proper cure for the stale connections the old per-request
    // `select sysdate from dual` probe was hand-rolling around.
    connectString: `(DESCRIPTION=(EXPIRE_TIME=1)
        (ADDRESS_LIST=            
        (ADDRESS=(PROTOCOL=TCP)              
        (HOST=${DB_HOST})(PORT=${DB_PORT}) ) )           
        (CONNECT_DATA=(SERVICE_NAME=${DB_SERVICE}) ) )`
  },
  pool: {
    min: 0,
    max: 10,
    propagateCreateError: true,
    idleTimeoutMillis: 120000,
    reapIntervalMillis: 10000
  },
  postProcessResponse: postProcessToLowerCase
};

export const DB_CONFIG_DENTAL = {
  client: 'oracledb',
  connection: {
    host: `${DB_HOST}:${DB_PORT}`,
    user: DB_USER,
    password: DB_PASS,
    database: DB_NAME,
    requestTimeout: 120000,
    instanceName: DB_SERVICE,
    // EXPIRE_TIME enables TNS dead-connection detection: the server probes idle
    // sessions every N minutes and tears down ones whose client has vanished,
    // and it keeps the TCP connection warm so firewalls don't silently drop it.
    // This is the proper cure for the stale connections the old per-request
    // `select sysdate from dual` probe was hand-rolling around.
    connectString: `(DESCRIPTION=(EXPIRE_TIME=1)
        (ADDRESS_LIST=            
        (ADDRESS=(PROTOCOL=TCP)              
        (HOST=${DB_HOST})(PORT=${DB_PORT}) ) )           
        (CONNECT_DATA=(SERVICE_NAME=${DB_SERVICE}) ) )`
  },
  pool: {
    min: 0,
    max: 10,
    propagateCreateError: true,
    idleTimeoutMillis: 120000,
    reapIntervalMillis: 10000
  },
  postProcessResponse: postProcessToLowerCase
};

export const REDIS_CONFIG = {
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  secret: REDIS_PASS,
  host: REDIS_HOST,
  port: REDIS_PORT,
};
