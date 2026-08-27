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
// A plain counter fixes that. The first lock captures scroll position + pins the body with
// position:fixed (not just overflow:hidden -- iOS WKWebView still lets touches drag a merely
// overflow:hidden body underneath a tall sheet); the last unlock restores both.
//
// The unlock itself is delayed (see RELEASE_GRACE_MS below), not immediate. Reason: `active`
// goes false the instant a sheet's *close* is triggered (its React state flips), but the sheet
// itself stays mounted and visible for its whole exit animation after that (AnimatePresence).
// An immediate unlock made ConditionalBottomNav (App.tsx), which watches this exact lock state
// to decide whether to render the nav bar, bring the bar back the instant you tapped close --
// while the sheet was still visibly sliding/fading out on top of it, reported as "the popup
// closes behind the bar" instead of the bar only appearing once the sheet is actually gone.
let lockCount = 0;
let savedScrollY = 0;
let pendingRelease: ReturnType<typeof setTimeout> | null = null;

// Comfortably longer than every exit animation in the app at time of writing (tween sheets:
// 250-280ms; BottomSheet's spring drag-close, the slowest, settles in roughly 300-400ms) so
// the delay always outlasts the actual animation instead of needing to match any one of them
// exactly -- a slightly-late nav bar reappearance is a fine tradeoff for never showing it too
// early again.
const RELEASE_GRACE_MS = 450;

function applyLock() {
  savedScrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${savedScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.overflow = "hidden";
}

function releaseLock() {
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.overflow = "";
  window.scrollTo(0, savedScrollY);
}

function acquire(): () => void {
  if (pendingRelease) {
    // A release was scheduled (the last locker had just let go) but a new one is starting
    // before that grace period elapsed -- e.g. one sheet closing while another opens right on
    // top of it. Cancel the scheduled release; the body should stay locked throughout.
    clearTimeout(pendingRelease);
    pendingRelease = null;
  } else if (lockCount === 0) {
    applyLock();
  }
  lockCount++;

  let released = false;
  return () => {
    if (released) return; // guards against a double-invoked cleanup (e.g. React StrictMode)
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      pendingRelease = setTimeout(() => {
        pendingRelease = null;
        // Double-checked, not just trusted from closure: another lock could have started and
        // already finished its own countdown differently in between.
        if (lockCount === 0) releaseLock();
      }, RELEASE_GRACE_MS);
    }
  };
}

/** Locks body scroll while `active` is true. Safe to call from any number of components at
 * once, nested or not -- the body only unlocks once every active caller has released it, and
 * only after a short grace period so a closing sheet's own exit animation has time to finish
 * first. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    return acquire();
  }, [active]);
}
