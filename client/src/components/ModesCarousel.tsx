import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGameStore } from "@/store/game-store";
import { Cards, Stack, Trophy, Lightning } from "@/icons";
import ModeCard from "./ModeCard";

const modeData = [
  {
    mode: "classic" as const,
    title: "Classic 21",
    subtitle: "Standard blackjack with normal bets.",
    icon: Cards,
    gradient: "bg-gradient-to-br from-accent-green/30 to-emerald-400/20",
  },
];

export default function ModesCarousel() {
  const [, navigate] = useLocation();
  const { setMode, startGame } = useGameStore((state) => ({ 
    setMode: state.setMode, 
    startGame: state.startGame 
  }));

  const handleModeSelect = (mode: typeof modeData[0]["mode"]) => {
    setMode(mode);
    startGame("cash");
    navigate("/cash-games");
  };

  return (
    <motion.section 
      className="px-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div 
        className="flex justify-center"
        data-testid="modes-carousel"
      >
        {modeData.map((mode, index) => (
          <motion.div
            key={mode.mode}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 * index }}
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