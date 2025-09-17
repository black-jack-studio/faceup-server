import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trophy } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Gem, User } from "@/icons";
import CoinsBadge from "@/components/CoinsBadge";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { getCardBackById, getDefaultCardBack, UserCardBack, sortCardBacksByRarity, getRarityColor, getRarityDisplayName } from "@/lib/card-backs";
import AvatarSelector from "@/components/AvatarSelector";
import CardBackSelector from "@/components/card-back-selector";
import CardBackCollectionItem from "@/components/CardBackCollectionItem";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ChangeUsernameModal from "@/components/ChangeUsernameModal";
import OffsuitCard from "@/components/PlayingCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import keyIcon from "@assets/key_3d_1757364033839.png";
import shieldIcon from "@assets/shield_3d_1757364125393.png";
import signOutIcon from "@assets/outbox_tray_3d_1757364387965.png";
import barChartIcon from "@assets/bar_chart_3d_1757364609374.png";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import chartIcon from "@assets/chart_increasing_3d_1757365668417.png";
import bullseyeIcon from "@assets/bullseye_3d_1757365889861.png";
import spadeIcon from "@assets/spade_suit_3d_1757365941334.png";
import fireIcon from "@assets/fire_3d_1758055031099.png";
import moneyBagIcon from "@assets/money_bag_3d (1)_1758055144886.png";
import crownIcon from "@assets/crown_3d_1758055496784.png";
import trophyWinsIcon from "@assets/trophy_3d_1758055553692.png";

