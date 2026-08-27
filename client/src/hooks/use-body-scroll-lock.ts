import { useEffect } from "react";

// Reference-counted body scroll lock. Every full-screen sheet and modal in the app (Home's
// Create Game/Classic 21/Battle Pass/etc., Profile's Avatars/Emotes/Friends/etc., BottomSheet,
// AnimatedModal, RankModal, Change Username/Password) used to lock the body independently —
// each one just set document.body.style.overflow = "hidden" on mount and reset it straight
// back to "" on unmount. That's fine in isolation, but the moment one of these opens *nested*
// inside another (e.g. the "Enter Referral Code" BottomSheet opened from within the Friends
// screen, itself a Profile overlay), the inner one's cleanup unconditionally cleared the lock
// on unmount even though the outer sheet was still open -- silently unlocking scroll (and, once
// ConditionalBottomNav in App.tsx started watching this exact flag to decide whether to show
// the nav bar, causing it to flicker back in) the instant the inner modal closed.
//
// A plain counter fixes this: the body only actually unlocks when the *last* active locker
// releases it. The first lock captures scroll position + pins the body with position:fixed
// (not just overflow:hidden -- iOS WKWebView still lets touches drag a merely overflow:hidden
// body underneath a tall sheet); the last unlock restores both.
let lockCount = 0;
let savedScrollY = 0;

function acquire(): () => void {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
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
