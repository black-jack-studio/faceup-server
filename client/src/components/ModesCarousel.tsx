import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/game-store";
import ModeCard from "./ModeCard";
import spadeImage from '@assets/spade_suit_3d_1757354865461.png';
import calendarImage from '@assets/calendar_3d_1787179981404.png';
import bicepsImage from '@assets/flexed_biceps_3d_default.png';

// title/subtitle are i18next keys (looked up against the "modesCarousel" namespace when
// rendered below), not literal display text — this array lives outside the component so it
// can't call useTranslation() itself.
const modeData = [
  {
    mode: "classic" as const,
    titleKey: "classic.title",
    subtitleKey: "classic.subtitle",
    icon: spadeImage,
    gradient: "bg-gradient-to-br from-green-200 via-blue-100 to-gray-100",
  },
  {
    mode: "friends" as const,
    titleKey: "friends.title",
    subtitleKey: "friends.subtitle",
    icon: bicepsImage,
    gradient: "bg-gradient-to-br from-purple-200 via-amber-100 to-orange-100",
  },
  {
    mode: "coming-soon" as const,
    titleKey: "comingSoon.title",
    subtitleKey: "comingSoon.subtitle",
    icon: calendarImage,
    gradient: "bg-gradient-to-br from-blue-200 via-indigo-100 to-purple-100",
  },
];

interface ModesCarouselProps {
  // Friends is special-cased: Home shows it as its own in-place overlay (see home.tsx) instead
  // of routing away, so its slide up/down has Home still visible underneath instead of a route
  // swap leaving a black gap while neither page is fully in place. Every other mode keeps
  // navigating normally — this only overrides what happens for "friends" specifically.
  onSelectFriends?: () => void;
  // Same special-casing as onSelectFriends, for Classic 21's own Home-hosted overlay.
  onSelectClassic?: () => void;
  // Skips this carousel's own entrance animation — see home.tsx's useEnteredOnce, which this
  // mirrors since this carousel remounts in lockstep with Home.
  skipEntrance?: boolean;
}

export default function ModesCarousel({ onSelectFriends, onSelectClassic, skipEntrance }: ModesCarouselProps) {
  const { t } = useTranslation("modesCarousel");
  const [, navigate] = useLocation();

  const handleModeSelect = (mode: Exclude<typeof modeData[0]["mode"], "coming-soon">) => {
    // Set mode and navigate
    useGameStore.getState().setMode(mode);
    if (mode === "friends" && onSelectFriends) {
      onSelectFriends();
      return;
    }
    if (mode === "classic" && onSelectClassic) {
      onSelectClassic();
      return;
    }
    // Local-only test: "classic" (the entry-level "Garage" room) skips the separate betting
    // screen entirely and goes straight to the single-page table prototype. Every other mode
    // is untouched — this is not meant to ship as-is, just to walk the rest of the app with
    // the new flow in place before deciding whether to replace /play/classic for real.
    navigate(mode === "classic" ? "/play/table-test" : `/play/${mode}`);
  };

  return (
    <motion.section
      className="mb-8"
      initial={skipEntrance ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 pt-2 px-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        data-testid="modes-carousel"
      >
        {modeData.map((mode) => (
          // No animation of its own — ModeCard already fades itself in (see its own
          // initial/animate). This wrapper used to also slide in from the right (x: 50)
          // *underneath* ModeCard's own fade-up, and the two combined read as the whole
          // card sliding in diagonally before snapping into place instead of just appearing.
          <div key={mode.mode}>
            <ModeCard
              mode={mode.mode}
              title={t(mode.titleKey)}
              subtitle={t(mode.subtitleKey)}
              icon={mode.icon}
              gradient={mode.gradient}
              onClick={() => {
                if (mode.mode === "coming-soon") return;
                handleModeSelect(mode.mode);
              }}
              canPlay={mode.mode !== "coming-soon"}
              skipEntrance={skipEntrance}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}