import { AnimatePresence, motion } from "framer-motion";

// One reel per digit — only the digits that actually changed roll (old one slides up and out,
// new one slides in from below), instead of the whole number swapping at once. Keyed by
// position, not by the digit's own identity, so "10" -> "13" only rolls the last digit (the
// "1" at index 0 never unmounts since its key doesn't change) — same technique as Play with
// Friends' own score bubble (friends-table-view.tsx).
function RollingDigit({ digit }: { digit: string }) {
  return (
    <span className="relative inline-block overflow-hidden leading-none" style={{ height: "1em" }}>
      <span className="invisible">{digit}</span>
      <AnimatePresence mode="popLayout" initial={false}>
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
    <span className={className}>
      {value.toString().split("").map((digit, i) => (
        <RollingDigit key={i} digit={digit} />
      ))}
    </span>
  );
}
