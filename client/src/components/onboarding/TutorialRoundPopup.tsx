import { AnimatePresence, motion } from "framer-motion";

interface TutorialRoundPopupProps {
  open: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  onContinue: () => void;
}

// Slides up from the bottom like every other popup in the app (BottomSheet, DailyStreakPopup,
// WeeklyRewardPopup) rather than AnimatedModal's centered card — same #232328/rounded-t-[28px]
// sheet and white pill CTA. Not the shared BottomSheet component itself: this has no drag (the
// round is only ever advanced by tapping Continue, same "no sanctioned way out but the one
// button" restriction as OnboardingWalkthrough's own sheet) and it's already nested inside
// OnboardingTutorial's own full-screen overlay, which owns the scroll lock/nav-bar handling.
export default function TutorialRoundPopup({ open, title, body, ctaLabel, onContinue }: TutorialRoundPopupProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-20 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onContinue}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-30 rounded-t-[28px] px-6 pt-6 flex flex-col items-center text-center"
            style={{ backgroundColor: "#232328", paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.25, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <p className="mt-2 text-white/60 text-sm mb-6">{body}</p>
            <button
              onClick={onContinue}
              // Same white-pill CTA recipe as DailyStreakPopup/WeeklyRewardPopup's own sheet
              // buttons — the app's one standard "primary action in a bottom sheet" look.
              className="w-full py-3.5 rounded-[24px] font-bold"
              style={{
                background: "#FFFFFF",
                color: "#15161A",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
              data-testid="button-tutorial-round-continue"
            >
              {ctaLabel}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
