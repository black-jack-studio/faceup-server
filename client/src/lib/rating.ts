import { InAppReview } from "@capacitor-community/in-app-review";
import { Capacitor } from "@capacitor/core";

// Triggers the native App Store (iOS) / Play Store (Android) review sheet. Whether it actually
// appears is entirely up to the OS — both platforms enforce their own display quota
// (SKStoreReviewController caps at ~3 prompts/year on iOS) and silently no-op the request once
// that quota is spent, so this is safe to call without any extra confirmation UI of our own.
export function requestAppReview() {
  if (!Capacitor.isNativePlatform()) return; // no store review sheet on web
  InAppReview.requestReview().catch(() => {});
}
