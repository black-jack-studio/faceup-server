import { AnimatePresence, motion } from "framer-motion";

// Purely visual darkening of the whole table for the "tap anywhere to continue" result window —
// rendered as its own root-level sibling in table-test.tsx (same spot as CoinBurst) rather than
// nested inside the header/dealer column the way this first shipped. That column
// creates no stacking context of its own, so a z-index set on a child buried inside it doesn't
// reliably out-rank root-level siblings like the player's cards block (several of which flip
// through their own opacity<1 stacking contexts independently as hands settle) — which is
// exactly what left the player's cards undimmed the first time around. Living at the same level
// as everything it needs to sit above, with nothing in between, is what actually guarantees it.
//
// pointer-events-none: this layer never receives the tap itself. RoundResultBanner still owns
// the real (invisible) hit target, since it's also the one place that knows whether a
// double-reward ad claim is in flight and a stray tap should be swallowed instead of dismissing.
export default function ResultDimOverlay({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="result-dim"
          className="absolute inset-0 z-[26] bg-black pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35, transition: { delay: 1, duration: 0.6 } }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        />
      )}
    </AnimatePresence>
  );
}
