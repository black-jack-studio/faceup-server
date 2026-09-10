import { useLayoutEffect, useState, type RefObject } from "react";
import { motion } from "framer-motion";
import Coin from "@/icons/Coin";
import { COIN_FLIGHT_DURATION, COIN_STAGGER, COIN_ARRIVAL_FRACTION } from "@/lib/coinFlightTiming";

// How far above the min(source, target) point the arc's apex reaches, and how close to the top
// of the viewport it's allowed to get — both in real px, not guessed percentages (see below).
const ARC_HEIGHT_MIN = 40;
const ARC_HEIGHT_MAX = 70;
const MIN_ARC_Y_PX = 50; // clears the status bar / dynamic island on every device this runs on

interface Point {
  x: number;
  y: number;
}

// Reads an element's own real on-screen center via getBoundingClientRect — no guessed
// percentage of some ancestor's box, which drifts the moment anything upstream in the layout
// changes (padding, a sibling's height, ...). null until the ref has something mounted.
function centerOf(ref: RefObject<HTMLElement | null>): Point | null {
  const el = ref.current;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

interface CoinBurstProps {
  active: boolean;
  // The actual DOM node coins fly FROM — the result banner (a plain win) or the streak bar
  // (the bonus on top of it), measured live via getBoundingClientRect rather than assumed.
  sourceRef: RefObject<HTMLElement | null>;
  // The actual DOM node coins fly TO — the header balance number itself. Same reasoning: this
  // used to be a hardcoded % position and broke the instant the header layout shifted (coins
  // landing on the dealer's cards instead of the balance — see the brief this came from).
  targetRef: RefObject<HTMLElement | null>;
  // The positioned ancestor this burst's own particles are absolute-positioned against — must be
  // a `position: relative` (or similar) element that's an ancestor of where <CoinBurst> itself
  // is rendered. NOT the viewport (position: fixed would misread if anything between this and
  // the viewport is mid-transform, e.g. this whole screen sliding in/out over Home) — anchoring
  // here and converting the two refs' viewport rects into this element's own local px sidesteps
  // that entirely.
  containerRef: RefObject<HTMLElement | null>;
  count?: number;
}

// A burst of coin icons flying from sourceRef's element up to targetRef's element — fired once
// per win (never on a loss/push, see table-test.tsx's own callers). Positions itself in real px
// measured from the two refs (converted into containerRef's own local coordinate space), not
// into some guessed % of an ancestor's box, so it stays correct regardless of what that
// ancestor's own layout is doing.
export default function CoinBurst({ active, sourceRef, targetRef, containerRef, count = 5 }: CoinBurstProps) {
  const [points, setPoints] = useState<{ source: Point; target: Point } | null>(null);

  // Measured right when the burst actually starts, not on every render — a stable flight path
  // for the whole ~1.3s life of one burst, and safe to call even before the refs' elements have
  // painted their final layout (see the null guard in centerOf).
  useLayoutEffect(() => {
    if (!active) {
      setPoints(null);
      return;
    }
    const container = containerRef.current?.getBoundingClientRect();
    const source = centerOf(sourceRef);
    const target = centerOf(targetRef);
    if (!container || !source || !target) {
      setPoints(null);
      return;
    }
    setPoints({
      source: { x: source.x - container.left, y: source.y - container.top },
      target: { x: target.x - container.left, y: target.y - container.top },
    });
  }, [active, sourceRef, targetRef, containerRef]);

  const particles =
    active && points
      ? Array.from({ length: count }, (_, i) => {
          const { source, target } = points;
          const startX = source.x + (Math.random() - 0.5) * 16;
          const startY = source.y + (Math.random() - 0.5) * 10;
          const midX = (source.x + target.x) / 2 + (Math.random() - 0.5) * 30;
          // Above both the source and target — this is what gives the flight its arc instead of
          // a flat straight line between the two points. Clamped to MIN_ARC_Y_PX so a source and
          // target that are already close together can't push the apex off the top of the screen.
          const arcHeight = ARC_HEIGHT_MIN + Math.random() * (ARC_HEIGHT_MAX - ARC_HEIGHT_MIN);
          const midY = Math.max(MIN_ARC_Y_PX, Math.min(source.y, target.y) - arcHeight);
          // No random jitter on the delay itself — CountingBalance's impact mode computes the
          // exact same per-index arrival time from coinFlightTiming and has to land its "bump"
          // the instant this coin visually does.
          return { id: i, startX, startY, midX, midY, targetX: target.x, targetY: target.y, delay: i * COIN_STAGGER };
        })
      : [];

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-visible">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          initial={{ left: p.startX, top: p.startY, opacity: 0, scale: 0.5 }}
          animate={{
            // 4 keyframes each, matching the shared `times` array below one-for-one — left/top
            // repeat the target as their last value instead of leaving it implicit, so there's
            // no ambiguity about where the coin sits while it fades out after landing.
            left: [p.startX, p.midX, p.targetX, p.targetX],
            top: [p.startY, p.midY, p.targetY, p.targetY],
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
