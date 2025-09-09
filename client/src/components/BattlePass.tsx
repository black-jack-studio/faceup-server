import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Clock, HelpCircle, Gift } from 'lucide-react';
import { useUserStore } from '@/store/user-store';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import XPBar from '@/components/XPBar';

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

// Define simplified Battle Pass tiers matching the new XP system (0-499 per level)
const BATTLE_PASS_TIERS: PassTier[] = [
  {
    tier: 1,
    xpRequired: 50,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'golden'
  },
  {
    tier: 2,
    xpRequired: 150,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'blue'
  },
  {
    tier: 3,
    xpRequired: 250,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'blue'
  },
  {
    tier: 4,
    xpRequired: 350,
    freeReward: true,
    premiumReward: true,
    premiumEffect: 'purple'
  },
  {
    tier: 5,
    xpRequired: 450,
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get claimed rewards from API
  const { data: claimedRewards = [] } = useQuery({
    queryKey: ['/api/battlepass/rewards'],
    enabled: !!user,
  }) as { data: any[] };
  
  // Mutation to claim rewards
  const claimRewardMutation = useMutation({
    mutationFn: async ({ tier, isPremium }: { tier: number; isPremium: boolean }) => {
      const response = await apiRequest('POST', '/api/battlepass/claim-reward', {
        tier,
        isPremium
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Refresh user data and rewards
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/battlepass/rewards'] });
      
      toast({
        title: "Récompense récupérée!",
        description: `Vous avez reçu ${data.reward.rewardAmount} ${data.reward.rewardType === 'coins' ? 'pièces' : 'gemmes'}!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de récupérer la récompense",
        variant: "destructive",
      });
    }
  });

  // Reload user data when Battle Pass opens to get fresh XP
  React.useEffect(() => {
    if (isOpen) {
      loadUser();
      // Invalidate queries to get fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  }, [isOpen, loadUser, queryClient]);
  
  // Listen to user store changes to update XP in real-time
  React.useEffect(() => {
    if (isOpen && user) {
      // Force component re-render when user data changes
      const interval = setInterval(() => {
        loadUser();
      }, 1000); // Check every second for updates
      
      return () => clearInterval(interval);
    }
  }, [isOpen, user, loadUser]);

  if (!user) return null;

  // Use new XP system - Always get fresh data from user store
  const currentLevelXP = user.currentLevelXP ?? 0;
  const currentLevel = user.level ?? 1;
  const progressPercentage = Math.min((currentLevelXP / 500) * 100, 100); // 500 XP par niveau
  

  // Calculate days and hours remaining (static for design)
  const daysRemaining = 22;
  const hoursRemaining = 4;

  const handleUnlockPremium = () => {
    navigate('/premium');
    onClose();
  };

  const getRewardContent = (tier: PassTier, isPremium: boolean) => {
    // Exemple de récompenses - à personnaliser selon vos besoins
    if (isPremium) {
      return {
        type: 'gems' as const,
        amount: tier.tier * 5 // 5, 10, 15, 20, 25 gems
      };
    } else {
      return {
        type: 'coins' as const,
        amount: tier.tier * 100 // 100, 200, 300, 400, 500 coins
      };
    }
  };

  const claimReward = (tier: PassTier, isPremium: boolean) => {
    claimRewardMutation.mutate({ tier: tier.tier, isPremium });
  };
  
  const isRewardClaimed = (tier: number, isPremium: boolean) => {
    return claimedRewards.some((reward: any) => 
      reward.tier === tier && reward.isPremium === isPremium
    );
  };

  const RewardBox = ({ tier, isPremium = false }: { tier: PassTier; isPremium?: boolean }) => {
    const hasReward = isPremium ? tier.premiumReward : tier.freeReward;
    if (!hasReward) return null;

    const isUnlocked = currentLevelXP >= tier.xpRequired;
    const isClaimed = isRewardClaimed(tier.tier, isPremium);
    const canClaim = isUnlocked && !isClaimed && (!isPremium || hasPremiumPass);
    const reward = getRewardContent(tier, isPremium);
    const isClaimingThisReward = claimRewardMutation.isPending;

    let glowStyle = {};
    let bgStyle = 'bg-gray-800 border-gray-700';
    
    if (isUnlocked && !isClaimed) {
      bgStyle = 'bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-green-600/50';
      glowStyle = {
        boxShadow: '0 0 20px rgba(34, 197, 94, 0.3), inset 0 0 15px rgba(34, 197, 94, 0.1)'
      };
    } else if (isClaimed) {
      bgStyle = 'bg-gradient-to-br from-gray-700/60 to-gray-800/60 border-gray-500/30';
    }

    if (isPremium && tier.premiumEffect && isUnlocked && !isClaimed) {
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
        className={`relative w-24 h-24 rounded-2xl border-2 flex flex-col items-center justify-center ${bgStyle}`}
        style={glowStyle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: tier.tier * 0.1 }}
      >
        {/* Reward content */}
        {isClaimed ? (
          <div className="text-center">
            <div className="w-6 h-6 mx-auto mb-1 bg-green-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <span className="text-xs text-white/60">Récupéré</span>
          </div>
        ) : isUnlocked ? (
          <div className="text-center">
            <Gift className="w-6 h-6 mx-auto mb-1 text-white" />
            <div className="text-xs text-white font-medium">
              {reward.amount}
            </div>
            <div className="text-xs text-white/60">
              {reward.type === 'coins' ? '🪙' : '💎'}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <HelpCircle className="w-6 h-6 mx-auto mb-1 text-white/40" />
            <div className="text-xs text-white/40">
              {tier.xpRequired} XP
            </div>
          </div>
        )}
        
        {/* Claim button */}
        {canClaim && (
          <Button
            size="sm"
            className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 h-6 rounded-full"
            onClick={() => claimReward(tier, isPremium)}
            disabled={isClaimingThisReward}
          >
            {isClaimingThisReward ? '...' : 'Récupérer'}
          </Button>
        )}
        
        {/* Stars decoration for premium */}
        {isPremium && tier.premiumEffect && (
          <>
            <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 fill-yellow-400" />
            <div className="absolute -top-2 -left-1 w-1 h-1 bg-yellow-400 rounded-full opacity-60" />
            <div className="absolute -bottom-1 -right-2 w-1.5 h-1.5 bg-yellow-400 rounded-full opacity-40" />
            <div className="absolute top-1 -left-2 w-1 h-1 bg-yellow-400 rounded-full opacity-50" />
          </>
        )}
        
        {!isPremium && isUnlocked && (
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

            {/* XP Progress with time remaining */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">{SEASON_NAME}</h2>
                <div className="flex items-center text-white/60 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{daysRemaining}d {hoursRemaining}h</span>
                </div>
              </div>
              <XPBar showLevel={true} className="" />
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
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
              {BATTLE_PASS_TIERS.map((tier) => {
                const isUnlocked = currentLevelXP >= tier.xpRequired;
                return (
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
                      <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-black ${
                        isUnlocked ? 'bg-green-600' : 'bg-gray-700'
                      }`}>
                        <span className="text-xs font-bold text-white">{tier.tier}</span>
                      </div>
                    </div>
                    
                    {/* Premium Reward */}
                    <div className="relative">
                      <RewardBox tier={tier} isPremium={true} />
                      <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center border-2 border-black ${
                        isUnlocked ? 'bg-yellow-600' : 'bg-gray-700'
                      }`}>
                        <span className="text-xs font-bold text-white">{tier.tier}</span>
                      </div>
                      {!hasPremiumPass && (
                        <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                          <div className="text-yellow-400 text-lg">🔒</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
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