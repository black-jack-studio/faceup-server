import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PhoneMockupFrame from "./PhoneMockupFrame";
import SkipLink from "./SkipLink";
import { trackOnboardingStarted, trackOnboardingStepViewed } from "@/lib/analytics";

const TOTAL_STEPS = 5;

// Real captures land here once available — drop the files under attached_assets/first-run/
// and import them the same way welcome.tsx imports its own screenshots, e.g.:
//   import stepModesImg from "@assets/first-run/step-modes.png";
// Until then PhoneMockupFrame renders a plain placeholder instead of crashing on a missing
// asset. Index i maps directly to step i (steps 1-4, 0-indexed as 0-3) — step 5 (index 4) is
// the closing step and never shows a phone mockup.
const STEP_IMAGES: (string | null)[] = [null, null, null, null];

interface OnboardingWalkthroughProps {
  onCommencer: () => void;
  onSkip: () => void;
}

export default function OnboardingWalkthrough({ onCommencer, onSkip }: OnboardingWalkthroughProps) {
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState(0); // 0-4 — step 4 is the closing "ready to play" step

  useEffect(() => {
    trackOnboardingStarted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackOnboardingStepViewed(step + 1);
  }, [step]);

  const isFinalStep = step === TOTAL_STEPS - 1;
  const stepKey = `walkthrough.step${step + 1}`;

  return (
    // No bottom padding of its own — the sheet wrapper in home.tsx already reserves
    // env(safe-area-inset-bottom) below this, and stacking a second copy here was exactly the
    // "huge gap under Continue" bug: safe-area applied twice plus this div's own +20px on top.
    <div className="h-full flex flex-col px-6 pt-4">
      <div className="flex justify-end">
        <SkipLink onSkip={onSkip} />
      </div>

      {/* Steps 1-4 share this exact layout (frame + caption) so nothing shifts between them —
          only the image and text change. The final step drops the phone mockup entirely. */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 min-h-0">
        {!isFinalStep && <PhoneMockupFrame image={STEP_IMAGES[step]} alt={t(`${stepKey}.caption`)} />}

        <div className="text-center px-4">
          {(step === 0 || isFinalStep) && (
            <h2 className="text-xl font-bold text-white mb-2">{t(`${stepKey}.title`)}</h2>
          )}
          <p className="text-white/70 text-sm">{t(isFinalStep ? `${stepKey}.body` : `${stepKey}.caption`)}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 mb-4">
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
