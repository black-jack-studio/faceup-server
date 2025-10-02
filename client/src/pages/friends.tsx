import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Users, X, Copy, Check } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AddFriendModal from "@/components/AddFriendModal";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getRankForWins } from "@/ranks/useRank";
import chartIcon from "@assets/chart_increasing_3d_1757365668417.png";
import bullseyeIcon from "@assets/bullseye_3d_1757365889861.png";
import coinImage from "@assets/coins_1757366059535.png";
import trophyWinsIcon from "@assets/trophy_3d_1758055553692.png";

export default function Friends() {
  const [, navigate] = useLocation();
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [removingFriends, setRemovingFriends] = useState<Set<string>>(new Set());
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [isFriendStatsModalOpen, setIsFriendStatsModalOpen] = useState(false);
  const [isReferralCodeModalOpen, setIsReferralCodeModalOpen] = useState(false);
  const [isAddReferralCodeModalOpen, setIsAddReferralCodeModalOpen] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [copied, setCopied] = useState(false);
  const user = useUserStore((state) => state.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's friends
  const { data: friends = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
    select: (response: any) => response?.friends || [],
  });

  // Fetch pending friend requests count
  const { data: friendRequestsData, isError } = useQuery<any>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user,
    select: (response: any) => response?.requests || [],
  });

  const pendingRequestsCount = !isError && friendRequestsData ? friendRequestsData.length : 0;

  // Fetch referral info
  const { data: referralInfo } = useQuery<{
    referralCode: string;
    referralCount: number;
    hasReferrer: boolean;
    canEnterCode: boolean;
  }>({
    queryKey: ["/api/referral/info"],
    enabled: !!user,
    select: (response: any) => response,
  });

  // Mutation to submit referral code
  const submitReferralCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await apiRequest("POST", "/api/referral/submit-code", { code });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/info"] });
      toast({
        title: "Referral Code Accepted!",
        description: "Rewards will be distributed when you reach Moo Rookie rank (11 wins)",
      });
      setIsAddReferralCodeModalOpen(false);
      setReferralCodeInput("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit referral code",
        variant: "destructive",
      });
    },
  });

  // Copy referral code to clipboard
  const handleCopyReferralCode = async () => {
    if (referralInfo?.referralCode) {
      await navigator.clipboard.writeText(referralInfo.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  // Handle referral code submission
  const handleSubmitReferralCode = () => {
    if (referralCodeInput.trim().length === 6) {
      submitReferralCodeMutation.mutate(referralCodeInput.toUpperCase().trim());
    } else {
      toast({
        title: "Invalid Code",
        description: "Referral code must be 6 characters",
        variant: "destructive",
      });
    }
  };

  // Mutation to remove friend
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      // Start animation
      setRemovingFriends(prev => new Set(Array.from(prev).concat(friendId)));
      
      // Wait for animation to complete before making API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return await apiRequest("DELETE", "/api/friends/remove", { friendId });
    },
    onSuccess: (_, friendId) => {
      // Remove from animating set
      setRemovingFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend Removed",
        description: "Friend has been removed from your list.",
      });
    },
    onError: (error: any, friendId) => {
      // Remove from animating set on error
      setRemovingFriends(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
      
      toast({
        title: "Error",
        description: error.message || "Failed to remove friend.",
        variant: "destructive",
      });
    },
  });

  const handleRemoveFriend = (friendId: string, username: string) => {
    if (confirm(`Are you sure you want to remove ${username} from your friends?`)) {
      removeFriendMutation.mutate(friendId);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Header */}
      <header className="px-6 pt-12 pb-6">
        <motion.div 
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <h1 className="text-2xl font-bold text-white">Friends</h1>
          <Dialog open={isAddFriendModalOpen} onOpenChange={setIsAddFriendModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="relative w-10 h-10 bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                data-testid="button-add-friend"
              >
                <UserPlus className="w-5 h-5" />
                {pendingRequestsCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-lg animate-pulse" data-testid="notification-friend-requests">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </div>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-ink border-white/20 rounded-3xl">
              <DialogTitle className="text-white">Add Friend</DialogTitle>
              <AddFriendModal onClose={() => setIsAddFriendModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </motion.div>
      </header>

      {/* Friends List */}
      <div className="px-6 pb-20">
        {/* Referral Buttons */}
        <div className={referralInfo?.hasReferrer || !referralInfo?.canEnterCode ? "flex justify-center mb-6" : "grid grid-cols-2 gap-3 mb-6"}>
          {/* Add Referral Code Button - Only show if user can still enter a code */}
          {!referralInfo?.hasReferrer && referralInfo?.canEnterCode && (
            <Dialog open={isAddReferralCodeModalOpen} onOpenChange={setIsAddReferralCodeModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full bg-[#0B0B0F] hover:bg-[#0B0B0F] text-white hover:text-white border border-zinc-700 rounded-xl transition-none"
                  data-testid="button-add-referral-code"
                >
                  Add Referral Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md bg-zinc-900 border-zinc-800 rounded-2xl">
                <DialogTitle className="text-2xl font-bold text-white mb-4">Enter Referral Code</DialogTitle>
                <div className="space-y-4">
                  <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                    <p className="text-sm text-white/70 mb-2">
                      Enter a friend's referral code within 48 hours of creating your account to earn rewards!
                    </p>
                  </div>
                  
                  <Input
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className="bg-zinc-800 border-zinc-700 text-white uppercase text-center text-lg tracking-widest"
                    data-testid="input-referral-code"
                  />
                  <Button
                    onClick={handleSubmitReferralCode}
                    className="w-full bg-white hover:bg-white text-black hover:text-black border-0 rounded-xl"
                    disabled={submitReferralCodeMutation.isPending || referralCodeInput.length !== 6}
                    data-testid="button-submit-referral"
                  >
                    {submitReferralCodeMutation.isPending ? "Submitting..." : "Submit Code"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Referral Code Button */}
          <Dialog open={isReferralCodeModalOpen} onOpenChange={setIsReferralCodeModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className={`bg-white hover:bg-white text-[#15161A] hover:text-[#15161A] border-0 rounded-xl transition-none ${
                  referralInfo?.hasReferrer || !referralInfo?.canEnterCode ? "max-w-md w-full" : "w-full"
                }`}
                data-testid="button-view-referral-code"
              >
                Referral Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md bg-zinc-900 border-zinc-800 rounded-2xl">
              <DialogTitle className="text-2xl font-bold text-white mb-4">Your Referral Code</DialogTitle>
              <div className="space-y-4">
                {/* Referral Code Display */}
                <div className="p-6">
                  <p className="text-sm text-white/70 mb-3 text-center">Your Referral Code</p>
                  <div className="flex items-center justify-center space-x-3">
                    <span className="text-3xl font-bold text-white tracking-widest font-mono">
                      {referralInfo?.referralCode || "LOADING"}
                    </span>
                    <Button
                      onClick={handleCopyReferralCode}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/10"
                      data-testid="button-copy-referral-code"
                    >
                      {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </Button>
                  </div>
                  <p className="text-xs text-white/50 mt-3 text-center">
                    {referralInfo?.referralCount || 0} friend{referralInfo?.referralCount === 1 ? '' : 's'} referred
                  </p>
                </div>

                {/* Benefits List */}
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                  <h4 className="text-sm font-semibold text-white mb-3">Referral Benefits</h4>
                  <ul className="space-y-2 text-sm text-white/70">
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>Your friend gets <span className="text-white font-bold">10,000 coins</span> when reaching Moo Rookie (11 wins)</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>You get <span className="text-white font-bold">5,000 coins</span> when they reach Moo Rookie</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-white mr-2">•</span>
                      <span>They have <span className="text-white font-bold">48 hours</span> to enter your code after signing up</span>
                    </li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white mb-6">
            My Friends ({friends.length})
          </h2>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="bg-white/5 rounded-2xl p-4 border border-white/10"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="w-24 h-4 bg-white/10 rounded mb-2 animate-pulse" />
                      <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <div className="w-16 h-3 bg-white/10 rounded animate-pulse" />
                      <div className="w-12 h-3 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white/50" />
              </div>
              <p className="text-white/70 text-lg mb-2">No friends yet</p>
              <p className="text-white/50 text-sm">Add some friends to see their stats and connect!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {friends.map((friend: any, index: number) => {
                const avatar = friend.selectedAvatarId ? 
                  getAvatarById(friend.selectedAvatarId) : 
                  getDefaultAvatar();

                return (
                  <motion.div
                    key={friend.id}
                    className="py-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ 
                      opacity: removingFriends.has(friend.id) ? 0 : 1, 
                      x: removingFriends.has(friend.id) ? 300 : 0 
                    }}
                    exit={{ opacity: 0, x: 300 }}
                    transition={{ 
                      delay: removingFriends.has(friend.id) ? 0 : index * 0.1,
                      duration: removingFriends.has(friend.id) ? 0.3 : 0.4
                    }}
                    data-testid={`friend-entry-${friend.id}`}
                  >
                    <div 
                      className="flex items-center space-x-4 cursor-pointer hover:bg-white/5 rounded-xl p-2 -m-2 transition-colors"
                      onClick={() => {
                        setSelectedFriend(friend);
                        setIsFriendStatsModalOpen(true);
                      }}
                    >
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                        {avatar?.image ? (
                          <img 
                            src={avatar.image} 
                            alt={`${friend.username} avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {friend.username[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Friend Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="text-white font-semibold truncate" data-testid={`friend-username-${friend.id}`}>
                            {friend.username}
                          </p>
                          {friend.membershipType === 'premium' && (
                            <PremiumCrown size={16} />
                          )}
                        </div>
                        
                        {/* Friend Level */}
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-white/50">Lvl</span>
                          <span className="text-sm font-semibold text-white" data-testid={`friend-level-${friend.id}`}>
                            {friend.level || 1}
                          </span>
                        </div>
                      </div>

                      {/* Remove Friend Button */}
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFriend(friend.id, friend.username);
                        }}
                        className="flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors hover:text-red-300"
                        data-testid={`button-remove-friend-${friend.id}`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        disabled={removeFriendMutation.isPending}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Friend Stats Modal */}
      {selectedFriend && (
        <FriendStatsModal 
          friend={selectedFriend}
          open={isFriendStatsModalOpen}
          onClose={() => {
            setIsFriendStatsModalOpen(false);
            setSelectedFriend(null);
          }}
        />
      )}

    </div>
  );
}

// Friend Stats Modal Component
function FriendStatsModal({ 
  friend, 
  open, 
  onClose 
}: {
  friend: any;
  open: boolean;
  onClose: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const friendRank = getRankForWins((friend as any).totalWins || 0);
  const avatar = friend.selectedAvatarId ? 
    getAvatarById(friend.selectedAvatarId) : 
    getDefaultAvatar();

  // Handle touch events for swipe up
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const currentTouch = e.touches[0].clientY;
    const diff = touchStart - currentTouch;
    
    // If swipe up is more than 50px, expand the modal
    if (diff > 50) {
      setIsExpanded(true);
    }
    // If swipe down is more than 50px and modal is expanded, collapse it
    else if (diff < -50 && isExpanded) {
      setIsExpanded(false);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(0);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="friend-stats-modal">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        data-testid="modal-overlay"
      />
      
      {/* Bottom Sheet */}
      <div 
        className={`absolute inset-x-0 bottom-0 ${isExpanded ? 'h-[95vh]' : 'h-3/4'} rounded-t-3xl bg-zinc-950/95 backdrop-blur border-t border-white/10 shadow-2xl transform transition-all duration-300 ease-out`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        {/* Handle bar */}
        <div className="flex justify-center pt-4 pb-4">
          <div className="h-1.5 w-12 rounded-full bg-zinc-600" />
        </div>

        {/* Content */}
        <div className="px-6 pb-6 h-full overflow-y-auto">
          
          {/* Header with Avatar and Name */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
              {avatar?.image ? (
                <img 
                  src={avatar.image} 
                  alt={`${friend.username} avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-accent-purple to-accent-pink flex items-center justify-center">
                  <span className="text-white text-lg font-bold">
                    {friend.username[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-xl font-bold text-white">{friend.username}</h2>
                {friend.membershipType === 'premium' && (
                  <PremiumCrown size={20} />
                )}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-white/50">Lvl</span>
                <span className="text-sm font-semibold text-white">
                  {friend.level || 1}
                </span>
              </div>
            </div>
          </div>

          {/* Rank Section */}
          <div className="bg-zinc-900/80 rounded-2xl p-6 border border-white/10 mb-6">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Current Rank</h3>
            <div className="flex flex-col items-center">
              {friendRank.imgSrc ? (
                <img 
                  src={friendRank.imgSrc} 
                  alt={friendRank.name} 
                  className="h-16 w-16 object-contain drop-shadow-2xl mb-3" 
                />
              ) : friendRank.emoji ? (
                <span className="text-5xl drop-shadow-2xl mb-3">{friendRank.emoji}</span>
              ) : (
                <div className="h-16 w-16 bg-zinc-700 rounded-lg flex items-center justify-center mb-3">
                  <span className="text-zinc-400 text-lg">?</span>
                </div>
              )}
              <h4 className="text-xl font-bold text-white mb-2">{friendRank.name}</h4>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Coins */}
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <img src={coinImage} alt="Coins" className="w-5 h-5" />
                <span className="text-sm text-white/70">Coins</span>
              </div>
              <span className="text-lg font-bold text-white">
                {(friend as any).coins?.toLocaleString() || '0'}
              </span>
            </div>

            {/* Games Played */}
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <img src={bullseyeIcon} alt="Games" className="w-5 h-5" />
                <span className="text-sm text-white/70">Games</span>
              </div>
              <span className="text-lg font-bold text-white">
                {(friend as any).totalGamesPlayed?.toLocaleString() || '0'}
              </span>
            </div>

            {/* Win Rate */}
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <img src={chartIcon} alt="Win Rate" className="w-5 h-5" />
                <span className="text-sm text-white/70">Win Rate</span>
              </div>
              <span className="text-lg font-bold text-white">
                {(friend as any).winRate || 0}%
              </span>
            </div>

            {/* Hands Won */}
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-2">
                <img src={trophyWinsIcon} alt="Hands Won" className="w-5 h-5" />
                <span className="text-sm text-white/70">Hands Won</span>
              </div>
              <span className="text-lg font-bold text-white">
                {(friend as any).totalWins?.toLocaleString() || '0'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}