import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useGameStore, type GameMode } from "@/store/game-store";
import ModeCard from "./ModeCard";
import houseImage from '@assets/house_3d.png';
import bicepsImage from '@assets/flexed_biceps_3d_default.png';
import beerMugImage from '@assets/beer_mug_3d.png';
import discoBallImage from '@assets/disco_ball_3d.png';
import slotMachineImage from '@assets/slot_machine_3d_1788544779000.png';
import citySkylineImage from '@assets/city_skyline_3d.png';
import desertIslandImage from '@assets/desert_island_3d.png';

// title/subtitle are i18next keys (looked up against the "modesCarousel" namespace when
// rendered below), not literal display text — this array lives outside the component so it
// can't call useTranslation() itself.
//
// Bar/Club/Vegas/Penthouse/Monaco are the higher stakes tiers above House (Classic 21's own
// entry-level table, minBet 1 - maxBet 500, see classic.tsx's ROOM) agreed with Anatole
// 2026-09-15 — each one's own minBet is the previous tier's maxBet, climbing 500 -> 2,500 ->
// 10,000 -> 50,000 -> 250,000 -> 1,000,000. Visual-only for now (clickable: false, no ROOM
// preset or route behind them yet, same inert treatment the old single "Coming Soon" tile had)
// — replaces that generic tile now that there's a concrete lineup to preview instead.
const modeData = [
  {
    mode: "classic" as const,
    titleKey: "classic.title",
    subtitleKey: "classic.subtitle",
    icon: houseImage,
    gradient: "bg-gradient-to-br from-green-200 via-blue-100 to-gray-100",
    clickable: true,
  },
  {
    mode: "friends" as const,
    titleKey: "friends.title",
    subtitleKey: "friends.subtitle",
    icon: bicepsImage,
    gradient: "bg-gradient-to-br from-purple-200 via-amber-100 to-orange-100",
    clickable: true,
  },
  {
    mode: "bar",
    titleKey: "bar.title",
    subtitleKey: "bar.subtitle",
    icon: beerMugImage,
    gradient: "bg-gradient-to-br from-amber-200 via-orange-100 to-yellow-50",
    clickable: false,
  },
  {
    mode: "club",
    titleKey: "club.title",
    subtitleKey: "club.subtitle",
    icon: discoBallImage,
    gradient: "bg-gradient-to-br from-fuchsia-200 via-pink-100 to-purple-100",
    clickable: false,
  },
  {
    mode: "vegas",
    titleKey: "vegas.title",
    subtitleKey: "vegas.subtitle",
    icon: slotMachineImage,
    gradient: "bg-gradient-to-br from-red-200 via-orange-100 to-yellow-100",
    clickable: false,
  },
  {
    mode: "penthouse",
    titleKey: "penthouse.title",
    subtitleKey: "penthouse.subtitle",
    icon: citySkylineImage,
    gradient: "bg-gradient-to-br from-sky-200 via-cyan-100 to-slate-100",
    clickable: false,
  },
  {
    mode: "monaco",
    titleKey: "monaco.title",
    subtitleKey: "monaco.subtitle",
    icon: desertIslandImage,
    gradient: "bg-gradient-to-br from-amber-300 via-yellow-100 to-rose-100",
    clickable: false,
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

  const handleModeSelect = (mode: GameMode) => {
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
    // "classic" (the entry-level "House" room) skips the separate betting screen entirely
    // and goes straight to the single-page table. Direct-link fallback only — onSelectClassic
    // above is what Home actually uses to open it as an overlay.
    navigate(mode === "classic" ? "/play/classic" : `/play/${mode}`);
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
                if (!mode.clickable) return;
                // Safe: clickable is only ever true for the classic/friends entries above —
                // the stakes-tier placeholders are all clickable: false and never reach here.
                handleModeSelect(mode.mode as GameMode);
              }}
              canPlay={mode.clickable}
              skipEntrance={skipEntrance}
            />
          </div>
        ))}
      </div>
    </motion.section>
  );
}