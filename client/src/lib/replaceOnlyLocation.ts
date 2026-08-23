import { useBrowserLocation } from "wouter/use-browser-location";

// Every navigate() call in this app is an explicit tap (bottom nav, a back arrow, etc) —
// nothing here relies on the browser/WebView's own back-forward stack. Wouter's default hook
// still pushes a fresh history entry on every navigation though, so that stack quietly grows
// as you move around the app. iOS's edge-swipe-back gesture (and Android's hardware back
// button) act directly on that stack, popping to whatever entry happens to be there — not
// necessarily the page any in-app control would've taken you to, which is what made a
// left-edge swipe on Profile land on Home sometimes and Settings other times.
// Forcing every navigation to replace instead of push keeps the stack pinned at a single
// entry, so that gesture has nothing left to pop to.
export function useReplaceOnlyLocation(): [string, (to: string, options?: { state?: unknown }) => void] {
  const [location, navigate] = useBrowserLocation();
  const replaceOnlyNavigate = (to: string, options: { state?: unknown } = {}) => {
    navigate(to, { ...options, replace: true });
  };
  return [location, replaceOnlyNavigate];
}
