import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/game-store";
import ModeCard from "./ModeCard";
import spadeImage from '@assets/spade_suit_3d_1757354865461.png';
import fireImage from '@assets/fire_3d_1758055031099.png';
import bicepsImage from '@assets/flexed_biceps_3d_default.png';

const modeData = [
  {
    mode: "classic" as const,
    title: "Classic 21",
    subtitle: "Traditional blackjack game",
    icon: spadeImage,
    gradient: "bg-gradient-to-br from-green-200 via-blue-100 to-gray-100",
  },
  {
    mode: "friends" as const,
    title: "Play with Friends",
    subtitle: "Up to 3 players at the table",
    icon: bicepsImage,
    gradient: "bg-gradient-to-br from-purple-200 via-amber-100 to-orange-100",
  },
  {
    mode: "all-in" as const,
    title: "All-in Mode",
    subtitle: "High-risk, high-reward blackjack",
    icon: fireImage,
    gradient: "bg-gradient-to-br from-red-400 via-red-300 to-orange-200",
  },
];

export default function ModesCarousel() {
  const [, navigate] = useLocation();

  const handleModeSelect = (mode: typeof modeData[0]["mode"]) => {
    // Set mode and navigate
    useGameStore.getState().setMode(mode);
    navigate(`/play/${mode}`);
  };

  return (
    <motion.section 
      className="mb-8"
      initial={{ opacity: 0, y: 20 }}
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
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <ModeCard
              mode={mode.mode}
              title={mode.title}
              subtitle={mode.subtitle}
              icon={mode.icon}
              gradient={mode.gradient}
              onClick={() => handleModeSelect(mode.mode)}
              canPlay={mode.mode !== "all-in"}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}