import { Capacitor } from "@capacitor/core";
import { AdMob } from "@capacitor-community/admob";

export type TrackingAuthorizationStatus =
  | "authorized"
  | "denied"
  | "restricted"
  | "notDetermined"
  | "unsupported"
  | "error";

let statusPromise: Promise<TrackingAuthorizationStatus> | null = null;

// Resolves the iOS App Tracking Transparency (ATT) result, prompting the user with the native
// system pop-up at most once per install. Routed through @capacitor-community/admob's own
// wrapper around the ATT APIs rather than a second dedicated ATT plugin: iOS only ever shows
// this dialog once, and admob.ts's initAdMob() needs the exact same prompt before requesting
// ads, so every caller (AdMob init, PostHog consent, identify calls) shares this one memoized
// promise instead of racing separate requests for the same OS dialog.
export function getTrackingAuthorizationStatus(): Promise<TrackingAuthorizationStatus> {
  if (!statusPromise) {
    statusPromise = (async () => {
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
        // Android and web have no ATT-equivalent OS gate.
        return "unsupported";
      }
      try {
        const current = await AdMob.trackingAuthorizationStatus();
        if (current.status !== "notDetermined") {
          return current.status as TrackingAuthorizationStatus;
        }
        // requestTrackingAuthorization() itself resolves void once the user answers the
        // pop-up — the resulting status has to be read back with a second call.
        await AdMob.requestTrackingAuthorization();
        const resolved = await AdMob.trackingAuthorizationStatus();
        return resolved.status as TrackingAuthorizationStatus;
      } catch {
        // A plugin/bridge failure on an actual iOS device must NOT be treated the same as
        // "unsupported" (Android/web, where isTrackingAuthorizationGranted below defaults to
        // true) — that would silently grant tracking/identify without the user ever having
        // seen, let alone answered, the ATT pop-up. Fail closed instead.
        return "error";
      }
    })();
  }
  return statusPromise;
}

// "unsupported" (Android/web — no ATT-equivalent gate exists there) is treated as granted.
// Every other non-"authorized" status — including "error", deliberately not folded into
// "unsupported" above — fails closed.
export function isTrackingAuthorizationGranted(status: TrackingAuthorizationStatus): boolean {
  return status === "authorized" || status === "unsupported";
}
