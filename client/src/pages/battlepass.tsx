import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Clock, HelpCircle } from 'lucide-react';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import Coin from '@/icons/Coin';
import Gem from '@/icons/Gem';
import chestIcon from '@assets/image_1757441317811.png';
import claimedChestIcon from '@assets/image_1757441877809.png';

interface PassTier {
  tier: number;
  xpRequired: number;
  freeReward: boolean;
  premiumReward: boolean;
  premiumEffect?: 'golden' | 'blue' | 'purple';
}

// Define 50 Battle Pass tiers - rewards only available every 10 tiers (10, 20, 30, 40, 50)
const BATTLE_PASS_TIERS: PassTier[] = [
  // Tiers 1-9: No rewards, just progression
  { tier: 1, xpRequired: 10, freeReward: false, premiumReward: false },
  { tier: 2, xpRequired: 20, freeReward: false, premiumReward: false },
  { tier: 3, xpRequired: 30, freeReward: false, premiumReward: false },
  { tier: 4, xpRequired: 40, freeReward: false, premiumReward: false },
  { tier: 5, xpRequired: 50, freeReward: false, premiumReward: false },
  { tier: 6, xpRequired: 60, freeReward: false, premiumReward: false },
  { tier: 7, xpRequired: 70, freeReward: false, premiumReward: false },
  { tier: 8, xpRequired: 80, freeReward: false, premiumReward: false },
  { tier: 9, xpRequired: 90, freeReward: false, premiumReward: false },
  // Tier 10: First reward tier - Card themed
  { tier: 10, xpRequired: 100, freeReward: true, premiumReward: true, premiumEffect: 'golden' },
  // Tiers 11-19: No rewards
  { tier: 11, xpRequired: 110, freeReward: false, premiumReward: false },
  { tier: 12, xpRequired: 120, freeReward: false, premiumReward: false },
  { tier: 13, xpRequired: 130, freeReward: false, premiumReward: false },
  { tier: 14, xpRequired: 140, freeReward: false, premiumReward: false },
  { tier: 15, xpRequired: 150, freeReward: false, premiumReward: false },
  { tier: 16, xpRequired: 160, freeReward: false, premiumReward: false },
  { tier: 17, xpRequired: 170, freeReward: false, premiumReward: false },
  { tier: 18, xpRequired: 180, freeReward: false, premiumReward: false },
  { tier: 19, xpRequired: 190, freeReward: false, premiumReward: false },
  // Tier 20: Second reward tier - Gem themed
  { tier: 20, xpRequired: 200, freeReward: true, premiumReward: true, premiumEffect: 'purple' },
  // Tiers 21-29: No rewards
  { tier: 21, xpRequired: 210, freeReward: false, premiumReward: false },
  { tier: 22, xpRequired: 220, freeReward: false, premiumReward: false },
  { tier: 23, xpRequired: 230, freeReward: false, premiumReward: false },
  { tier: 24, xpRequired: 240, freeReward: false, premiumReward: false },
  { tier: 25, xpRequired: 250, freeReward: false, premiumReward: false },
  { tier: 26, xpRequired: 260, freeReward: false, premiumReward: false },
  { tier: 27, xpRequired: 270, freeReward: false, premiumReward: false },
  { tier: 28, xpRequired: 280, freeReward: false, premiumReward: false },
  { tier: 29, xpRequired: 290, freeReward: false, premiumReward: false },
  // Tier 30: Third reward tier - Coin themed
  { tier: 30, xpRequired: 300, freeReward: true, premiumReward: true, premiumEffect: 'golden' },
  // Tiers 31-39: No rewards
  { tier: 31, xpRequired: 310, freeReward: false, premiumReward: false },
  { tier: 32, xpRequired: 320, freeReward: false, premiumReward: false },
  { tier: 33, xpRequired: 330, freeReward: false, premiumReward: false },
  { tier: 34, xpRequired: 340, freeReward: false, premiumReward: false },
  { tier: 35, xpRequired: 350, freeReward: false, premiumReward: false },
  { tier: 36, xpRequired: 360, freeReward: false, premiumReward: false },
  { tier: 37, xpRequired: 370, freeReward: false, premiumReward: false },
  { tier: 38, xpRequired: 380, freeReward: false, premiumReward: false },
  { tier: 39, xpRequired: 390, freeReward: false, premiumReward: false },
  // Tier 40: Fourth reward tier - Lucky themed
  { tier: 40, xpRequired: 400, freeReward: true, premiumReward: true, premiumEffect: 'blue' },
  // Tiers 41-49: No rewards
  { tier: 41, xpRequired: 410, freeReward: false, premiumReward: false },
  { tier: 42, xpRequired: 420, freeReward: false, premiumReward: false },
  { tier: 43, xpRequired: 430, freeReward: false, premiumReward: false },
  { tier: 44, xpRequired: 440, freeReward: false, premiumReward: false },
  { tier: 45, xpRequired: 450, freeReward: false, premiumReward: false },
  { tier: 46, xpRequired: 460, freeReward: false, premiumReward: false },
  { tier: 47, xpRequired: 470, freeReward: false, premiumReward: false },
  { tier: 48, xpRequired: 480, freeReward: false, premiumReward: false },
  { tier: 49, xpRequired: 490, freeReward: false, premiumReward: false },
  // Tier 50: Final reward tier - Ultimate themed
  { tier: 50, xpRequired: 500, freeReward: true, premiumReward: true, premiumEffect: 'golden' }
];

