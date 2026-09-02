import posthog from "posthog-js";
import {
  getTrackingAuthorizationStatus,
  isTrackingAuthorizationGranted,
  type TrackingAuthorizationStatus,
} from "@/lib/tracking-authorization";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

let initialized = false;

// Starts PostHog at app boot, before the ATT pop-up has necessarily been answered (it's
// requested lazily from App.tsx's effect, same timing as today's AdMob init). Persistence
// starts as "memory" — no cookie/localStorage identifier is written — so nothing durable is
// stored until (and unless) the user actually grants tracking; see syncAnalyticsTrackingConsent.
export function initAnalytics() {
  if (initialized || !POSTHOG_KEY || !POSTHOG_HOST) return;
  initialized = true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: "memory",
    // Anonymous (pre-identify) events don't create/update a Person profile — keeps
    // unauthenticated traffic from being tied to any persistent profile.
    person_profiles: "identified_only",
    // Never record raw keystrokes from any input (passwords included) in session replay.
    session_recording: {
      maskAllInputs: true,
    },
  });

  // Fired at boot, before ATT has necessarily settled — persistence is still "memory" at
  // this point (see above), so this never writes a device/cookie identifier.
  posthog.capture("session_start");
}

// ATT's own status casing ("notDetermined") doesn't match the snake_case the dashboard's
// HogQL groups by ("not_determined") — normalize it here so the two stay in sync.
function toAttConsentStatus(status: TrackingAuthorizationStatus): string {
  return status === "notDetermined" ? "not_determined" : status;
}

// Call once the ATT prompt has settled (or immediately on Android/web, where it's a no-op
// resolving "unsupported"). Upgrades persistence to durable storage only on an actual grant;
// a refusal leaves PostHog running but permanently cookieless/anonymous for the session.
export async function syncAnalyticsTrackingConsent(): Promise<void> {
  if (!initialized) return;
  const status = await getTrackingAuthorizationStatus();
  const granted = isTrackingAuthorizationGranted(status);
  posthog.set_config({
    persistence: granted ? "localStorage+cookie" : "memory",
  });
  if (!granted) {
    // Covers a user who granted ATT on a previous install/session (durable persistence,
    // identify() already called) and has since revoked it in iOS Settings: without this, this
    // session would stop writing new durable data but would leave the old device_id/distinct_id
    // pairing intact. reset(true) regenerates both, so no identifier from the consented period
    // carries forward into the now-unconsented session.
    posthog.reset(true);
  }
  // Recorded under whichever persistence mode was just set above: still "memory" (no
  // device/cookie write, no distinct_id persisted) whenever ATT was refused or left
  // unanswered, and this never calls identify() itself — so a refusal is reported without
  // ever leaving anonymous mode.
  posthog.capture("att_consent_response", { status: toAttConsentStatus(status) });
}

// Links analytics events to the signed-in Supabase user UUID. Skipped entirely when ATT was
// refused, per Apple/GDPR: no cross-session identifier is ever attached without consent.
export async function identifyAnalyticsUser(userId: string): Promise<void> {
  if (!initialized) return;
  const status = await getTrackingAuthorizationStatus();
  if (!isTrackingAuthorizationGranted(status)) return;
  posthog.identify(userId);
}

// Call on logout so a later sign-in (possibly a different account, same device) doesn't
// inherit the previous user's distinct_id — reset(true) also rolls the device_id, so two
// accounts signed into sequentially on a shared device can't be correlated via it either.
export function resetAnalyticsUser(): void {
  if (!initialized) return;
  posthog.reset(true);
}

// How many losses in a row before game_consecutive_loss fires. Arbitrary but deliberate:
// low enough to catch a real losing spell within one sitting, high enough that ordinary
// variance (a couple of bad hands) doesn't trigger it on every session.
const CONSECUTIVE_LOSS_THRESHOLD = 3;

let consecutiveLosses = 0;
// Fires once per losing streak, right when it crosses the threshold — not on every loss
// after that — so a long bad run doesn't spam one event per hand.
let consecutiveLossStreakReported = false;

// Called once per settled round from the game screen. `isAllIn` means the player wagered
// their entire coin balance on that hand (read before the bet was placed, not after — the
// server has already debited it by the time the result comes back).
export function trackRoundResult(result: "win" | "loss" | "tie", options: { isAllIn: boolean }): void {
  if (!initialized) return;

  if (result === "loss") {
    consecutiveLosses += 1;
    if (options.isAllIn) {
      posthog.capture("game_all_in_loss");
    }
    if (consecutiveLosses >= CONSECUTIVE_LOSS_THRESHOLD && !consecutiveLossStreakReported) {
      consecutiveLossStreakReported = true;
      posthog.capture("game_consecutive_loss", { streak: consecutiveLosses });
    }
  } else if (result === "win") {
    consecutiveLosses = 0;
    consecutiveLossStreakReported = false;
  }
  // "tie" (push) neither extends nor breaks a losing streak — no coins were actually lost.
}

// Call right after the delete-account request succeeds, before the caller logs the user out
// (which calls resetAnalyticsUser/reset(true) and would otherwise wipe the identified
// distinct_id this event needs to be attributed to).
export function trackAccountDeleted(): void {
  if (!initialized) return;
  posthog.capture("account_deleted");
}

// Call from the native app-lifecycle listener when the app leaves the foreground.
export function trackAppBackgrounded(): void {
  if (!initialized) return;
  posthog.capture("app_backgrounded");
}

export default posthog;
