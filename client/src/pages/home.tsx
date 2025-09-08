import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import { Coin, Gem, Crown, Question, Wheel } from "@/icons";
import DailySpin from "@/components/game/daily-spin";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import Challenges from "@/components/challenges";
import { useState } from "react";
import { useLocation } from "wouter";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
  const [showDailySpin, setShowDailySpin] = useState(false);

  const { data: canSpin = true } = useQuery({
    queryKey: ["/api/daily-spin/can-spin"],
  }) as { data: boolean };
  

  const levelProgress = user ? ((user.xp || 0) % 1000) / 10 : 0;
  const currentLevel = user ? Math.floor((user.xp || 0) / 1000) + 1 : 1;
  const xpToNextLevel = user ? 1000 - ((user.xp || 0) % 1000) : 1000;
  
  // Avatar de l'utilisateur
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();

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
          
          {/* Avatar de l'utilisateur au centre */}
          <div className="flex items-center justify-center">
            {currentAvatar ? (
              <img 
                src={currentAvatar.image} 
                alt={currentAvatar.name}
                className="w-12 h-12 object-contain"
              />
            ) : (
              <span className="text-2xl">😊</span>
            )}
          </div>
          
          <div className="flex items-center">
            <XPRing size={50} stroke={5} onClick={() => navigate('/battlepass')} />
          </div>
        </motion.div>
      </header>
      
      {/* Coins Display */}
      <CoinsHero />

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

      {/* Daily Challenges */}
      <motion.section 
        className="px-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
          <Challenges />
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
