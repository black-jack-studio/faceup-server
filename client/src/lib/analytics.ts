import posthog from "posthog-js";
import { getTrackingAuthorizationStatus, isTrackingAuthorizationGranted } from "@/lib/tracking-authorization";

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
}

// Call once the ATT prompt has settled (or immediately on Android/web, where it's a no-op
// resolving "unsupported"). Upgrades persistence to durable storage only on an actual grant;
// a refusal leaves PostHog running but permanently cookieless/anonymous for the session.
export async function syncAnalyticsTrackingConsent(): Promise<void> {
  if (!initialized) return;
  const status = await getTrackingAuthorizationStatus();
  posthog.set_config({
    persistence: isTrackingAuthorizationGranted(status) ? "localStorage+cookie" : "memory",
  });
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
// inherit the previous user's distinct_id.
export function resetAnalyticsUser(): void {
  if (!initialized) return;
  posthog.reset();
}

export default posthog;
