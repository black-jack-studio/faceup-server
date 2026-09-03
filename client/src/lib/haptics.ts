import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

export { ImpactStyle };

const STORAGE_KEY = "faceup-haptics-enabled";

export function isHapticsEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== "false";
}

export function setHapticsEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

// Same light "tic" used by BottomNav on every tab tap (see BottomNav.tsx's handleNavigate) —
// centralized here now that it's wired into several more tap targets (Profile's quick-access
// rows, rank progress) instead of each call site repeating the native-platform check.
export function triggerHapticTick() {
  if (Capacitor.isNativePlatform() && isHapticsEnabled()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}

// Heavier than triggerHapticTick — for moments that should read as a real jolt rather than a
// tap acknowledgment (e.g. a chest reward landing), not just any button press.
export function triggerHapticImpact(style: ImpactStyle = ImpactStyle.Medium) {
  if (Capacitor.isNativePlatform() && isHapticsEnabled()) {
    Haptics.impact({ style }).catch(() => {});
  }
}

// The native "success" pattern (distinct from a single impact pulse) — reserved for the
// biggest reward moments (crown chests) so they physically feel different from a routine one.
export function triggerHapticSuccess() {
  if (Capacitor.isNativePlatform() && isHapticsEnabled()) {
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  }
}
