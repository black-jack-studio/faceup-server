import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useGameStore } from "@/store/game-store";
import { useQuery } from "@tanstack/react-query";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import Challenges from "@/components/challenges";
import DailyStreakPopup, { type DailyStreakRewardInfo } from "@/components/DailyStreakPopup";
import { useLocation } from "wouter";
import NotificationDot from "@/components/NotificationDot";
import Flame from "@/icons/Flame";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();

  // Check if user has unclaimed Battle Pass tiers
  const { data: claimedTiersData, isLoading: isLoadingClaimedTiers } = useQuery({
    queryKey: ['/api/battlepass/claimed-tiers'],
    enabled: !!user,
  });

  // A Classic win just before landing here may have credited a new streak reward — captured
  // once on mount (not read reactively) so it survives the click that navigated here, and
  // cleared from the store right away so revisiting Home later doesn't show it again.
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [justWonStreak, setJustWonStreak] = useState<DailyStreakRewardInfo | null>(null);
  useEffect(() => {
    const pending = useGameStore.getState().dailyStreakReward;
    if (pending?.reward) {
      setJustWonStreak(pending);
      setShowStreakPopup(true);
      useGameStore.getState().clearDailyStreakReward();
    }
  }, []);

  const claimedTiers = (claimedTiersData as any)?.freeTiers || [];

  const currentLevel = user?.level ?? 1;
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const levelProgress = (currentLevelXP / 100) * 100; // Progress percentage
  const xpToNextLevel = 100 - currentLevelXP;
  // Only show notification if the current level specifically hasn't been claimed
  // This ensures it only appears when the user just reached this level.
  // Gated on !isLoadingClaimedTiers: before that query resolves, claimedTiers defaults to
  // [], which made `!claimedTiers.includes(currentLevel)` true for EVERY level > 1 — the dot
  // flashed on for anyone past level 1 on every cold start, then vanished once the real
  // (already-claimed) data arrived a moment later.
  const hasUnclaimedTiers = !isLoadingClaimedTiers && currentLevel > 1 && !claimedTiers.includes(currentLevel);

  return (
    <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Header with level/gems and XP ring */}
      <header className="px-6 pt-12 pb-6">
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.button
            className="flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowStreakPopup(true)}
            data-testid="button-header-daily-streak"
          >
            <Flame size={32} />
          </motion.button>

          <div className="flex items-center">
            <div className="relative">
              <XPRing size={50} stroke={5} onClick={() => navigate('/battlepass')} />
              <NotificationDot show={hasUnclaimedTiers} className="-top-2 -right-2" />
            </div>
          </div>
        </motion.div>
      </header>
      {/* Coins Display */}
      <CoinsHero />
      {/* Game Modes Carousel */}
      <ModesCarousel />
      {/* Leaderboard */}
      <motion.section
        className="px-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <HomeLeaderboard />
      </motion.section>
      {/* Daily Challenges */}
      <motion.section
        className="px-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Challenges />
      </motion.section>

      <DailyStreakPopup
        open={showStreakPopup}
        justWon={justWonStreak}
        onClose={() => {
          setShowStreakPopup(false);
          setJustWonStreak(null);
        }}
      />
    </div>
  );
}
