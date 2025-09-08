import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Star, Zap, Gift, Lock, CheckCircle } from 'lucide-react';
import { Coin, Gem } from '@/icons';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';

interface BattlePassProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Reward {
  id: string;
  type: 'coins' | 'gems' | 'avatar' | 'cardback' | 'xp';
  amount?: number;
  itemId?: string;
  icon: React.ComponentType<any>;
  label: string;
}

interface PassTier {
  tier: number;
  xpRequired: number;
  freeReward?: Reward;
  premiumReward?: Reward;
}

// Define the Battle Pass tiers with rewards
const BATTLE_PASS_TIERS: PassTier[] = [
  {
    tier: 1,
    xpRequired: 100,
    freeReward: { id: 'coins_1', type: 'coins', amount: 500, icon: Coin, label: '500 Coins' },
    premiumReward: { id: 'gems_1', type: 'gems', amount: 10, icon: Gem, label: '10 Gems' }
  },
  {
    tier: 2,
    xpRequired: 300,
    freeReward: { id: 'xp_1', type: 'xp', amount: 50, icon: Star, label: '50 XP' },
    premiumReward: { id: 'coins_2', type: 'coins', amount: 1000, icon: Coin, label: '1000 Coins' }
  },
  {
    tier: 3,
    xpRequired: 600,
    freeReward: { id: 'coins_3', type: 'coins', amount: 750, icon: Coin, label: '750 Coins' },
    premiumReward: { id: 'avatar_1', type: 'avatar', itemId: 'crown_emoji', icon: Crown, label: 'Crown Avatar' }
  },
  {
    tier: 4,
    xpRequired: 1000,
    freeReward: { id: 'gems_2', type: 'gems', amount: 5, icon: Gem, label: '5 Gems' },
    premiumReward: { id: 'gems_3', type: 'gems', amount: 25, icon: Gem, label: '25 Gems' }
  },
  {
    tier: 5,
    xpRequired: 1500,
    freeReward: { id: 'coins_4', type: 'coins', amount: 1000, icon: Coin, label: '1000 Coins' },
    premiumReward: { id: 'cardback_1', type: 'cardback', itemId: 'golden_cards', icon: Zap, label: 'Golden Cards' }
  },
  {
    tier: 6,
    xpRequired: 2000,
    freeReward: { id: 'xp_2', type: 'xp', amount: 100, icon: Star, label: '100 XP' },
    premiumReward: { id: 'coins_5', type: 'coins', amount: 2000, icon: Coin, label: '2000 Coins' }
  },
  {
    tier: 7,
    xpRequired: 2500,
    freeReward: { id: 'coins_6', type: 'coins', amount: 1500, icon: Coin, label: '1500 Coins' },
    premiumReward: { id: 'gems_4', type: 'gems', amount: 50, icon: Gem, label: '50 Gems' }
  },
  {
    tier: 8,
    xpRequired: 3000,
    freeReward: { id: 'gems_5', type: 'gems', amount: 10, icon: Gem, label: '10 Gems' },
    premiumReward: { id: 'avatar_2', type: 'avatar', itemId: 'diamond_emoji', icon: Crown, label: 'Diamond Avatar' }
  },
  {
    tier: 9,
    xpRequired: 3500,
    freeReward: { id: 'coins_7', type: 'coins', amount: 2000, icon: Coin, label: '2000 Coins' },
    premiumReward: { id: 'cardback_2', type: 'cardback', itemId: 'royal_cards', icon: Zap, label: 'Royal Cards' }
  },
  {
    tier: 10,
    xpRequired: 4000,
    freeReward: { id: 'gems_6', type: 'gems', amount: 25, icon: Gem, label: '25 Gems' },
    premiumReward: { id: 'gems_7', type: 'gems', amount: 100, icon: Gem, label: '100 Gems' }
  }
];

const SEASON_NAME = "September Season";
const SEASON_MAX_XP = 4000;

