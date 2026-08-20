import http2 from "http2";
import { SignJWT, importPKCS8 } from "jose";

// Direct APNs (Apple's HTTP/2 provider API), not Firebase/FCM — Apple's own JWT-based
// provider auth is simpler than managing per-app push certificates, and needs no extra
// dependency: `jose` (already used in ./apple-auth.ts to verify Apple's identity token) can
// also sign JWTs, and Node's built-in `http2` module is exactly what APNs requires (it
// doesn't accept plain HTTP/1.1).

const APNS_HOST = "https://api.push.apple.com"; // production — TestFlight/App Store builds
// use production APNs, never sandbox; sandbox is only for local Xcode debug builds, which
// this all-Codemagic project doesn't have.

let cachedProviderToken: { token: string; issuedAt: number } | null = null;
const TOKEN_MAX_AGE_MS = 50 * 60 * 1000; // Apple expires provider tokens at 1h; refresh before then.

// Builds (and caches) the provider JWT APNs requires on every request, signed with the
// APNs Auth Key (.p8) — ES256, keyed by APNS_KEY_ID, issued by APNS_TEAM_ID. All three come
// from Render environment variables set by Anatole from the Apple Developer Portal.
async function getApnsProviderToken(): Promise<string> {
  if (cachedProviderToken && Date.now() - cachedProviderToken.issuedAt < TOKEN_MAX_AGE_MS) {
    console.log(`🍎 [apns] reusing cached provider token, originally signed at ${new Date(cachedProviderToken.issuedAt).toISOString()}`);
    return cachedProviderToken.token;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const authKeyB64 = process.env.APNS_AUTH_KEY_B64;
  if (!keyId || !teamId || !authKeyB64) {
    throw new Error("APNs isn't configured (missing APNS_KEY_ID/APNS_TEAM_ID/APNS_AUTH_KEY_B64)");
  }

  const pem = Buffer.from(authKeyB64, "base64").toString("utf8");
  const privateKey = await importPKCS8(pem, "ES256");

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .sign(privateKey);

  // Temporary — narrowing down a persistent "InvalidProviderToken" from Apple after every
  // other value was verified byte-exact against what's configured. A wrong server clock
  // (iat too far from Apple's own idea of "now") produces exactly this error.
  console.log(`🍎 [apns] signed provider token at ${new Date().toISOString()} (kid=${keyId}, iss=${teamId})`);

  cachedProviderToken = { token, issuedAt: Date.now() };
  return token;
}

export async function sendPushNotification(
  deviceToken: string,
  payload: { title: string; body: string; data?: Record<string, string> }
): Promise<void> {
  const providerToken = await getApnsProviderToken();
  const bundleId = process.env.APPLE_BUNDLE_ID || "com.beaudoin.faceup";
  console.log(`🍎 [apns] sending to device token (len ${deviceToken.length}, starts ${deviceToken.slice(0, 8)}…) topic=${bundleId}`);

  await new Promise<void>((resolve, reject) => {
    const client = http2.connect(APNS_HOST);
    client.on("error", (err) => reject(err));

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${providerToken}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
      // Without this, Apple defaults to "expires immediately" — a device that's offline
      // (airplane mode, dead zone, powered off) at the exact moment of the send never gets
      // the notification at all, even once it reconnects. 24h covers an overnight/no-signal
      // gap while still discarding anything that's gone properly stale.
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 24 * 60 * 60),
    });

    let status = 0;
    let responseBody = "";

    req.on("response", (headers) => {
      status = Number(headers[":status"]);
    });
    req.on("data", (chunk) => {
      responseBody += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status === 200) {
        resolve();
      } else {
        reject(new Error(`APNs rejected the push (status ${status}): ${responseBody || "no body"}`));
      }
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.end(JSON.stringify({
      aps: {
        alert: { title: payload.title, body: payload.body },
        sound: "default",
      },
      // Custom keys live as siblings of "aps", not nested inside it — read by the client via
      // PushNotificationSchema.data when the user taps the notification (see
      // pushNotificationActionPerformed in client/src/lib/pushNotifications.ts).
      ...payload.data,
    }));
  });
}
