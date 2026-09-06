import AnimatedModal from "@/components/AnimatedModal";

interface TutorialRoundPopupProps {
  open: boolean;
  title: string;
  body: string;
  ctaLabel: string;
  onContinue: () => void;
}

// Deliberately not GameResultOverlay — that's wired to real coin animations and the
// server-backed "watch ad to 2x" flow. This is a plain explanatory popup: no confetti, no
// coins, no XP, since these are free scripted hands.
export default function TutorialRoundPopup({ open, title, body, ctaLabel, onContinue }: TutorialRoundPopupProps) {
  return (
    <AnimatedModal open={open} onClose={onContinue} className="w-full max-w-xs">
      <div className="bg-[#13151A] border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-white/70 text-sm mb-6">{body}</p>
        <button
          onClick={onContinue}
          className="w-full h-12 rounded-2xl bg-[#B5F3C7] hover:bg-[#B5F3C7]/80 text-[#0B0B0F] font-bold"
          data-testid="button-tutorial-round-continue"
        >
          {ctaLabel}
        </button>
      </div>
    </AnimatedModal>
  );
}
