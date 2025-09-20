import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AVAILABLE_AVATARS, type Avatar } from '@/data/avatars';
import { useUserStore } from '@/store/user-store';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Gem, Lock } from 'lucide-react';

interface AvatarSelectorProps {
  currentAvatarId?: string;
  onAvatarSelect?: (avatarId: string) => void;
}

export default function AvatarSelector({ currentAvatarId, onAvatarSelect }: AvatarSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentAvatarId || 'face-with-tears-of-joy');
  const [isUpdating, setIsUpdating] = useState(false);
  const updateUser = useUserStore((state) => state.updateUser);
  const user = useUserStore((state) => state.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's owned avatars
  const { data: avatarData, isLoading: avatarsLoading } = useQuery({
    queryKey: ['/api/user/avatars'],
    enabled: !!user?.id
  });

  // Purchase avatar mutation
  const purchaseAvatarMutation = useMutation<any, Error, number>({
    mutationFn: async (avatarIndex: number) => {
      const response = await apiRequest(`/api/avatars/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarIndex })
      });
      return response;
    },
    onSuccess: (data: any, avatarIndex: number) => {
      // Update user gems in store
      if (user) {
        updateUser({ gems: data.remainingGems });
      }
      
      // Refresh avatar data
      queryClient.invalidateQueries({ queryKey: ['/api/user/avatars'] });
      
      toast({
        title: "Avatar purchased!",
        description: `You now own this avatar. ${data.remainingGems} gems remaining.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Could not purchase avatar",
        variant: "destructive"
      });
    }
  });

  const ownedAvatars = new Set((avatarData as any)?.ownedAvatars || []);
  const freeAvatarCount = (avatarData as any)?.freeCount || 28;

  const handleAvatarClick = async (avatar: Avatar, avatarIndex: number) => {
    const isOwned = ownedAvatars.has(avatarIndex.toString());
    
    if (isOwned) {
      // User owns this avatar, select it
      setSelectedId(avatar.id);
      
      if (avatar.id !== currentAvatarId) {
        setIsUpdating(true);
        try {
          updateUser({ selectedAvatarId: avatar.id });
          if (onAvatarSelect) {
            onAvatarSelect(avatar.id);
          }
        } catch (error) {
          // Silent error
        } finally {
          setIsUpdating(false);
        }
      }
    } else {
      // User doesn't own this avatar, try to purchase it
      if (avatarIndex >= freeAvatarCount) {
        // Check if user has enough gems
        if ((user?.gems || 0) >= 10) {
          purchaseAvatarMutation.mutate(avatarIndex);
        } else {
          toast({
            title: "Not enough gems",
            description: "You need 10 gems to purchase this avatar",
            variant: "destructive"
          });
        }
      }
    }
  };

  if (avatarsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#60A5FA]/30 border-t-[#60A5FA] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {AVAILABLE_AVATARS.map((avatar, avatarIndex) => {
          const isOwned = ownedAvatars.has(avatarIndex.toString());
          const isFree = avatarIndex < freeAvatarCount;
          const isLocked = !isOwned && !isFree;
          const variables = purchaseAvatarMutation.variables as number | undefined;
          const isPurchasing = purchaseAvatarMutation.isPending && variables === avatarIndex;
          
          return (
            <motion.div
              key={avatar.id}
              className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative ${
                selectedId === avatar.id && isOwned
                  ? 'border-[#60A5FA] bg-[#60A5FA]/10 shadow-lg' 
                  : isLocked
                  ? 'border-white/10 bg-white/5 hover:border-white/20'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
              whileHover={{ scale: isLocked ? 1.02 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAvatarClick(avatar, avatarIndex)}
              data-testid={`avatar-option-${avatar.id}`}
            >
              <div className="aspect-square relative">
                <img 
                  src={avatar.image} 
                  alt={avatar.name}
                  className={`w-full h-full object-contain rounded-xl transition-all ${
                    isLocked ? 'brightness-75 contrast-75' : ''
                  }`}
                />
                
                {/* Price indicator for locked avatars */}
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isPurchasing ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <div className="flex items-center space-x-1 text-white text-sm font-bold drop-shadow-lg">
                        <span>10</span>
                        <Gem className="w-4 h-4 text-[#B79CFF]" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Selected indicator */}
                {selectedId === avatar.id && isOwned && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#60A5FA] rounded-full border-2 border-gray-900 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {isUpdating && (
        <div className="flex justify-center pt-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-[#60A5FA]">
              <div className="w-4 h-4 border-2 border-[#60A5FA]/30 border-t-[#60A5FA] rounded-full animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Gems info */}
      <div className="text-center text-sm text-gray-400">
        <div className="flex items-center justify-center space-x-2">
          <Gem className="w-4 h-4 text-[#B79CFF]" />
          <span>You have {user?.gems || 0} gems</span>
        </div>
        <p className="mt-1">First {freeAvatarCount} avatars are free • Others cost 10 gems each</p>
      </div>
    </div>
  );
}