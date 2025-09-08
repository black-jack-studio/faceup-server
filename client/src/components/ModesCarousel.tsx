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
    gradient: "bg-gradient-to-br from-blue-500/40 via-cyan-500/30 to-blue-600/40",
  },
  {
    mode: "high-stakes" as const,
    title: "High Stakes",
    subtitle: "Play with bigger chip values.",
    icon: Stack,
    gradient: "bg-gradient-to-br from-red-500/40 via-orange-500/30 to-yellow-500/40",
  },
  {
    mode: "tournaments" as const,
    title: "Tournaments",
    subtitle: "Compete in multi-round tournaments.",
    icon: Trophy,
    gradient: "bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-purple-600/40",
  },
  {
    mode: "challenges" as const,
    title: "Challenges",
    subtitle: "Win streaks & daily missions.",
    icon: Lightning,
    gradient: "bg-gradient-to-br from-green-500/40 via-emerald-500/30 to-teal-500/40",
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
      className="px-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      <div 
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 pt-2"
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