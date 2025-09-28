import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Users, X } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import AddFriendModal from "@/components/AddFriendModal";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getRankForChips } from "@/ranks/useRank";
import chartIcon from "@assets/chart_increasing_3d_1757365668417.png";
import bullseyeIcon from "@assets/bullseye_3d_1757365889861.png";
import coinImage from "@assets/coins_1757366059535.png";

export default function Friends() {
  const [, navigate] = useLocation();
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [removingFriends, setRemovingFriends] = useState<Set<string>>(new Set());
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
                    <div className="flex items-center space-x-4">
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
                        
                        {/* Friend Stats */}
                        <div className="space-y-1">
                          {/* Games and Accuracy */}
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <img src={bullseyeIcon} alt="Hands" className="w-4 h-4" />
                              <span className="text-sm text-white/70" data-testid={`friend-games-${friend.id}`}>
                                {(friend as any).totalGamesPlayed?.toLocaleString() || '0'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <img src={chartIcon} alt="Accuracy" className="w-4 h-4" />
                              <span className="text-sm text-white/70" data-testid={`friend-winrate-${friend.id}`}>
                                {(friend as any).winRate || 0}%
                              </span>
                            </div>
                          </div>
                          
                          {/* Level and Coins */}
                          <div className="flex items-center space-x-5">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-white/50">Lvl</span>
                              <span className="text-sm font-semibold text-white" data-testid={`friend-level-${friend.id}`}>
                                {friend.level || 1}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <img src={coinImage} alt="Coins" className="w-4 h-4" />
                              <span className="text-sm font-semibold text-white" data-testid={`friend-coins-${friend.id}`}>
                                {(friend as any).coins?.toLocaleString() || '0'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Remove Friend Button */}
                      <motion.button
                        onClick={() => handleRemoveFriend(friend.id, friend.username)}
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

    </div>
  );
}