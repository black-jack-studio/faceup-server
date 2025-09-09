import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Clock, HelpCircle } from 'lucide-react';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

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
const SEASON_MAX_XP = 500; // Même règle que dans le profil : 500 XP par niveau

export default function BattlePassPage() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
  const [hasPremiumPass, setHasPremiumPass] = useState(false);

  // Fetch real-time season countdown
  const { data: timeRemaining } = useQuery({
    queryKey: ['/api/seasons/time-remaining'],
    refetchInterval: 60000, // Update every minute
  });

  if (!user) return null;

  // Utiliser le même système XP que la page profil
  const currentXP = user.currentLevelXP || 0; // XP du niveau actuel (0-499)
  const progressPercentage = Math.min((currentXP / SEASON_MAX_XP) * 100, 100);

  // Use real time remaining from API, fallback to default values
  const seasonTime = timeRemaining as { days: number; hours: number; minutes: number } | undefined;
  const daysRemaining = seasonTime?.days || 30;
  const hoursRemaining = seasonTime?.hours || 0;

  const handleUnlockPremium = () => {
    navigate('/premium');
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
        className={`relative w-32 h-32 rounded-3xl border-2 flex items-center justify-center ${bgStyle}`}
        style={glowStyle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: tier.tier * 0.1 }}
      >
        {/* Question mark icon */}
        <HelpCircle className="w-12 h-12 text-white/60" />
        
        {/* Stars decoration for premium */}
        {isPremium && tier.premiumEffect && (
          <>
            <Star className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 fill-yellow-400" />
            <div className="absolute -top-3 -left-2 w-2 h-2 bg-yellow-400 rounded-full opacity-60" />
            <div className="absolute -bottom-2 -right-3 w-3 h-3 bg-yellow-400 rounded-full opacity-40" />
            <div className="absolute top-2 -left-3 w-2 h-2 bg-yellow-400 rounded-full opacity-50" />
          </>
        )}
        
        {!isPremium && (
          <Star className="absolute -top-2 -right-2 w-6 h-6 text-green-400 fill-green-400" />
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
          className="text-white/80 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-bold text-white">{SEASON_NAME}</h1>
        <button className="text-white/80 hover:text-white transition-colors">
          <HelpCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 p-6">
        {/* XP Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-orange-400 font-bold text-lg">XP {currentXP} / {SEASON_MAX_XP}</span>
            <div className="flex items-center text-white/60">
              <Clock className="w-5 h-5 mr-2" />
              <span className="text-lg">{daysRemaining}d {hoursRemaining}h</span>
            </div>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, delay: 0.3 }}
              data-testid="xp-progress-bar"
            />
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-3xl p-4 text-center border border-gray-700">
            <span className="text-white/80 font-bold text-lg">Free</span>
          </div>
          <div className="bg-gray-800 rounded-3xl p-4 text-center border border-white/20">
            <div className="flex items-center justify-center space-x-2">
              <Star className="w-5 h-5 text-white fill-white" />
              <span className="text-white font-bold text-lg">Premium</span>
            </div>
          </div>
        </div>

        {/* Rewards Grid */}
        <div className="space-y-6 mb-8">
          {BATTLE_PASS_TIERS.map((tier) => (
            <motion.div
              key={tier.tier}
              className="grid grid-cols-2 gap-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: tier.tier * 0.1 }}
            >
              {/* Free Reward */}
              <div className="relative flex justify-center">
                <RewardBox tier={tier} isPremium={false} />
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center border-3 border-black">
                  <span className="text-sm font-bold text-white">{tier.tier}</span>
                </div>
              </div>
              
              {/* Premium Reward */}
              <div className="relative flex justify-center">
                <RewardBox tier={tier} isPremium={true} />
                <div className="absolute -bottom-3 -right-3 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center border-3 border-black">
                  <span className="text-sm font-bold text-white">{tier.tier}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Button */}
        <div className="pb-20">
          <motion.button
            onClick={handleUnlockPremium}
            className="w-full bg-white text-black font-bold text-lg py-5 rounded-3xl hover:bg-gray-100 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-unlock-premium-rewards"
          >
            Unlock premium rewards
          </motion.button>
        </div>
      </div>
    </div>
  );
}