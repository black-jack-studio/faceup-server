import { useMemo } from "react";
import { motion } from "framer-motion";

const COLORS = ["#34d399", "#FFD452", "#60a5fa", "#f472b6", "#a78bfa"];

interface Particle {
  angle: number;
  distance: number;
  color: string;
  delay: number;
  rotate: number;
  size: number;
  square: boolean;
}

// A short, cheap burst — no canvas/library, just a handful of framer-motion divs flung out
// from the center and fading as they fall. Denser than it used to be (Anatole, 2026-09-12:
// "vraiment que ça explose... qu'il y en ait plus"), but the distance was dialed back down at
// the same time — more pieces packed into a tighter radius reads as one punchy burst, where
// more pieces AND more spread just read as confetti scattered everywhere ("pas partout").
// Still brief — see the transition below — to match the "vite fait" result sequence around it,
// not a lingering full-screen celebration.
export default function ConfettiBurst({ active, count = 14 }: { active: boolean; count?: number }) {
  // Regenerated only when the burst actually (re)starts — a stable particle layout for the
  // whole ~900ms life of one burst, not reshuffled every render while it's playing.
  const particles = useMemo<Particle[]>(() => {
    if (!active) return [];
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.5 - 0.25);
      return {
        angle,
        distance: 40 + Math.random() * 70,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.06,
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
        square: i % 2 === 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible z-10">
      {particles.map((p, i) => {
        const x = Math.cos(p.angle) * p.distance;
        const y = Math.sin(p.angle) * p.distance - 10;
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.square ? 2 : "50%",
            }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{
              x,
              y: y + 34,
              // Full opacity for the first 60% of the flight instead of fading the instant it
              // launches — reads as a piece actually flying out before it fades, not a puff
              // that's already dissolving as it leaves (Anatole, 2026-09-12: "plus smooth").
              opacity: [1, 1, 0],
              rotate: p.rotate,
              scale: 1,
            }}
            transition={{ duration: 0.9, delay: p.delay, ease: "easeOut", opacity: { duration: 0.9, times: [0, 0.6, 1] } }}
          />
        );
      })}
    </div>
  );
}
