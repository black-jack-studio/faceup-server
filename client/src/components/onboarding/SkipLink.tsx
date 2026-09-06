import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  onSkip: () => void;
  className?: string;
}

// Shared "Passer" control for both onboarding phases (OnboardingWalkthrough and
// OnboardingTutorial) — stays reachable through the entire flow per the decision that
// onboarding is skippable, never mandatory.
export default function SkipLink({ onSkip, className }: SkipLinkProps) {
  const { t } = useTranslation("onboarding");
  return (
    <button
      type="button"
      onClick={onSkip}
      className={cn(
        "text-white/40 text-sm underline underline-offset-2 hover:text-white/60 transition-colors",
        className
      )}
      data-testid="button-onboarding-skip"
    >
      {t("skip")}
    </button>
  );
}
