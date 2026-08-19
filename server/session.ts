import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool as PgPool } from "pg";
import { sessionConnectionString } from "./db";

// Sessions used to live in memory (MemoryStore), which meant every server restart — including
// Render free-tier spinning the service down after idle periods, or every deploy — silently
// logged every user out. Storing sessions in Postgres instead survives restarts.
//
// Supabase's pooler requires TLS. Unlike the main Drizzle connection (the `postgres` package,
// which negotiates TLS automatically), raw `pg.Pool` does not enable it unless told to — without
// this, every session save fails silently against Supabase ("Session save failed" on every
// request), which blocks login/register entirely since the app fetches a CSRF token first.
const PgSessionStore = connectPgSimple(session);
const sessionPool = new PgPool({
  connectionString: sessionConnectionString,
  ssl: process.env.USE_SUPABASE === 'true' ? { rejectUnauthorized: false } : undefined,
  // Left unset, `pg.Pool` defaults to max: 10 — combined with the main Drizzle pool
  // (./db.ts, also capped) that let this app alone exceed Supabase's session-mode pooler
  // ceiling of 15 total connections ("EMAXCONNSESSION max clients reached in session
  // mode"), which was failing requests across unrelated routes, not just this one.
  max: 4,
});

const ANON_SESSION_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours — see routes.ts's own
// SIGNED_IN_SESSION_MAX_AGE_MS for the longer maxAge applied after a successful login.

// Extracted to its own module (rather than defined inline in routes.ts's registerRoutes)
// so the exact same middleware instance can also authenticate the WebSocket upgrade
// handshake in server/websocket.ts — reading req.session there needs it to have already
// run against the same session store, not a separately configured one.
export const sessionMiddleware = session({
  store: new PgSessionStore({
    pool: sessionPool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 86400, // prune expired entries every 24h (seconds, not ms)
  }),
  secret: process.env.SESSION_SECRET || 'blackjack-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 🔒 HTTPS only in production
    httpOnly: true,
    maxAge: ANON_SESSION_MAX_AGE_MS,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' // 🔒 Allow cross-site for mobile app in production
  }
});
