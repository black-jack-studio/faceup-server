import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PhoneMockupFrame from "./PhoneMockupFrame";
import SkipLink from "./SkipLink";
import { trackOnboardingStarted, trackOnboardingStepViewed } from "@/lib/analytics";

const TOTAL_STEPS = 4;

// Real captures land here once available — drop the files under attached_assets/first-run/
// and import them the same way welcome.tsx imports its own screenshots, e.g.:
//   import stepModesImg from "@assets/first-run/step-modes.png";
// Until then PhoneMockupFrame renders a plain placeholder instead of crashing on a missing
// asset. Index i maps directly to step i — index 0 (the welcome step) never shows a phone
// mockup, so STEP_IMAGES[0] is always unused; only indices 1-3 are ever read.
const STEP_IMAGES: (string | null)[] = [null, null, null, null];

interface OnboardingWalkthroughProps {
  onCommencer: () => void;
  onSkip: () => void;
}

export default function OnboardingWalkthrough({ onCommencer, onSkip }: OnboardingWalkthroughProps) {
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState(0); // 0-3 — step 3 (index) is the last, "ready to play" one

  useEffect(() => {
    trackOnboardingStarted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackOnboardingStepViewed(step + 1);
  }, [step]);

  // Only the welcome step (1) has no single app screen to show — every other step, including
  // the last, shows its own screenshot. There's no separate closing "ready to play" screen
  // anymore either: the last step's own button carries that CTA and goes straight into the
  // tutorial hand (see isFinalStep below).
  const isWelcomeStep = step === 0;
  const isFinalStep = step === TOTAL_STEPS - 1;
  const stepKey = `walkthrough.step${step + 1}`;
  const title = t(`${stepKey}.title`);

  return (
    // No bottom padding of its own — the sheet wrapper in home.tsx already reserves
    // env(safe-area-inset-bottom) below this, and stacking a second copy here was exactly the
    // "huge gap under Continue" bug: safe-area applied twice plus this div's own +20px on top.
    <div className="h-full flex flex-col px-6 pt-4">
      <div className="flex justify-end">
        <SkipLink onSkip={onSkip} />
      </div>

      {/* Every step shows one short title at the same size — no smaller description line
          underneath, so this block's height is identical across steps and the phone's own
          on-screen position never shifts between them. Only the welcome step drops the phone
          and centers its title alone. */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 min-h-0">
        {!isWelcomeStep && <PhoneMockupFrame image={STEP_IMAGES[step]} alt={title} />}
        <h2 className="text-xl font-bold text-white text-center px-6">{title}</h2>
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-2 mb-4">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-5 bg-white" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      <button
        onClick={() => (isFinalStep ? onCommencer() : setStep((s) => s + 1))}
        // Same white-pill CTA recipe as DailyStreakPopup/WeeklyRewardPopup's own sheet
        // buttons — the app's one standard "primary action in a bottom sheet" look.
        className="w-full py-3.5 rounded-[24px] font-bold"
        style={{
          background: "#FFFFFF",
          color: "#15161A",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
        data-testid={isFinalStep ? "button-onboarding-start-game" : "button-onboarding-continue"}
      >
        {t(isFinalStep ? `${stepKey}.cta` : "common:continue")}
      </button>
    </div>
  );
}
