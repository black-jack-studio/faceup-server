import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trophy, Users, UserPlus } from "lucide-react";
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
import AddFriendModal from "@/components/AddFriendModal";
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
import crownImage from "@assets/crown_3d (1)_1758398209351.png";

export default function Profile() {
  const [, navigate] = useLocation();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const [isCardBackDialogOpen, setIsCardBackDialogOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
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

  // Query pour récupérer la liste d'amis
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
    select: (response: any) => response?.friends || [],
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
    
  // Obtenir le dos de carte actuellement sélectionné
  const currentCardBackId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId;
  const currentCardBack = currentCardBackId && currentCardBackId !== 'default' 
    ? userCardBacks.find((ucb: UserCardBack) => ucb.cardBack?.id === currentCardBackId)?.cardBack
    : null;

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">

        {/* User Info */}
        <motion.div
          className="text-center mb-8 pt-12"
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
              <button className="group bg-white rounded-full p-1.5 shadow-lg hover:scale-110 transition-transform" data-testid="button-edit-username">
                <Edit className="w-3 h-3 text-gray-800" />
              </button>
            </ChangeUsernameModal>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Crown className="w-5 h-5 text-[#60A5FA]" />
              <p className="text-[#60A5FA] font-bold text-lg">
                Level {currentLevel}
              </p>
            </div>
            <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-3">
              <motion.div 
                className="bg-gradient-to-r from-[#60A5FA] to-blue-400 h-full rounded-full halo"
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

        {/* Card Back Selection & Friends - Side by Side */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="grid grid-cols-2 gap-6">
            {/* Card Back Selection - Reduced Width */}
            <div>
              <Dialog open={isCardBackDialogOpen} onOpenChange={setIsCardBackDialogOpen}>
                <DialogTrigger asChild>
                  <motion.button
                    className="w-full bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center hover:bg-white/10 transition-all h-full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid="button-card-back-selector"
                  >
                    <div className="relative flex flex-col items-center justify-center h-full py-2">
                      <div className="relative z-10 w-20 h-28 mx-auto mb-4">
                        <OffsuitCard
                          rank="A"
                          suit="spades"
                          faceDown={true}
                          size="sm"
                          cardBackUrl={currentCardBack?.imageUrl || null}
                          className="w-full h-auto"
                        />
                      </div>
                      <p className="relative z-20 text-sm font-semibold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)] text-center">
                        {currentCardBack?.name || 'Classic'}
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
                            ? 'bg-[#60A5FA]/20 border-2 border-[#60A5FA]' 
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
                            ? 'bg-[#60A5FA]/20 border-2 border-[#60A5FA]' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                        onClick={() => handleCardBackModalSelect(userCardBack.cardBack.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid={`modal-card-back-${userCardBack.cardBack.id}`}
                      >
                        {/* Utilisation exacte de la même logique que dans PlayingCard */}
                        <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center">
                          <div className="relative w-full h-full">
                            <div 
                              className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-100 to-gray-200"
                              style={{ borderRadius: 16 }}
                            >
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
            
        {/* Friends Section - Same Height */}
            <motion.button
              onClick={() => navigate("/friends")}
              className="bg-white/5 hover:bg-white/10 rounded-2xl p-6 border border-white/10 backdrop-blur-sm h-full flex flex-col transition-all cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="button-friends-section"
            >
              <div className="mb-6">
                <h3 className="text-sm font-bold text-white">Friends</h3>
              </div>
              
              <div className="flex-1 flex flex-col justify-start">
                {isLoadingFriends ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-white/10 rounded-full animate-pulse" />
                        <div className="flex-1 h-3 bg-white/10 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-white/50 text-sm">No friends yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-40 overflow-y-auto">
                    {friends.slice(0, 3).map((friend: any, index: number) => {
                      const avatar = friend.selectedAvatarId ? getAvatarById(friend.selectedAvatarId) : getDefaultAvatar();
                      return (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                            {avatar?.image ? (
                              <img 
                                src={avatar.image} 
                                alt={`${friend.username} avatar`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                                <span className="text-white text-xs font-bold">
                                  {friend.username[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 flex items-center">
                            <p className="text-white text-sm font-medium truncate leading-none">{friend.username}</p>
                          </div>
                          {friend.membershipType === 'premium' && (
                            <img src={crownImage} alt="Premium" className="w-3 h-3 flex-shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    {friends.length > 3 && (
                      <p className="text-white/50 text-xs text-center pt-1">+{friends.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>
            </motion.button>
          </div>
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
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <img src={trophyIcon} alt="Trophy" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-accent-gold mb-2" data-testid="stat-wins">
                {(stats as any)?.handsWon || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Hands Won</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <img src={chartIcon} alt="Chart" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-blue-400 mb-2" data-testid="stat-winrate">
                {(stats as any)?.handsWon ? (((stats as any).handsWon / ((stats as any).handsPlayed || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/80 font-semibold">Win Rate</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <img src={bullseyeIcon} alt="Bullseye" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-red-400 mb-2" data-testid="stat-games-played">
                {(stats as any)?.handsPlayed || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Total Games Played</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
              <img src={spadeIcon} alt="Spade" className="w-8 h-8 mb-3" />
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
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                <img src={fireIcon} alt="Fire" className="w-8 h-8 mb-3" />
                <p className="text-3xl font-black text-white mb-2" data-testid="stat-current-streak">
                  {user?.currentStreak21 || 0}
                </p>
                <p className="text-sm text-white/80 font-semibold">Current Streak</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                <img src={crownIcon} alt="Crown" className="w-8 h-8 mb-3" />
                <p className="text-3xl font-black text-white mb-2" data-testid="stat-max-streak">
                  {user?.maxStreak21 || 0}
                </p>
                <p className="text-sm text-white/80 font-semibold">Best Streak</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                <img src={trophyWinsIcon} alt="Trophy" className="w-8 h-8 mb-3" />
                <p className="text-3xl font-black text-white mb-2" data-testid="stat-streak-wins">
                  {user?.totalStreakWins || 0}
                </p>
                <p className="text-sm text-white/80 font-semibold">Streak Wins</p>
              </div>
              
              <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm flex flex-col items-center justify-center text-center">
                <img src={moneyBagIcon} alt="Money Bag" className="w-8 h-8 mb-3" />
                <p className="text-3xl font-black text-white mb-2" data-testid="stat-streak-earnings">
                  {(user?.totalStreakEarnings || 0).toLocaleString()}
                </p>
                <p className="text-sm text-white/80 font-semibold">Streak Earnings</p>
              </div>
            </div>
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