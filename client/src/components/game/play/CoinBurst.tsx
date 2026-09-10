import { useMemo } from "react";
import { motion } from "framer-motion";
import Coin from "@/icons/Coin";
import { COIN_FLIGHT_DURATION, COIN_STAGGER, COIN_ARRIVAL_FRACTION } from "@/lib/coinFlightTiming";

// Percentage coordinates within the table's own root (same coordinate space RoundResultBanner
// already resolves its own absolute positioning against — see this component's own root, a
// sibling of it in table-test.tsx). TARGET matches the header balance NUMBER's own visual
// center (not a few % above it — that read as "flies up, then falls back down" instead of
// landing, see the brief this came from). The two SOURCEs match where a win's coins (the
// label/amount line) and a streak bonus's own coins (the horizontal streak bar, now inline in
// that same result column just below the label/amount) actually sit on screen — streak sits a
// little lower than center since it's the row underneath.
const TARGET = { x: 50, y: 11.5 };

// The arc's apex never goes above this — keeps every coin's flight on-screen, clear of the
// status bar, instead of briefly vanishing off the top edge mid-curve.
const MIN_ARC_Y = 3;
const SOURCES = {
  center: { x: 50, y: 38 },
  streak: { x: 50, y: 44 },
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
      // Above both the source and target — this is what gives the flight its arc instead of a
      // flat straight line between the two points. Clamped to MIN_ARC_Y so a table with a low
      // maxBet (source and target close together) can't push the apex off the top of the screen.
      const midY = Math.max(MIN_ARC_Y, Math.min(source.y, TARGET.y) - (5 + Math.random() * 4));
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
            // 4 keyframes each, matching the shared `times` array below one-for-one — left/top
            // repeat the TARGET as their last value instead of leaving it implicit, so there's
            // no ambiguity about where the coin sits while it fades out after landing.
            left: [`${p.startX}%`, `${p.midX}%`, `${TARGET.x}%`, `${TARGET.x}%`],
            top: [`${p.startY}%`, `${p.midY}%`, `${TARGET.y}%`, `${TARGET.y}%`],
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
