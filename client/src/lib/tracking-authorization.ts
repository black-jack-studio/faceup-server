import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

export type TrackingAuthorizationStatus =
  | "authorized"
  | "denied"
  | "restricted"
  | "notDetermined"
  | "unsupported"
  | "error";

// Read-only: reports the current iOS App Tracking Transparency status without ever prompting.
// Safe to call from anywhere — ad requests, analytics init, login/register — since it can't
// pop the native dialog. requestTrackingAuthorization below is the only thing allowed to do
// that, and it's called exclusively from the custom pre-permission popup on Home (see
// TrackingPermissionPopup) once the player actually accepts it.
export async function peekTrackingAuthorizationStatus(): Promise<TrackingAuthorizationStatus> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    // Android and web have no ATT-equivalent OS gate.
    return "unsupported";
  }
  try {
    const current = await AdMob.trackingAuthorizationStatus();
    return current.status as TrackingAuthorizationStatus;
  } catch {
    // A plugin/bridge failure on an actual iOS device must NOT be treated the same as
    // "unsupported" (Android/web, where isTrackingAuthorizationGranted below defaults to
    // true) — that would silently grant tracking/identify without the user ever having
    // seen, let alone answered, the ATT pop-up. Fail closed instead.
    return "error";
  }
}

let requestPromise: Promise<TrackingAuthorizationStatus> | null = null;

// Prompts the native ATT dialog if (and only if) the status is still undetermined — iOS only
// ever shows this once per install, so every caller shares this one memoized promise instead
// of racing separate requests for the same OS dialog. Routed through
// @capacitor-community/admob's own wrapper around the ATT APIs rather than a second dedicated
// ATT plugin, since admob.ts needs the exact same status anyway.
export function requestTrackingAuthorization(): Promise<TrackingAuthorizationStatus> {
  if (!requestPromise) {
    requestPromise = (async () => {
      const current = await peekTrackingAuthorizationStatus();
      if (current !== "notDetermined") return current;
      try {
        await AdMob.requestTrackingAuthorization();
        const resolved = await AdMob.trackingAuthorizationStatus();
        return resolved.status as TrackingAuthorizationStatus;
      } catch {
        return "error";
      }
    })();
  }
  return requestPromise;
}

// "unsupported" (Android/web — no ATT-equivalent gate exists there) is treated as granted.
// Every other non-"authorized" status — including "error", deliberately not folded into
// "unsupported" above — fails closed.
export function isTrackingAuthorizationGranted(status: TrackingAuthorizationStatus): boolean {
  return status === "authorized" || status === "unsupported";
}
