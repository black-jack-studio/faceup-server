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
