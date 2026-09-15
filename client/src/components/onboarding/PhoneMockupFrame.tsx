import { motion, AnimatePresence } from "framer-motion";
import mockupFrame from "@assets/mockup_bezel_only.png";

// Same iPhone mockup asset + screen-cutout geometry as the pre-auth welcome carousel
// (client/src/pages/auth/welcome.tsx) — reused as-is, shown whole (see OnboardingWalkthrough's
// own sheet height, sized to fit the full device at this width).
const MOCK_WIDTH = 172;
const FRAME = { w: 1280, h: 2642, screenX: 55, screenY: 55, screenW: 1170, screenH: 2532, screenRadius: 165 };
const MOCK_SCALE = MOCK_WIDTH / FRAME.w;
const MOCK_HEIGHT = FRAME.h * MOCK_SCALE;

interface PhoneMockupFrameProps {
  // null until a real capture is wired in for this step — renders a plain placeholder instead
  // of crashing on a missing asset (see OnboardingWalkthrough's STEP_IMAGES).
  image: string | null;
  alt: string;
}

export default function PhoneMockupFrame({ image, alt }: PhoneMockupFrameProps) {
  return (
    <div className="relative mx-auto" style={{ width: MOCK_WIDTH, height: MOCK_HEIGHT }}>
      <div
        className="absolute overflow-hidden bg-white/5"
        style={{
          left: FRAME.screenX * MOCK_SCALE,
          top: FRAME.screenY * MOCK_SCALE,
          width: FRAME.screenW * MOCK_SCALE,
          height: FRAME.screenH * MOCK_SCALE,
          borderRadius: FRAME.screenRadius * MOCK_SCALE,
        }}
      >
        <AnimatePresence mode="wait">
          {image ? (
            <motion.img
              key={image}
              src={image}
              alt={alt}
              className="absolute inset-0 w-full h-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            />
          ) : (
            <motion.div
              key="placeholder"
              className="absolute inset-0 flex items-center justify-center text-white/30 text-[10px] text-center px-2 leading-snug"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {alt}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <img
        src={mockupFrame}
        alt=""
        className="absolute inset-0 pointer-events-none select-none"
        style={{ width: MOCK_WIDTH, height: MOCK_HEIGHT }}
      />
    </div>
  );
}
