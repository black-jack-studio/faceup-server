import { useMemo } from "react";
import { motion } from "framer-motion";
import Coin from "@/icons/Coin";

// Percentage coordinates within the table's own root (same coordinate space WinStreakBar and
// RoundResultBanner already resolve their own absolute positioning against — see their shared
// comment on why `absolute` + `%`, not `fixed`, is what actually stays put on this screen).
// TARGET matches the header balance's own spot; the two SOURCEs match where a win's coins (the
// result banner) and a streak bonus's own coins (the flame/bar) actually sit on screen.
const TARGET = { x: 50, y: 8 };
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

// A short, small burst of coin icons flying from `from` up to the header balance — fired once
// per win (never on a loss/push, see table-test.tsx's own callers), timed to land right as the
// header's own CountingBalance is counting up, not before or after it.
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
      return { id: i, startX, startY, midX, midY, delay: i * 0.035 + Math.random() * 0.03 };
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
          transition={{ duration: 0.48, delay: p.delay, ease: "easeIn", times: [0, 0.12, 0.8, 1] }}
        >
          <Coin size={14} />
        </motion.div>
      ))}
    </div>
  );
}
