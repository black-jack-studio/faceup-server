import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import Challenges from "@/components/challenges";
import { useLocation } from "wouter";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import NotificationDot from "@/components/NotificationDot";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();

  // Check if user has unclaimed Battle Pass tiers
  const { data: claimedTiersData } = useQuery({
    queryKey: ['/api/battlepass/claimed-tiers'],
  });
  
  const claimedTiers = (claimedTiersData as any)?.freeTiers || [];

  const currentLevel = user?.level ?? 1;
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const levelProgress = (currentLevelXP / 500) * 100; // Progress percentage
  const xpToNextLevel = 500 - currentLevelXP;
  // Only show notification if the current level specifically hasn't been claimed
  // This ensures it only appears when the user just reached this level
  const hasUnclaimedTiers = currentLevel > 1 && !claimedTiers.includes(currentLevel);
  
  // Avatar de l'utilisateur
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();

  return (
    <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#0B0B0F' }}>
      {/* Header with level/gems and XP ring */}
      <header className="px-6 pt-12 pb-6">
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <motion.div 
              className="w-12 h-12 overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img 
                src={currentAvatar?.image || "/avatars/face-with-tears-of-joy.png"} 
                alt={currentAvatar?.name || "Avatar"}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
          
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
    </div>
  );
}
