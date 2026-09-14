import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const WIN_COLORS = ["#34d399", "#FFD452", "#60a5fa", "#f472b6", "#a78bfa"];
// Gold-weighted, same family as ChestRewardReveal's "gold" tier (TIER_THEME.gold.confettiColors)
// — blackjack borrows that same "this is the good one" color language rather than inventing a
// new one.
const BLACKJACK_COLORS = ["#FFD452", "#facc15", "#f59e0b", "#fff7cc", "#34d399"];

// A piece's own latest possible start (RAIN_MAX_DELAY) plus its longest possible fall
// (RAIN_MAX_DURATION) — this is what bounds the whole celebration, see CELEBRATION_MS below.
const RAIN_MAX_DELAY_S = 0.5;
const RAIN_MIN_DURATION_S = 1.1;
const RAIN_MAX_DURATION_S = 1.7;
const CELEBRATION_MS = (RAIN_MAX_DELAY_S + RAIN_MAX_DURATION_S) * 1000;
const FLASH_S = 0.42;

interface Piece {
  id: number;
  left: number;
  drift: number;
  rotate: number;
  duration: number;
  delay: number;
  color: string;
  width: number;
  height: number;
}

function makePieces(count: number, colors: string[]): Piece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 160,
    rotate: Math.random() * 720 - 360,
    duration: RAIN_MIN_DURATION_S + Math.random() * (RAIN_MAX_DURATION_S - RAIN_MIN_DURATION_S),
    delay: Math.random() * RAIN_MAX_DELAY_S,
    color: colors[i % colors.length],
    width: 6 + Math.random() * 8,
    height: 10 + Math.random() * 10,
  }));
}

interface WinCelebrationProps {
  // True for the whole span the result is showing (classic.tsx's isWinResult && showResult) —
  // this component only reacts to the false->true edge (a fresh win landing, see wasActiveRef
  // below) and then runs its own bounded ~2.1s sequence regardless of how much longer `active`
  // itself stays true (the result sheet sits up well past that, see AUTO_DISMISS_MS).
  active: boolean;
  isBlackjack: boolean;
  // Full-screen piece count, from winIntensity.ts's rainCount, scaled to actually read as
  // filling the screen rather than just denser at one spot.
  count: number;
}

// The "Victory Royale" layer: a full-screen confetti rain plus one flash pulse — the ONLY
// confetti a win triggers now. RoundResultBanner used to also fire its own local burst
// (ConfettiBurst) right at the win text at the same time; the two together read as one
// cluttered collision instead of one clean sweep (Stanislas, 2026-09-14, after watching the
// recorded result: "t'as couplé les confettis du haut avec ceux du milieu... enlève ceux du
// milieu" — so the local one was removed entirely, this is what's left). Every win gets this
// full-screen layer, not just big ones (Stanislas, 2026-09-14: "à fond" every time, not scaled
// down for small wins) — count/colors still scale with winIntensity so a bigger win still reads
// as bigger, but the full-screen treatment itself is never skipped.
//
// No rotating light rays here on purpose — see ChestRewardReveal's own history (removed
// 2026-09-13: "the confetti burst carries the celebratory moment on its own... extra noise"). A
// single flash pulse is a one-shot impact, not a spinning decoration, which is the distinction
// that held up.
export default function WinCelebration({ active, isBlackjack, count }: WinCelebrationProps) {
  const [burst, setBurst] = useState<{ id: number; pieces: Piece[] } | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      wasActiveRef.current = true;
      const id = Date.now();
      setBurst({ id, pieces: makePieces(count, isBlackjack ? BLACKJACK_COLORS : WIN_COLORS) });
      const timer = setTimeout(() => {
        setBurst((current) => (current?.id === id ? null : current));
      }, CELEBRATION_MS);
      return () => clearTimeout(timer);
    }
    if (!active) wasActiveRef.current = false;
  }, [active, isBlackjack, count]);

  if (!burst) return null;

  return (
    <div className="absolute inset-0 z-[45] overflow-hidden pointer-events-none">
      <motion.div
        key={`flash-${burst.id}`}
        className="absolute inset-0"
        style={{
          background: isBlackjack
            ? "radial-gradient(circle at 50% 38%, rgba(255,196,84,0.65), transparent 62%)"
            : "radial-gradient(circle at 50% 38%, rgba(255,255,255,0.55), transparent 62%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: FLASH_S, times: [0, 0.25, 1], ease: "easeOut" }}
      />
      {burst.pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute top-0 rounded-sm"
          style={{ left: `${p.left}%`, backgroundColor: p.color, width: p.width, height: p.height }}
          // Opacity only ever fades IN, at the very start — the piece then stays fully opaque
          // for its whole fall and leaves the screen by going past the bottom edge (clipped by
          // this layer's own overflow-hidden, y: "110vh" is well past any real viewport height),
          // never by fading out. It used to fade out over its last 25% too, which read as
          // confetti dissolving mid-air instead of actually falling all the way down and off
          // (Stanislas, 2026-09-14, after watching the recorded result: "je veux juste qu'ils
          // descendent jusqu'en bas... sans jamais devenir transparent").
          initial={{ y: "-8vh", x: 0, opacity: 0, rotate: 0 }}
          animate={{
            y: "110vh",
            x: p.drift,
            opacity: [0, 1, 1],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "linear",
            opacity: { duration: p.duration, times: [0, 0.08, 1] },
          }}
        />
      ))}
    </div>
  );
}
