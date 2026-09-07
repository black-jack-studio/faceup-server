import { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { formatFullNumber } from "@/lib/formatUtils";

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
}) {
  const [display, setDisplay] = useState(from);

  useEffect(() => {
    if (!active) {
      setDisplay(from);
      return;
    }
    const controls = animate(from, to, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(Math.round(value)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, from, to]);

  return (
    <span>
      {showSign && display > 0 ? "+" : ""}
      {formatFullNumber(display)}
    </span>
  );
}
