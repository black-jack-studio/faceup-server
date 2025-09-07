import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import { Coin, Gem, Crown, Question, Wheel } from "@/icons";
import DailySpin from "@/components/game/daily-spin";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
  const [showDailySpin, setShowDailySpin] = useState(false);

  const { data: canSpin = true } = useQuery({
    queryKey: ["/api/daily-spin/can-spin"],
  }) as { data: boolean };
  
  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ["/api/leaderboard/weekly"],
  });

  const levelProgress = user ? ((user.xp || 0) % 1000) / 10 : 0;
  const currentLevel = user ? Math.floor((user.xp || 0) / 1000) + 1 : 1;
  const xpToNextLevel = user ? 1000 - ((user.xp || 0) % 1000) : 1000;

  return (
    <div className="min-h-screen bg-ink text-white overflow-hidden">
      {/* Header with level/gems and XP ring */}
      <header className="px-6 pt-12 pb-6">
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center space-x-4">
            <motion.div 
              className="flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-xl backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
            >
              <Gem className="w-5 h-5 text-accent-purple" />
              <span className="text-accent-purple font-bold" data-testid="header-gems">
                {user?.gems?.toLocaleString() || "3"}
              </span>
            </motion.div>
          </div>
          
          <div className="flex items-center">
            <XPRing size={50} stroke={5} />
          </div>
        </motion.div>
      </header>
      
      {/* Coins Display */}
      <CoinsHero />

      {/* Cash Games Feature Card */}
      <section className="px-6 mb-8">
        <motion.div
          className="bg-gradient-to-br from-accent-green/20 to-emerald-400/20 rounded-3xl p-6 border border-accent-green/20 backdrop-blur-sm halo"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/cash-games")}
          data-testid="card-cash-games"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Coin className="w-8 h-8 text-accent-green" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Cash Games</h3>
            <p className="text-white/70 text-lg mb-4">Play against AI bots and win big</p>
            <div className="bg-accent-green/10 rounded-2xl p-4 mb-4">
              <p className="text-accent-green font-bold text-sm">🎯 Next Level Bonus: 2,500 coins</p>
            </div>
            <motion.button
              className="bg-accent-green hover:bg-accent-green/80 text-ink font-bold py-3 px-8 rounded-2xl transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Now
            </motion.button>
          </div>
        </motion.div>
      </section>
      
      {/* Game Modes Carousel */}
      <ModesCarousel />

      {/* Hidden old grid for reference - remove when testing complete */}
      <section className="hidden px-6 mb-8">
        <motion.div 
          className="grid grid-cols-2 gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <motion.div
            className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
            whileHover={{ scale: 1.05, borderColor: "rgba(181, 243, 199, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/practice")}
            data-testid="card-practice-old"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Question className="w-6 h-6 text-blue-400" />
              </div>
              <h4 className="text-white font-bold mb-1">Practice</h4>
              <p className="text-white/60 text-sm">Learn optimal play</p>
            </div>
          </motion.div>
          
          <motion.div
            className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
            whileHover={{ scale: 1.05, borderColor: "rgba(181, 243, 199, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/counting")}
            data-testid="card-counting-old"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="text-white font-bold mb-1">Counting</h4>
              <p className="text-white/60 text-sm">Card counting drills</p>
            </div>
          </motion.div>
          
          <motion.div
            className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm relative"
            whileHover={{ scale: 1.05, borderColor: "rgba(181, 243, 199, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowDailySpin(true)}
            data-testid="card-daily-spin-old"
          >
            {canSpin && (
              <motion.div 
                className="absolute -top-1 -right-1 w-4 h-4 bg-accent-green rounded-full halo"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <div className="text-center">
              <div className="w-12 h-12 bg-accent-gold/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Wheel className="w-6 h-6 text-accent-gold" />
              </div>
              <h4 className="text-white font-bold mb-1">Daily Spin</h4>
              <p className="text-white/60 text-sm">Free rewards</p>
            </div>
          </motion.div>
          
          <motion.div
            className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
            whileHover={{ scale: 1.05, borderColor: "rgba(181, 243, 199, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/shop")}
            data-testid="card-shop-old"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-accent-purple/20 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Gem className="w-6 h-6 text-accent-purple" />
              </div>
              <h4 className="text-white font-bold mb-1">Shop</h4>
              <p className="text-white/60 text-sm">Cards & themes</p>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Weekly Leaderboard */}
      <motion.section 
        className="px-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Weekly Leaderboard</h2>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Question className="w-4 h-4 text-white/60" />
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5">
                  <div className="w-12 h-12 bg-white/10 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="w-24 h-4 bg-white/10 rounded animate-pulse mb-2" />
                    <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(leaderboard as any[]).map((user: any, index: number) => (
                <motion.div
                  key={user.id}
                  className="flex items-center space-x-4 p-4 rounded-2xl bg-white/5 border border-white/10"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  data-testid={`leaderboard-user-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{user.medal}</span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-green to-emerald-400 flex items-center justify-center text-xl">
                      {user.avatar}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white" data-testid={`username-${index}`}>
                      {user.username}
                    </h3>
                    <p className="text-sm text-white/60" data-testid={`xp-${index}`}>
                      {user.weeklyXp.toLocaleString()} XP
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
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