const SEASON_NAME = "September Season";
const SEASON_MAX_XP = 500; // Same rule as in profile: 500 XP per level

export default function BattlePassPage() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
  const [hasPremiumPass, setHasPremiumPass] = useState(false);
  const [claimedTiers, setClaimedTiers] = useState<number[]>([]);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [lastReward, setLastReward] = useState<{ type: 'coins' | 'gems'; amount: number } | null>(null);

  // Fetch real-time season countdown
  const { data: timeRemaining } = useQuery({
    queryKey: ['/api/seasons/time-remaining'],
    refetchInterval: 60000, // Update every minute
  });

  // Fetch claimed tiers
  const { data: claimedTiersData } = useQuery({
    queryKey: ['/api/battlepass/claimed-tiers'],
    refetchInterval: 30000, // Update every 30 seconds
  });

  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/status'],
    refetchInterval: 60000, // Update every minute
  });

  React.useEffect(() => {
    if (claimedTiersData && Array.isArray((claimedTiersData as any).claimedTiers)) {
      setClaimedTiers((claimedTiersData as any).claimedTiers);
    }
  }, [claimedTiersData]);

  if (!user) return null;

  // New level-based system
  const userLevel = user.level || 1;
  const currentXP = user.currentLevelXP || 0; // Current level XP (0-499)
  const progressPercentage = Math.min((currentXP / SEASON_MAX_XP) * 100, 100);

  // Use real time remaining from API, fallback to default values
  const seasonTime = timeRemaining as { days: number; hours: number; minutes: number } | undefined;
  const daysRemaining = seasonTime?.days || 30;
  const hoursRemaining = seasonTime?.hours || 0;

  const handleUnlockPremium = () => {
    navigate('/premium');
  };

  // Check if user has premium subscription
  const isUserPremium = (subscriptionData as any)?.isActive || false;

  const handleClaimTier = async (tier: number, isPremium = false) => {
    const isUnlocked = userLevel >= tier;
    if (!isUnlocked) return;
    
    // For free rewards
    if (!isPremium && claimedTiers.includes(tier)) return;

    try {
      const response = await fetch('/api/battlepass/claim-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, isPremium })
      });

      if (response.ok) {
        const data = await response.json();
        setLastReward(data.reward);
        setShowRewardAnimation(true);
        
        if (!isPremium) {
          setClaimedTiers(prev => [...prev, tier]);
        }
        
        // Auto-hide animation after 3 seconds
        setTimeout(() => {
          setShowRewardAnimation(false);
        }, 3000);
      } else {
        const errorData = await response.json();
        if (errorData.message === "Premium subscription required to claim premium rewards") {
          // Rediriger vers la page d'abonnement
          handleUnlockPremium();
        }
      }
    } catch (error) {
      console.error('Failed to claim tier:', error);
    }
  };

  // Get special emoji and theme for reward tiers
  const getRewardTheme = (tierNumber: number, isPremium: boolean) => {
    switch (tierNumber) {
      case 10:
        return {
          emoji: isPremium ? '🃏' : '🎯', // Joker card / Target
          cardRef: 'Ace High',
          description: isPremium ? 'Royal Cards' : 'Lucky Strike'
        };
      case 20:
        return {
          emoji: isPremium ? '💎' : '🎰', // Diamond / Slot machine
          cardRef: 'Double Down',
          description: isPremium ? 'Precious Gems' : 'Jackpot'
        };
      case 30:
        return {
          emoji: isPremium ? '👑' : '🪙', // Crown / Coin
          cardRef: 'Triple Seven',
          description: isPremium ? 'Royal Treasury' : 'Golden Coins'
        };
      case 40:
        return {
          emoji: isPremium ? '⭐' : '🍀', // Star / Four-leaf clover
          cardRef: 'Four of a Kind',
          description: isPremium ? 'Legendary Star' : 'Lucky Clover'
        };
      case 50:
        return {
          emoji: isPremium ? '🏆' : '🎊', // Trophy / Party popper
          cardRef: 'Royal Flush',
          description: isPremium ? 'Champion Trophy' : 'Grand Celebration'
        };
      default:
        return {
          emoji: '🎁',
          cardRef: 'High Card',
          description: 'Reward'
        };
    }
  };

  const RewardBox = ({ tier, isPremium = false, isUnlocked = false }: { tier: PassTier; isPremium?: boolean; isUnlocked?: boolean }) => {
    const hasReward = isPremium ? tier.premiumReward : tier.freeReward;
    if (!hasReward) {
      // Show empty progression slots for non-reward tiers
      return (
        <div className="relative w-32 h-32 rounded-3xl border-2 border-gray-800 bg-gray-900/30 flex items-center justify-center opacity-40">
          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-500">{tier.tier}</span>
          </div>
        </div>
      );
    }

    const isClaimed = !isPremium && claimedTiers.includes(tier.tier);
    
    const canClaim = isPremium ? 
      (isUnlocked && isUserPremium) : 
      (isUnlocked && !isClaimed);

    const rewardTheme = getRewardTheme(tier.tier, isPremium);
    
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
        className={`relative w-32 h-32 rounded-3xl border-2 flex items-center justify-center ${bgStyle} ${
          canClaim ? 'cursor-pointer hover:scale-105' : ''
        } ${isClaimed ? 'bg-green-600/30 border-green-500' : ''}`}
        style={glowStyle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: tier.tier * 0.1 }}
        onClick={() => canClaim && handleClaimTier(tier.tier, isPremium)}
        whileHover={canClaim ? { scale: 1.05 } : {}}
        whileTap={canClaim ? { scale: 0.95 } : {}}
      >
        {/* Reward Content */}
        <div className="text-center">
          {isClaimed ? (
            <div className="flex flex-col items-center">
              <img 
                src={claimedChestIcon} 
                alt="Claimed reward" 
                className="w-12 h-12 filter drop-shadow-lg mb-1"
              />
              <span className="text-xs text-green-400 font-bold">Claimed</span>
            </div>
          ) : canClaim ? (
            <div className="flex flex-col items-center animate-pulse">
              <div className="text-4xl mb-1">{rewardTheme.emoji}</div>
              <span className="text-xs text-white font-bold">{rewardTheme.cardRef}</span>
              <span className="text-xs text-white/70">{rewardTheme.description}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-70">
              <img 
                src={chestIcon} 
                alt="Locked reward" 
                className="w-10 h-10 filter drop-shadow-lg mb-1"
              />
              <span className="text-xs text-gray-400">Tier {tier.tier}</span>
              <span className="text-xs text-gray-500">{rewardTheme.cardRef}</span>
            </div>
          )}
        </div>
        
        {/* Decorative elements for special tiers */}
        {hasReward && (
          <>
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
            
            {/* Special tier badge */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs px-2 py-1 rounded-full font-bold">
              Lv.{tier.tier}
            </div>
          </>
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
        <div className="space-y-4 mb-8">
          {BATTLE_PASS_TIERS.map((tier) => {
            const isUnlocked = userLevel >= tier.tier;
            const hasRewards = tier.freeReward || tier.premiumReward;
            
            return (
            <motion.div
              key={tier.tier}
              className={`grid grid-cols-2 gap-6 ${!isUnlocked ? 'opacity-50' : ''} ${
                hasRewards ? 'p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/30' : 'py-2'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: tier.tier * 0.02 }}
            >
              {/* Free Reward */}
              <div className="relative flex justify-center">
                <RewardBox tier={tier} isPremium={false} isUnlocked={isUnlocked} />
              </div>
              
              {/* Premium Reward */}
              <div className="relative flex justify-center">
                <RewardBox tier={tier} isPremium={true} isUnlocked={isUnlocked} />
              </div>
              
              {/* Special tier indicator */}
              {hasRewards && (
                <div className="col-span-2 text-center mt-2">
                  <span className="text-sm font-bold text-purple-400">🎯 Reward Tier {tier.tier} 🎯</span>
                </div>
              )}
            </motion.div>);
          })}
        </div>

        {/* Padding bottom for sticky button */}
        <div className="pb-24"></div>
      </div>

      {/* Sticky Bottom Button - Only show for non-premium users */}
      {!isUserPremium && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-black/90 backdrop-blur-md border-t border-gray-800">
          <motion.button
            onClick={handleUnlockPremium}
            className="w-full bg-white text-black font-bold text-lg py-4 rounded-2xl hover:bg-gray-100 transition-colors shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-unlock-premium-rewards"
          >
            Unlock premium rewards
          </motion.button>
        </div>
      )}

      {/* Reward Animation Modal */}
      {showRewardAnimation && lastReward && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowRewardAnimation(false)}
        >
          <motion.div
            className="flex items-center space-x-4"
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.6 }}
          >
            <motion.div
              className="text-6xl font-black text-white"
              animate={{
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity
              }}
            >
              +{lastReward.amount}
            </motion.div>
            
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              {lastReward.type === 'coins' ? (
                <Coin size={64} glow />
              ) : (
                <Gem className="w-16 h-16" />
              )}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}