import { useEffect, useState } from "react";
import { animate, motion, useAnimation } from "framer-motion";
import { formatFullNumber } from "@/lib/formatUtils";
import { getCoinImpactTimes } from "@/lib/coinFlightTiming";

// Counts from `from` to `to` once `active` becomes true, resetting to `from` otherwise so
// the next result animates from a clean slate instead of continuing off the last value.
// A win prefixes "+" explicitly (toLocaleString only ever adds "-" on its own for a loss),
// so a win and a loss read symmetrically: "+200" next to "-1,900", not "200" next to "-1,900".
export default function CountingBalance({
  from,
  to,
  active,
  duration = 1,
  delay = 0.3,
  showSign = true,
  impactCount,
}: {
  from: number;
  to: number;
  active: boolean;
  duration?: number;
  delay?: number;
  // A net delta ("+200"/"-1,900") wants its "+" spelled out explicitly (toLocaleString only
  // ever adds "-" on its own). An absolute balance doesn't — pass false there so a perfectly
  // ordinary positive balance doesn't read as a gain.
  showSign?: boolean;
  // When set (and > 0), replaces the smooth easeOut count with discrete jumps timed to each
  // CoinBurst particle's own arrival (see coinFlightTiming) plus a quick shake on landing — "the
  // coins physically knock the number up" rather than a number that just happens to be counting
  // at the same time as an unrelated coin animation. duration/delay are ignored in this mode.
  impactCount?: number;
}) {
  const [display, setDisplay] = useState(from);
  const shake = useAnimation();

  useEffect(() => {
    if (!active) {
      setDisplay(from);
      return;
    }

    if (impactCount && impactCount > 0) {
      setDisplay(from);
      const step = (to - from) / impactCount;
      const timers = getCoinImpactTimes(impactCount).map((t, i) =>
        setTimeout(() => {
          const isLast = i === impactCount - 1;
          setDisplay(isLast ? to : Math.round(from + step * (i + 1)));
          shake.start({
            scale: [1, 1.16, 1],
            x: [0, -2, 2, -1.5, 1, 0],
            transition: { duration: 0.22, ease: "easeOut" },
          });
        }, t * 1000),
      );
      return () => timers.forEach(clearTimeout);
    }

    const controls = animate(from, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from, to, impactCount]);

  return (
    <motion.span animate={shake} style={{ display: "inline-block" }}>
      {showSign && display > 0 ? "+" : ""}
      {formatFullNumber(display)}
    </motion.span>
  );
}
