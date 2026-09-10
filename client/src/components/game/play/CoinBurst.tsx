import { useMemo } from "react";
import { motion } from "framer-motion";
import Coin from "@/icons/Coin";
import { COIN_FLIGHT_DURATION, COIN_STAGGER, COIN_ARRIVAL_FRACTION } from "@/lib/coinFlightTiming";

// Percentage coordinates within the table's own root (same coordinate space WinStreakBar and
// RoundResultBanner already resolve their own absolute positioning against — see their shared
// comment on why `absolute` + `%`, not `fixed`, is what actually stays put on this screen).
// TARGET matches the header balance NUMBER's own spot (not above it — a coin that stops short
// and fades out a few percent above the digits reads as "flies up, then falls back down"
// instead of landing, see the brief this came from). The two SOURCEs match where a win's coins
// (the result banner) and a streak bonus's own coins (the flame/bar) actually sit on screen.
const TARGET = { x: 50, y: 10.5 };
const SOURCES = {
  center: { x: 50, y: 38 },
  streak: { x: 6, y: 33 },
} as const;

interface CoinBurstProps {
  active: boolean;
  // "center" — a plain win's own coins, flying up from the result banner. "streak" — the extra
  // coins the win streak bonus earned on top, flying up from the streak bar itself instead, so
  // the two sources of the same gain read as visually distinct without needing a second color.
  from: keyof typeof SOURCES;
  count?: number;
}

// A burst of coin icons flying from `from` up to the header balance — fired once per win (never
// on a loss/push, see table-test.tsx's own callers). Slowed to 1.1s per coin (staggered further
// apart too) so the flight actually reads instead of blinking past — the header's own
// CountingBalance now runs 0.6-1.8s depending on win size (see getWinIntensity), so this stays
// roughly in that same window rather than finishing well before or after it.
export default function CoinBurst({ active, from, count = 5 }: CoinBurstProps) {
  const particles = useMemo(() => {
    if (!active) return [];
    const source = SOURCES[from];
    return Array.from({ length: count }, (_, i) => {
      const startX = source.x + (Math.random() - 0.5) * 6;
      const startY = source.y + (Math.random() - 0.5) * 4;
      const midX = (source.x + TARGET.x) / 2 + (Math.random() - 0.5) * 12;
      // Always above both the source and target — this is what gives the flight its arc
      // instead of a flat straight line between the two points.
      const midY = Math.min(source.y, TARGET.y) - (8 + Math.random() * 6);
      // No random jitter on the delay itself (only on position, above) — CountingBalance's
      // impact mode computes the exact same per-index arrival time from coinFlightTiming and
      // has to land its "bump" the instant this coin visually does.
      return { id: i, startX, startY, midX, midY, delay: i * COIN_STAGGER };
    });
  }, [active, from, count]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          initial={{ left: `${p.startX}%`, top: `${p.startY}%`, opacity: 0, scale: 0.5 }}
          animate={{
            left: [`${p.startX}%`, `${p.midX}%`, `${TARGET.x}%`],
            top: [`${p.startY}%`, `${p.midY}%`, `${TARGET.y}%`],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 0.9, 0.6],
          }}
          transition={{
            duration: COIN_FLIGHT_DURATION,
            delay: p.delay,
            ease: "easeInOut",
            times: [0, 0.18, COIN_ARRIVAL_FRACTION, 1],
          }}
        >
          <Coin size={20} />
        </motion.div>
      ))}
    </div>
  );
}
