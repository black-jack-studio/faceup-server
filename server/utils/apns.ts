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

  cachedProviderToken = { token, issuedAt: Date.now() };
  return token;
}

export async function sendPushNotification(
  deviceToken: string,
  payload: { title: string; body: string }
): Promise<void> {
  const providerToken = await getApnsProviderToken();
  const bundleId = process.env.APPLE_BUNDLE_ID || "com.beaudoin.faceup";

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
    }));
  });
}
