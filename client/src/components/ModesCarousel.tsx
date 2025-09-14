import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
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
    title: "21 Streak",
    subtitle: "Chain wins for massive multipliers",
    icon: moneyBagImage,
    gradient: "bg-gradient-to-br from-purple-200 via-amber-100 to-orange-100",
  },
];

export default function ModesCarousel() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const isPremium = user?.membershipType === "premium";

  const handleModeSelect = (mode: typeof modeData[0]["mode"]) => {
    // Check if user is trying to access premium mode without subscription
    if (mode === "high-stakes" && !isPremium) {
      navigate("/premium");
      return;
    }
    
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
              isPremium={isPremium}
              requiresPremium={mode.mode === "high-stakes"}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}