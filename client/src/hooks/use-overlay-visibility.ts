import { useEffect, useRef } from "react";
import { useOverlayVisibilityStore } from "@/store/overlay-visibility-store";

/**
 * Registers this sheet/modal as "covering the base tabs" (see overlay-visibility-store.ts, and
 * ConditionalBottomNav in App.tsx which watches it) for as long as `open` is true, AND keeps it
 * registered through the exit animation until the returned `onExitComplete` fires.
 *
 * Usage — wrap the existing conditional child exactly as before, just add the two pieces:
 *
 *   const onSheetExitComplete = useOverlayVisibility(open);
 *   <AnimatePresence onExitComplete={onSheetExitComplete}>
 *     {open && <motion.div exit={{ ... }}>...</motion.div>}
 *   </AnimatePresence>
 *
 * `onExitComplete` is a prop AnimatePresence itself provides for exactly this: it fires once
 * every exiting child of that AnimatePresence has finished animating out. Passing this hook's
 * handler there is what makes the unregister exact instead of a guess.
 */
export function useOverlayVisibility(open: boolean): () => void {
  const registeredRef = useRef(false);
  const register = useOverlayVisibilityStore((s) => s.register);
  const unregister = useOverlayVisibilityStore((s) => s.unregister);

  // Registers the instant `open` goes true -- deliberately not waiting on the entrance
  // animation, so the nav bar is already gone before the sheet even starts sliding/fading in.
  useEffect(() => {
    if (open && !registeredRef.current) {
      registeredRef.current = true;
      register();
    }
    // Unregistering on `open` going false is *not* done here on purpose -- that's what
    // onExitComplete below is for. Doing it here would recreate the exact "unmounts before the
    // exit animation finishes" bug this hook exists to fix.
  }, [open, register]);

  // Safety net: if this component unmounts outright while still registered (exit animation
  // interrupted by a hard navigation, hot reload, etc. -- onExitComplete never getting a chance
  // to fire), don't leave the shared counter stuck non-zero forever.
  useEffect(() => {
    return () => {
      if (registeredRef.current) {
        registeredRef.current = false;
        unregister();
      }
    };
  }, [unregister]);

  return () => {
    if (registeredRef.current) {
      registeredRef.current = false;
      unregister();
    }
  };
}
