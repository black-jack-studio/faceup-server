import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/game-store";
import ModeCard from "./ModeCard";
import spadeImage from '@assets/spade_suit_3d_1757354865461.png';
import moneyBagImage from '@assets/money_bag_3d_1757354181323.png';

const modeData = [
  {
    mode: "classic" as const,
    title: "Classic 21",
    subtitle: "Traditional blackjack game",
    icon: spadeImage,
    gradient: "bg-gradient-to-br from-green-200 via-blue-100 to-gray-100",
  },
  {
    mode: "high-stakes" as const,
    title: "Millionaire's Table",
    subtitle: "Win here and triple your stake",
    icon: moneyBagImage,
    gradient: "bg-gradient-to-br from-orange-100 via-pink-100 to-rose-100",
  },
];

export default function ModesCarousel() {
  const [, navigate] = useLocation();

  const handleModeSelect = (mode: typeof modeData[0]["mode"]) => {
    if (mode === "classic") {
      useGameStore.getState().setMode(mode);
      navigate("/play/classic");
    } else {
      useGameStore.getState().setMode(mode);
      navigate(`/play/${mode}`);
    }
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
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}