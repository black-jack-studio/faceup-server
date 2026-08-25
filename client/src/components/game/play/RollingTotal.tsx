import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

// One reel per digit — only the digits that actually changed roll (old one slides up and out,
// new one slides in from below), instead of the whole number swapping at once. Keyed by
// position, not by the digit's own identity, so "10" -> "13" only rolls the last digit (the
// "1" at index 0 never unmounts since its key doesn't change) — same technique as Play with
// Friends' own score bubble (friends-table-view.tsx).
function RollingDigit({ digit }: { digit: string }) {
  return (
    <span className="relative inline-block overflow-hidden leading-none" style={{ height: "1em" }}>
      <span className="invisible">{digit}</span>
      {/* No `initial={false}` here (unlike most AnimatePresence usage): each RollingDigit is a
          fresh component instance the moment a total gains a digit (8 -> 15 mounts a whole new
          tens-place RollingDigit), and `initial={false}` on a brand-new AnimatePresence skips
          the enter animation for whatever's already inside it at that first render — which
          would make that new digit pop in instantly at full opacity while the digit(s) next to
          it are still mid-roll, misreading as the wrong number for a frame (an "8" that hasn't
          rolled to "1" yet, sitting beside an already-solid "5", reads as "85" not "15"). Every
          digit sliding in the same way, new place value or not, keeps the whole number legible
          through the transition. */}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={digit}
          initial={{ y: "100%" }}
          animate={{ y: "0%" }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-center leading-none"
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default function RollingTotal({ value, className }: { value: number; className?: string }) {
  return (
    // inline-flex, not the default inline: a plain inline span centers its content on the text
    // baseline, which sits above the vertical center of the line box — inside a flex `items-
    // center` pill that reads as the number floating in the top half instead of dead center.
    <span className={cn(className, "inline-flex items-center leading-none")}>
      {value.toString().split("").map((digit, i) => (
        <RollingDigit key={i} digit={digit} />
      ))}
    </span>
  );
}