export default function Profile() {
  const [, navigate] = useLocation();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isCardBackDialogOpen, setIsCardBackDialogOpen] = useState(false);
  const [selectedCardBackId, setSelectedCardBackId] = useState<string | null>(null);
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const logout = useUserStore((state) => state.logout);
  const isPremium = user?.membershipType === "premium";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/stats/summary"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Query pour récupérer la collection de dos de cartes
  const { data: userCardBacks = [], isLoading: isLoadingCardBacks } = useQuery({
    queryKey: ["/api/user/card-backs"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  // Query pour récupérer le dos de carte sélectionné
  const { data: selectedCardBack } = useQuery({
    queryKey: ["/api/user/selected-card-back"],
    enabled: !!user,
    select: (response: any) => response?.data || null,
  });

  // Mutation pour changer le dos de carte sélectionné
  const updateSelectedCardBackMutation = useMutation({
    mutationFn: async (cardBackId: string) => {
      return await apiRequest("PATCH", "/api/user/selected-card-back", { 
        cardBackId 
      });
    },
    onSuccess: (_, cardBackId) => {
      // Mettre à jour le store local
      updateUser({ selectedCardBackId: cardBackId });
      
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["/api/user/selected-card-back"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Card back updated!",
        description: "Your selected card back has been updated successfully.",
        variant: "default",
      });
      
      setSelectedCardBackId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update card back",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setSelectedCardBackId(null);
    },
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSelectCardBack = (cardBackId: string) => {
    const currentSelectedId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId;
    if (cardBackId === currentSelectedId) return;
    
    setSelectedCardBackId(cardBackId);
    updateSelectedCardBackMutation.mutate(cardBackId);
  };

  const handleCardBackModalSelect = (cardBackId: string) => {
    const currentSelectedId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId;
    
    // Handle default card back selection
    if (cardBackId === 'default') {
      if (!currentSelectedId || currentSelectedId === 'default') return;
      setSelectedCardBackId('default');
      updateSelectedCardBackMutation.mutate('default');
      setIsCardBackDialogOpen(false);
      return;
    }
    
    if (cardBackId === currentSelectedId) return;
    
    setSelectedCardBackId(cardBackId);
    updateSelectedCardBackMutation.mutate(cardBackId);
    setIsCardBackDialogOpen(false); // Fermer le modal après sélection
  };


  const currentLevel = user?.level ?? 1;
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const levelProgress = (currentLevelXP / 500) * 100; // Progress percentage
  const xpToNextLevel = 500 - currentLevelXP;
  
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();
    
  const currentCardBack = user?.selectedCardBackId ? 
    getCardBackById(user.selectedCardBackId) : 
    getDefaultCardBack();

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mr-3 text-white hover:bg-white/10 rounded-xl p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-black text-white tracking-tight">Profile</h1>
          </div>
        </motion.div>

        {/* User Info */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Avatar */}
          <div className="flex items-center justify-center mb-6">
            {/* Avatar Selection */}
            <div className="relative inline-block">
              <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                <DialogTrigger asChild>
                  <button className="group relative" data-testid="button-change-avatar">
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mx-auto halo group-hover:scale-105 transition-transform duration-200">
                      {currentAvatar ? (
                        <img 
                          src={currentAvatar.image} 
                          alt={currentAvatar.name}
                          className="w-20 h-20 object-contain rounded-2xl"
                        />
                      ) : (
                        <span className="text-4xl font-black text-white">
                          {user?.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg group-hover:scale-110 transition-transform">
                      <Edit className="w-3 h-3 text-gray-800" />
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-ink border border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogTitle className="sr-only">Sélectionner un avatar</DialogTitle>
                  <AvatarSelector 
                    currentAvatarId={user?.selectedAvatarId || 'face-with-tears-of-joy'}
                    onAvatarSelect={() => setIsAvatarDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          <div className="flex items-center justify-center space-x-3 mb-2">
            <h2 className="text-2xl font-bold text-white" data-testid="profile-username">
              {user?.username}
            </h2>
            <ChangeUsernameModal>
              <button className="group p-1.5 hover:bg-white/10 rounded-lg transition-colors" data-testid="button-edit-username">
                <Edit className="w-4 h-4 text-white/60 hover:text-white transition-colors group-hover:scale-110" />
              </button>
            </ChangeUsernameModal>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Crown className="w-5 h-5 text-accent-green" />
              <p className="text-accent-green font-bold text-lg">
                Level {currentLevel}
              </p>
            </div>
            <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-3">
              <motion.div 
                className="bg-gradient-to-r from-accent-green to-emerald-400 h-full rounded-full halo"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1.2, delay: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">{(user?.currentLevelXP || 0).toLocaleString()} XP</span>
              <span className="text-white/70">{xpToNextLevel} to next level</span>
            </div>
          </div>
        </motion.div>

        {/* Card Back Selection - Compact Square */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Dialog open={isCardBackDialogOpen} onOpenChange={setIsCardBackDialogOpen}>
            <DialogTrigger asChild>
              <motion.button
                className="w-full bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center hover:bg-white/10 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-card-back-selector"
              >
                <div className="relative flex flex-col items-center">
                  <div className="relative z-10 w-20 h-28 mx-auto mb-3">
                    <OffsuitCard
                      rank="A"
                      suit="spades"
                      faceDown={true}
                      size="sm"
                      cardBackUrl={(!selectedCardBack?.selectedCardBackId || selectedCardBack?.selectedCardBackId === 'default') ? null : currentCardBack?.imageUrl}
                      className="w-full h-auto"
                    />
                  </div>
                  <p className="relative z-20 mt-2 text-sm font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)]">
                    {(!selectedCardBack?.selectedCardBackId || selectedCardBack?.selectedCardBackId === 'default') ? 'Classic' : currentCardBack?.name || 'Card Back'}
                  </p>
                </div>
              </motion.button>
            </DialogTrigger>
            
            <DialogContent className="bg-gray-900/95 border border-white/10 rounded-3xl p-6 max-w-md backdrop-blur-xl">
              <DialogTitle className="text-white font-bold text-lg mb-6 text-center">Select Card Back</DialogTitle>
              
              {isLoadingCardBacks ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-accent-green rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 max-h-80 overflow-y-auto p-2">
                  {/* Option par défaut */}
                  {(() => {
                    const isSelected = !(selectedCardBack?.selectedCardBackId || user?.selectedCardBackId) || (selectedCardBack?.selectedCardBackId || user?.selectedCardBackId) === 'default';
                    return (
                      <motion.button
                        key="default"
                        className={`relative p-2 rounded-xl transition-all aspect-[3/4] flex items-center justify-center ${
                          isSelected 
                            ? 'bg-accent-green/20 border-2 border-accent-green' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                        onClick={() => handleCardBackModalSelect('default')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid={`modal-card-back-default`}
                      >
                        {/* Use the same OffsuitCard component for consistency */}
                        <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
                          <OffsuitCard
                            rank="A"
                            suit="spades"
                            faceDown={true}
                            size="sm"
                            cardBackUrl={null}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </motion.button>
                    );
                  })()}
                  
                  {/* Cartes achetées */}
                  {sortCardBacksByRarity(userCardBacks).map((userCardBack: UserCardBack) => {
                    const isSelected = 
                      (selectedCardBack?.selectedCardBackId || user?.selectedCardBackId) === userCardBack.cardBack.id;
                    
                    return (
                      <motion.button
                        key={userCardBack.cardBack.id}
                        className={`relative p-2 rounded-xl transition-all aspect-[3/4] flex items-center justify-center ${
                          isSelected 
                            ? 'bg-accent-green/20 border-2 border-accent-green' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                        onClick={() => handleCardBackModalSelect(userCardBack.cardBack.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid={`modal-card-back-${userCardBack.cardBack.id}`}
                      >
                        {/* Affichage direct du dos de carte */}
                        <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
                          <img 
                            src={userCardBack.cardBack.imageUrl}
                            alt={userCardBack.cardBack.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              // Fallback to default SVG if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `
                                  <svg class="w-full h-full" viewBox="0 0 100 145">
                                    <defs>
                                      <linearGradient id="fallbackGradient" x1="0" y1="0" x2="1" y2="1">
                                        <stop offset="0%" stop-color="#E5E5E5" />
                                        <stop offset="50%" stop-color="#D1D1D1" />
                                        <stop offset="100%" stop-color="#C8C8C8" />
                                      </linearGradient>
                                    </defs>
                                    <rect x="0" y="0" width="100" height="145" rx="8" fill="url(#fallbackGradient)" />
                                  </svg>
                                `;
                              }
                            }}
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </motion.section>


        {/* Stats Cards */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
            <img src={barChartIcon} alt="Bar Chart" className="w-6 h-6 mr-3" />
            Game Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <img src={trophyIcon} alt="Trophy" className="w-8 h-8 mx-auto mb-3" />
              <p className="text-3xl font-black text-accent-gold mb-2" data-testid="stat-wins">
                {(stats as any)?.handsWon || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Hands Won</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <img src={chartIcon} alt="Chart" className="w-8 h-8 mx-auto mb-3" />
              <p className="text-3xl font-black text-blue-400 mb-2" data-testid="stat-winrate">
                {(stats as any)?.handsWon ? (((stats as any).handsWon / ((stats as any).handsPlayed || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/80 font-semibold">Win Rate</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <img src={bullseyeIcon} alt="Bullseye" className="w-8 h-8 mx-auto mb-3" />
              <p className="text-3xl font-black text-red-400 mb-2" data-testid="stat-games-played">
                {(stats as any)?.handsPlayed || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Total Games Played</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <img src={spadeIcon} alt="Spade" className="w-8 h-8 mx-auto mb-3" />
              <p className="text-3xl font-black text-accent-purple mb-2" data-testid="stat-blackjacks">
                {(stats as any)?.blackjacks || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Blackjacks</p>
            </div>
          </div>
        </motion.section>

        {/* 21 Streak Stats - Premium Only */}
        {isPremium && (
          <motion.section
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <img src={barChartIcon} alt="Bar Chart" className="w-6 h-6 mr-3" />
              21 Streak Stats
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
                <img src={fireIcon} alt="Fire" className="w-8 h-8 mx-auto mb-3" />
                <p className="text-3xl font-black text-red-400 mb-2" data-testid="stat-current-streak">
                  {user?.currentStreak21 || 0}
                </p>
                <p className="text-sm text-white/80 font-semibold">Current Streak</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
                <img src={crownIcon} alt="Crown" className="w-8 h-8 mx-auto mb-3" />
                <p className="text-3xl font-black text-yellow-400 mb-2" data-testid="stat-max-streak">
                  {user?.maxStreak21 || 0}
                </p>
                <p className="text-sm text-white/80 font-semibold">Best Streak</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
                <img src={trophyWinsIcon} alt="Trophy" className="w-8 h-8 mx-auto mb-3" />
                <p className="text-3xl font-black text-yellow-500 mb-2" data-testid="stat-streak-wins">
                  {user?.totalStreakWins || 0}
                </p>
                <p className="text-sm text-white/80 font-semibold">Streak Wins</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
                <img src={moneyBagIcon} alt="Money Bag" className="w-8 h-8 mx-auto mb-3" />
                <p className="text-3xl font-black text-amber-500 mb-2" data-testid="stat-streak-earnings">
                  {(user?.totalStreakEarnings || 0).toLocaleString()}
                </p>
                <p className="text-sm text-white/80 font-semibold">Streak Earnings</p>
              </div>
            </div>
            
            {/* Weekly Leaderboard Button */}
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <motion.button
                onClick={() => navigate("/leaderboard")}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-center transition-colors"
                data-testid="button-weekly-leaderboard"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="text-white font-bold">View Weekly Leaderboard</span>
              </motion.button>
            </motion.div>
        </motion.section>
        )}


        {/* Account Actions */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <div className="space-y-4">
            <ChangePasswordModal>
              <motion.button
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
                data-testid="button-change-password"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center space-x-2">
                  <img src={keyIcon} alt="Key" className="w-5 h-5" />
                  <span className="text-white font-bold">Change Password</span>
                </div>
              </motion.button>
            </ChangePasswordModal>
            
            <motion.button
              onClick={() => navigate("/privacy-settings")}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
              data-testid="button-privacy"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <img src={shieldIcon} alt="Shield" className="w-5 h-5" />
                <span className="text-white font-bold">Privacy Settings</span>
              </div>
            </motion.button>
            
            <motion.button
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-left transition-colors"
              onClick={handleLogout}
              data-testid="button-logout"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <img src={signOutIcon} alt="Sign Out" className="w-5 h-5" />
                <span className="text-red-400 font-bold">Sign Out</span>
              </div>
            </motion.button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}