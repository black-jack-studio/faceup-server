import { useEffect, useRef } from "react";

// Module-level, not component state: survives this component unmounting and remounting (e.g.
// leaving to a full-screen page like Classic 21 or Cash Games and coming back) for as long as
// the app itself stays loaded, only resetting on an actual page reload. Lets a page's entrance
// animation (fade/slide-in) play once per real "first arrival" instead of replaying it every
// single time the page happens to remount from a route change.
const played = new Set<string>();

// Returns whether `key`'s entrance has already played before *this* mount — fixed for this
// component instance's whole lifetime, so later renders (or the bookkeeping effect below)
// can't change what an already-mounted page decided to animate from.
export function useEnteredOnce(key: string): boolean {
  const alreadyPlayed = useRef(played.has(key)).current;

  useEffect(() => {
    played.add(key);
  }, [key]);

  return alreadyPlayed;
}
