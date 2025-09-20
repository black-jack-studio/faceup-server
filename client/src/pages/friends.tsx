import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, UserPlus, Users } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import AddFriendModal from "@/components/AddFriendModal";
import { PremiumCrown } from "@/components/ui/PremiumCrown";

export default function Friends() {
  const [, navigate] = useLocation();
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const user = useUserStore((state) => state.user);

  // Fetch user's friends
  const { data: friends = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
    select: (response: any) => response?.friends || [],
  });

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
                className="w-10 h-10 bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
                data-testid="button-add-friend"
              >
                <UserPlus className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-ink border-white/20">
              <DialogTitle className="text-white">Add Friend</DialogTitle>
              <AddFriendModal onClose={() => setIsAddFriendModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </motion.div>
      </header>

      {/* Friends List */}
      <div className="px-6 pb-20">
        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-white flex items-center mb-6">
            <Users className="w-6 h-6 mr-2" />
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
                    className="bg-white/5 rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
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
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-white font-semibold truncate" data-testid={`friend-username-${friend.id}`}>
                            {friend.username}
                          </p>
                          {friend.membershipType === 'premium' && (
                            <PremiumCrown size={16} />
                          )}
                        </div>
                        <p className="text-white/50 text-sm">Level {friend.level || 1}</p>
                      </div>

                      {/* Friend Stats */}
                      <div className="text-right">
                        <div className="flex items-center space-x-1 mb-1">
                          <span className="text-xs text-white/50">Coins</span>
                          <span className="text-sm font-semibold text-accent-gold" data-testid={`friend-coins-${friend.id}`}>
                            {friend.coins?.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs text-white/50">XP</span>
                          <span className="text-sm font-semibold text-blue-400" data-testid={`friend-xp-${friend.id}`}>
                            {friend.xp?.toLocaleString() || '0'}
                          </span>
                        </div>
                      </div>
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