export default function BattlePass({ isOpen, onClose }: BattlePassProps) {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
  const [hasPremiumPass, setHasPremiumPass] = useState(false); // This would come from user data

  if (!user) return null;

  const currentXP = user.xp || 0;
  const progressPercentage = Math.min((currentXP / SEASON_MAX_XP) * 100, 100);

  const getCurrentTier = () => {
    for (let i = BATTLE_PASS_TIERS.length - 1; i >= 0; i--) {
      if (currentXP >= BATTLE_PASS_TIERS[i].xpRequired) {
        return i + 1;
      }
    }
    return 0;
  };

  const isRewardUnlocked = (tier: number, isPremium: boolean) => {
    if (isPremium && !hasPremiumPass) return false;
    return currentXP >= BATTLE_PASS_TIERS[tier - 1]?.xpRequired;
  };

  const handleBuyPremiumPass = () => {
    // Navigate to payment page
    navigate('/shop');
    onClose();
  };

  const RewardCard = ({ reward, isUnlocked, isPremium }: { reward?: Reward; isUnlocked: boolean; isPremium: boolean }) => {
    if (!reward) return <div className="w-16 h-16 bg-white/5 rounded-xl" />;

    const IconComponent = reward.icon;
    const bgColor = isPremium ? 'bg-gradient-to-br from-yellow-500/20 to-amber-600/20' : 'bg-gradient-to-br from-green-500/20 to-emerald-600/20';
    const borderColor = isPremium ? 'border-yellow-500/30' : 'border-green-500/30';
    const glowColor = isPremium ? 'shadow-yellow-500/25' : 'shadow-green-500/25';

    return (
      <motion.div
        className={`relative w-16 h-16 ${bgColor} border ${borderColor} rounded-xl flex items-center justify-center ${
          isUnlocked ? `${glowColor} shadow-lg` : 'opacity-50'
        }`}
        whileHover={isUnlocked ? { scale: 1.05, y: -2 } : {}}
        data-testid={`reward-${reward.id}`}
      >
        {isUnlocked ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-green-400"
          >
            <CheckCircle className="absolute -top-1 -right-1 w-4 h-4" />
          </motion.div>
        ) : (
          !isPremium || hasPremiumPass ? null : (
            <Lock className="absolute -top-1 -right-1 w-4 h-4 text-red-400" />
          )
        )}
        
        <IconComponent 
          className={`w-8 h-8 ${isPremium ? 'text-yellow-400' : 'text-green-400'}`}
        />
        
        {/* Reward amount badge */}
        {reward.amount && (
          <div className="absolute -bottom-1 -right-1 bg-black/80 text-white text-xs px-1 rounded">
            {reward.amount}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="battle-pass-overlay"
        >
          <motion.div
            className="w-full max-w-6xl mx-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            data-testid="battle-pass-modal"
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-b border-white/10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                data-testid="button-close-battle-pass"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="text-center">
                <motion.h1
                  className="text-3xl font-bold text-white mb-2"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {SEASON_NAME}
                </motion.h1>
                
                {/* XP Progress Bar */}
                <div className="max-w-md mx-auto">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/80 text-sm">XP Progress</span>
                    <span className="text-white font-bold" data-testid="text-xp-progress">
                      {currentXP.toLocaleString()} / {SEASON_MAX_XP.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-lg shadow-green-400/25"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      data-testid="xp-progress-bar"
                    />
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-white/60 text-sm">
                      Tier {getCurrentTier()} / {BATTLE_PASS_TIERS.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Battle Pass Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {/* Column Headers */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <span className="text-white/60 font-medium">Tier</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Gift className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-bold">FREE</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-yellow-400 font-bold">PREMIUM</span>
                  </div>
                </div>
              </div>

              {/* Tiers */}
              <div className="space-y-4">
                {BATTLE_PASS_TIERS.map((tier, index) => {
                  const isCurrentTier = getCurrentTier() === tier.tier;
                  const freeUnlocked = isRewardUnlocked(tier.tier, false);
                  const premiumUnlocked = isRewardUnlocked(tier.tier, true);

                  return (
                    <motion.div
                      key={tier.tier}
                      className={`grid grid-cols-3 gap-4 p-4 rounded-xl border transition-all ${
                        isCurrentTier 
                          ? 'bg-white/5 border-blue-500/30 shadow-lg shadow-blue-500/10' 
                          : 'bg-white/[0.02] border-white/5'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      data-testid={`tier-${tier.tier}`}
                    >
                      {/* Tier Number and XP Required */}
                      <div className="flex flex-col items-center justify-center">
                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold ${
                          isCurrentTier 
                            ? 'border-blue-400 bg-blue-500/20 text-blue-400' 
                            : 'border-white/20 text-white/60'
                        }`}>
                          {tier.tier}
                        </div>
                        <span className="text-xs text-white/40 mt-1">
                          {tier.xpRequired} XP
                        </span>
                      </div>

                      {/* Free Reward */}
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RewardCard reward={tier.freeReward} isUnlocked={freeUnlocked} isPremium={false} />
                        {tier.freeReward && (
                          <span className="text-xs text-white/60 text-center">
                            {tier.freeReward.label}
                          </span>
                        )}
                      </div>

                      {/* Premium Reward */}
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <RewardCard reward={tier.premiumReward} isUnlocked={premiumUnlocked} isPremium={true} />
                        {tier.premiumReward && (
                          <span className="text-xs text-white/60 text-center">
                            {tier.premiumReward.label}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer with Premium Pass Button */}
            {!hasPremiumPass && (
              <div className="p-6 bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border-t border-white/10">
                <motion.button
                  onClick={handleBuyPremiumPass}
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold py-4 px-6 rounded-xl hover:from-yellow-400 hover:to-amber-500 transition-all shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  data-testid="button-buy-premium-pass"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Crown className="w-6 h-6" />
                    <span>Débloquer le Pass Premium (mensuel)</span>
                    <Gem className="w-5 h-5" />
                  </div>
                </motion.button>
                <p className="text-center text-white/60 text-sm mt-2">
                  Débloquez toutes les récompenses premium de la saison !
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}