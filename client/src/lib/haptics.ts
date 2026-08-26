import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// Same light "tic" used by BottomNav on every tab tap (see BottomNav.tsx's handleNavigate) —
// centralized here now that it's wired into several more tap targets (Profile's quick-access
// rows, rank progress) instead of each call site repeating the native-platform check.
export function triggerHapticTick() {
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  }
}
