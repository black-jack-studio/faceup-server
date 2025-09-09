import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Clock, HelpCircle } from 'lucide-react';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';

interface BattlePassProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PassTier {
  tier: number;
  xpRequired: number;
  freeReward: boolean;
  premiumReward: boolean;
  premiumEffect?: 'golden' | 'blue' | 'purple';
}

// Define simplified Battle Pass tiers matching the image design
const BATTLE_PASS_TIERS: PassTier[] = [
  {
    tier: 1,
    xpRequired: 100,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'golden'
  },
  {
    tier: 2,
    xpRequired: 200,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'blue'
  },
  {
    tier: 3,
    xpRequired: 300,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'blue'
  },
  {
    tier: 4,
    xpRequired: 400,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'purple'
  },
  {
    tier: 5,
    xpRequired: 500,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'golden'
  }
];

const SEASON_NAME = "September Season";
const SEASON_MAX_XP = 500;

export default function BattlePass({ isOpen, onClose }: BattlePassProps) {
  const user = useUserStore((state) => state.user);
  const loadUser = useUserStore((state) => state.loadUser);
  const [, navigate] = useLocation();
  const [hasPremiumPass, setHasPremiumPass] = useState(false); // This would come from user data

  // Reload user data when Battle Pass opens to get fresh XP
  React.useEffect(() => {
    if (isOpen) {
      loadUser();
    }
  }, [isOpen, loadUser]);

  if (!user) return null;

  const currentXP = user.xp || 0; // Use actual user XP
  const progressPercentage = Math.min((currentXP / SEASON_MAX_XP) * 100, 100);

  // Calculate days and hours remaining (static for design)
  const daysRemaining = 22;
  const hoursRemaining = 4;

  const handleUnlockPremium = () => {
    navigate('/premium');
    onClose();
  };

  const RewardBox = ({ tier, isPremium = false }: { tier: PassTier; isPremium?: boolean }) => {
    const hasReward = isPremium ? tier.premiumReward : tier.freeReward;
    if (!hasReward) return null;

    let glowStyle = {};
    let bgStyle = 'bg-gray-800 border-gray-700';

    if (isPremium && tier.premiumEffect) {
      switch (tier.premiumEffect) {
        case 'golden':
          glowStyle = {
            boxShadow: '0 0 30px rgba(255, 215, 0, 0.4), inset 0 0 20px rgba(255, 215, 0, 0.1)'
          };
          bgStyle = 'bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-yellow-600/50';
          break;
        case 'blue':
          glowStyle = {
            boxShadow: '0 0 30px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.1)'
          };
          bgStyle = 'bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-blue-600/50';
          break;
        case 'purple':
          glowStyle = {
            boxShadow: '0 0 30px rgba(147, 51, 234, 0.4), inset 0 0 20px rgba(147, 51, 234, 0.1)'
          };
          bgStyle = 'bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-600/50';
          break;
      }
    }

    return (
      <motion.div
        className={`relative w-24 h-24 rounded-2xl border-2 flex items-center justify-center ${bgStyle}`}
        style={glowStyle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: tier.tier * 0.1 }}
      >
        {/* Question mark icon */}
        <HelpCircle className="w-8 h-8 text-white/60" />
        
        {/* Stars decoration for premium */}
        {isPremium && tier.premiumEffect && (
          <>
            <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
            <div className="absolute -top-2 -left-1 w-1 h-1 bg-yellow-400 rounded-full opacity-60" />
            <div className="absolute -bottom-1 -right-2 w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-40" />
            <div className="absolute top-1 -left-2 w-1 h-1 bg-yellow-400 rounded-full opacity-50" />
          </>
        )}
        
        {!isPremium && (
          <Star className="absolute -top-1 -right-1 w-4 h-4 text-green-400 fill-green-400" />
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="battle-pass-overlay"
        >
          <motion.div
            className="w-full max-w-sm mx-4 bg-black border border-gray-800 rounded-3xl overflow-hidden shadow-2xl h-[90vh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="battle-pass-modal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
                data-testid="button-close-battle-pass"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-semibold text-white">{SEASON_NAME}</h1>
              <button className="text-white/80">
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>

            {/* XP Progress */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold text-sm">XP {currentXP} / {SEASON_MAX_XP}</span>
                <div className="flex items-center text-white/60 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{daysRemaining}d {hoursRemaining}h</span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-white to-gray-200 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  data-testid="xp-progress-bar"
                />
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-2 gap-2 p-4">
              <div className="bg-gray-800 rounded-2xl p-3 text-center border border-gray-700">
                <span className="text-white/80 font-medium">Free</span>
              </div>
              <div className="bg-gray-800 rounded-2xl p-3 text-center border border-white/20">
                <div className="flex items-center justify-center space-x-1">
                  <Star className="w-4 h-4 text-white fill-white" />
                  <span className="text-white font-medium">Premium</span>
                </div>
              </div>
            </div>

            {/* Rewards Grid */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {BATTLE_PASS_TIERS.slice(0, 3).map((tier) => (
                <motion.div
                  key={tier.tier}
                  className="grid grid-cols-2 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: tier.tier * 0.1 }}
                >
                  {/* Free Reward */}
                  <div className="relative">
                    <RewardBox tier={tier} isPremium={false} />
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center border-2 border-black">
                      <span className="text-xs font-bold text-white">{tier.tier}</span>
                    </div>
                  </div>
                  
                  {/* Premium Reward */}
                  <div className="relative">
                    <RewardBox tier={tier} isPremium={true} />
                    <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center border-2 border-black">
                      <span className="text-xs font-bold text-white">{tier.tier}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom Button */}
            <div className="p-4">
              <motion.button
                onClick={handleUnlockPremium}
                className="w-full bg-white text-black font-semibold py-4 rounded-2xl hover:bg-gray-100 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-unlock-premium-rewards"
              >
                Unlock premium rewards
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}