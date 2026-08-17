import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const APPLE_ISSUER = 'https://appleid.apple.com';
// Apple's public signing keys, fetched once and cached/refreshed automatically by jose.
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export interface AppleTokenPayload {
  sub: string; // Apple's stable per-user id — this is what we store as users.appleId
  email?: string;
}

/**
 * Verifies an Apple identity token (JWT) server-side against Apple's public keys.
 * Throws if the token is invalid, expired, or wasn't issued for this app. For a native
 * Sign In with Apple flow (via the Capacitor/AuthenticationServices SDK, not the web
 * REST flow), the token's audience is the app's Bundle ID itself.
 */
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleTokenPayload> {
  const bundleId = process.env.APPLE_BUNDLE_ID || 'com.beaudoin.faceup';
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: bundleId,
  });

  if (typeof payload.sub !== 'string') {
    throw new Error('Apple identity token is missing the sub claim');
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

/**
 * Builds a unique username from the local part of an email, falling back to a random
 * numeric suffix on collision — Apple never provides a username, only an email (and a
 * display name, but only on the very first sign-in, which is too unreliable to depend on).
 */
export async function generateUniqueUsernameFromEmail(email: string): Promise<string> {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'player';

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidate))
      .limit(1);

    if (existing.length === 0) return candidate;
  }

  throw new Error('Failed to generate a unique username after 20 attempts');
}
