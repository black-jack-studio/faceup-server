import { motion } from "framer-motion";
import { GlobePlay, Skyscraper, BracketBot, TargetStar } from "@/icons";
import ModeCard from "./ModeCard";

const MODES = [
  { 
    title: 'Classic 21', 
    subtitle: 'Standard blackjack with regular bets.', 
    gradient: 'green' as const, 
    icon: <GlobePlay className="w-full h-full text-white drop-shadow-lg" />, 
    to: '/play/classic', 
    locked: false 
  },
  { 
    title: 'High Stakes', 
    subtitle: 'Bigger blinds and higher buy-ins.', 
    gradient: 'peach' as const, 
    icon: <Skyscraper className="w-full h-full text-white drop-shadow-lg" />, 
    to: '/play/high-stakes', 
    locked: false 
  },
  { 
    title: 'Tournaments', 
    subtitle: 'Multi-round brackets, climb the ladder.', 
    gradient: 'lavender' as const, 
    icon: <BracketBot className="w-full h-full text-white drop-shadow-lg" />, 
    to: '/play/tournaments', 
    locked: true 
  },
  { 
    title: 'Challenges', 
    subtitle: 'Short missions and special goals.', 
    gradient: 'aqua' as const, 
    icon: <TargetStar className="w-full h-full text-white drop-shadow-lg" />, 
    to: '/play/challenges', 
    locked: false 
  },
];

export default function ModesCarousel() {
  return (
    <motion.section 
      className="px-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      <div 
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4"
        style={{ 
          scrollbarWidth: 'none', 
          msOverflowStyle: 'none'
        }}
        data-testid="modes-carousel"
      >
        {MODES.map((mode, index) => (
          <motion.div
            key={mode.title}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * index }}
          >
            <ModeCard
              title={mode.title}
              subtitle={mode.subtitle}
              gradient={mode.gradient}
              icon={mode.icon}
              locked={mode.locked}
              to={mode.to}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}