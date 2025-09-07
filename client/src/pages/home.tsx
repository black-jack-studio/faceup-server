import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import GameModeCard from "@/components/game-mode-card";
import Leaderboard from "@/components/leaderboard";
import DailySpin from "@/components/game/daily-spin";
import { useState } from "react";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [showDailySpin, setShowDailySpin] = useState(false);

  const { data: canSpin = true } = useQuery({
    queryKey: ["/api/daily-spin/can-spin"],
  });

  const levelProgress = user ? (user.xp % 1000) / 10 : 0;
  const currentLevel = user ? Math.floor(user.xp / 1000) + 1 : 1;
  const xpToNextLevel = user ? 1000 - (user.xp % 1000) : 1000;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* XP Display */}
      <section className="px-6 mb-8">
        <div className="text-center">
          <motion.h1 
            className="text-6xl font-bold text-white mb-2 xp-counter"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            data-testid="xp-display"
          >
            {user?.xp?.toLocaleString() || "0"}
          </motion.h1>
          <p className="text-muted-foreground">Total XP</p>
          <div className="mt-4 bg-muted rounded-full h-2 overflow-hidden">
            <motion.div 
              className="bg-primary h-full transition-all duration-500"
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2" data-testid="level-info">
            Level {currentLevel} • {xpToNextLevel} XP to next level
          </p>
        </div>
      </section>

      {/* Game Mode Cards */}
      <section className="px-6 mb-8">
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <GameModeCard
            title="Practice"
            description="Learn optimal play"
            icon="fas fa-graduation-cap"
            gradient="gradient-practice"
            href="/practice"
            testId="card-practice"
          />
          
          <GameModeCard
            title="Cash Games"
            description="Play against AI bots"
            icon="fas fa-globe"
            gradient="gradient-cash-games"
            href="/cash-games"
            testId="card-cash-games"
          />
          
          <GameModeCard
            title="Counting"
            description="Card counting drills"
            icon="fas fa-calculator"
            gradient="gradient-counting"
            href="/counting"
            testId="card-counting"
          />
          
          <GameModeCard
            title="Daily Spin"
            description="Free daily rewards"
            icon="fas fa-gift"
            gradient="gradient-shop"
            onClick={() => setShowDailySpin(true)}
            showNotification={canSpin}
            testId="card-daily-spin"
          />
        </motion.div>
      </section>

      {/* Weekly Leaderboard */}
      <motion.section 
        className="px-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <Leaderboard />
      </motion.section>

      {/* Daily Spin Modal */}
      {showDailySpin && (
        <DailySpin 
          isOpen={showDailySpin}
          onClose={() => setShowDailySpin(false)}
        />
      )}
    </div>
  );
}
