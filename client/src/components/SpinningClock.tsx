import { motion, useAnimationFrame, useMotionValue, useTransform } from "framer-motion";

// Clock face with a single hand that continuously sweeps around the center (decorative
// loop, not a literal timepiece) — used next to countdown text in place of a static
// lucide Clock icon.
//
// CSS transform/transform-origin on the SVG line kept pivoting off-center (fill-box vs
// view-box reference-box mismatches, and transform-origin lengths being real CSS pixels
// rather than viewBox user units at this icon's tiny rendered size) — two different CSS
// fixes both still drifted. Sidestepping CSS transforms entirely: drive the hand's x2/y2
// endpoint straight from an animated angle each frame, so the pivot is exactly (12,12) by
// construction, in the same coordinate space as the circle itself.
export function SpinningClock({ className }: { className?: string }) {
  const angle = useMotionValue(0);
  useAnimationFrame((t) => {
    angle.set(((t / 1600) % 1) * 360);
  });
  const x2 = useTransform(angle, (a) => 12 + 5 * Math.sin((a * Math.PI) / 180));
  const y2 = useTransform(angle, (a) => 12 - 5 * Math.cos((a * Math.PI) / 180));

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <motion.line
        x1="12" y1="12" x2={x2} y2={y2}
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      />
    </svg>
  );
}
