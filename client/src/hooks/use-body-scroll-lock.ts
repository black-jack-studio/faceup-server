import { useEffect } from "react";

// Reference-counted body scroll lock. Every full-screen sheet and modal in the app (Home's
// Create Game/Classic 21/Battle Pass/etc., Profile's Avatars/Emotes/Friends/etc., BottomSheet,
// AnimatedModal, RankModal, Change Username/Password) used to lock the body independently —
// each one just set document.body.style.overflow = "hidden" on mount and reset it straight
// back to "" on unmount. That's fine in isolation, but the moment one of these opens *nested*
// inside another (e.g. the "Enter Referral Code" BottomSheet opened from within the Friends
// screen, itself a Profile overlay), the inner one's cleanup unconditionally cleared the lock
// on unmount even though the outer sheet was still open -- silently unlocking scroll the
// instant the inner modal closed, even though the outer sheet you could still see was still
// open.
//
// A plain counter fixes that: the body only actually unlocks once the *last* active locker
// releases it. The first lock captures scroll position + pins the body with position:fixed
// (not just overflow:hidden -- iOS WKWebView still lets touches drag a merely overflow:hidden
// body underneath a tall sheet); the last unlock restores both, immediately. (An earlier
// version delayed that release to also stagger when the bottom nav bar reappeared, since it
// briefly watched this exact lock -- that's no longer how the nav bar decides anything; see
// store/overlay-visibility-store.ts, which tracks its own count driven by each sheet's real
// Framer Motion onExitComplete instead. Nothing here needs to wait on an animation anymore.)
let lockCount = 0;
let savedScrollY = 0;

function acquire(): () => void {
  if (lockCount === 0) {
    // Clamped to the real scrollable range -- iOS WKWebView's rubber-band bounce at the very
    // top/bottom of the page reports window.scrollY values past the document's actual bounds
    // (elastic overscroll, not a committed scroll position). Locking the body at an
    // unclamped value that far in briefly left a gap the size of the overshoot at the bottom
    // of the screen once the sheet's own background failed to reach that far -- reported as a
    // black block, and only reachable by opening a sheet while scrolled to the true bottom of
    // a page (the only place rubber-band overscroll can push scrollY past the real max).
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    savedScrollY = Math.min(Math.max(0, window.scrollY), maxScrollY);
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return; // guards against a double-invoked cleanup (e.g. React StrictMode)
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, savedScrollY);
    }
  };
}

/** Locks body scroll while `active` is true. Safe to call from any number of components at
 * once, nested or not -- the body only unlocks once every active caller has released it. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return acquire();
  }, [active]);
}
