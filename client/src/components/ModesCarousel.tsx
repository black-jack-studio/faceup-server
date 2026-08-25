import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/game-store";
import ModeCard from "./ModeCard";
import spadeImage from '@assets/spade_suit_3d_1757354865461.png';
import calendarImage from '@assets/calendar_3d_1787179981404.png';
import bicepsImage from '@assets/flexed_biceps_3d_default.png';
import classic21GradientImage from '@assets/classic21_mesh_gradient_1756123456789.jpg';
import friendsGradientImage from '@assets/friends_mesh_gradient_1756123456790.jpg';
import comingSoonGradientImage from '@assets/comingsoon_mesh_gradient_1756123456791.jpg';

const modeData = [
  {
    mode: "classic" as const,
    title: "Classic 21",
    subtitle: "Traditional blackjack game",
    icon: spadeImage,
    gradient: "",
    backgroundStyle: {
      backgroundImage: `url(${classic21GradientImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    mode: "friends" as const,
    title: "Play with Friends",
    subtitle: "Up to 3 players at the table",
    icon: bicepsImage,
    gradient: "",
    backgroundStyle: {
      backgroundImage: `url(${friendsGradientImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
  },
  {
    mode: "coming-soon" as const,
    title: "Coming Soon",
    subtitle: "A new mode is on its way",
    icon: calendarImage,
    gradient: "",
    backgroundStyle: {
      backgroundImage: `url(${comingSoonGradientImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    },
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
      initial={skipEntrance ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div 
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 pt-2 px-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        data-testid="modes-carousel"
      >
        {modeData.map((mode, index) => (
          <motion.div
            key={mode.mode}
            initial={skipEntrance ? false : { opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <ModeCard
              mode={mode.mode}
              title={mode.title}
              subtitle={mode.subtitle}
              icon={mode.icon}
              gradient={mode.gradient}
              backgroundStyle={mode.backgroundStyle}
              onClick={() => {
                if (mode.mode === "coming-soon") return;
                handleModeSelect(mode.mode);
              }}
              canPlay={mode.mode !== "coming-soon"}
              skipEntrance={skipEntrance}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}