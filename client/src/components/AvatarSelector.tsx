import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AVAILABLE_AVATARS, type Avatar } from '@/data/avatars';
import { useUserStore } from '@/store/user-store';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { FaGem } from 'react-icons/fa';

interface AvatarSelectorProps {
  currentAvatarId?: string;
  onAvatarSelect?: (avatarId: string) => void;
}

interface OwnedAvatarsResponse {
  ownedAvatars: string[];
  freeAvatars: string[];
  purchasedAvatars: string[];
}

interface PurchaseAvatarResponse {
  success: boolean;
  avatarId: string;
  remainingGems: number;
  ownedAvatars: string[];
}

export default function AvatarSelector({ currentAvatarId, onAvatarSelect }: AvatarSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentAvatarId || 'face-with-tears-of-joy');
  const [isUpdating, setIsUpdating] = useState(false);
  const updateUser = useUserStore((state) => state.updateUser);
  const user = useUserStore((state) => state.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch owned avatars
  const { data: ownedData, refetch } = useQuery<OwnedAvatarsResponse>({
    queryKey: ['/api/user/owned-avatars'],
    enabled: !!user
  });

  // Purchase avatar mutation
  const purchaseAvatarMutation = useMutation({
    mutationFn: async (avatarId: string): Promise<PurchaseAvatarResponse> => {
      const response = await apiRequest('POST', '/api/avatars/purchase', { avatarId });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Avatar acheté !",
        description: `L'avatar a été ajouté à votre collection.`,
      });
      refetch(); // Refresh owned avatars
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur d'achat",
        description: error.message || "Impossible d'acheter cet avatar.",
        variant: "destructive",
      });
    }
  });

  const isAvatarOwned = (avatarId: string, index: number): boolean => {
    // First 28 avatars are free for everyone
    if (index < 28) return true;
    
    // Check if user owns this avatar
    return ownedData?.ownedAvatars.includes(avatarId) || false;
  };

  const handleAvatarClick = async (avatar: Avatar, index: number) => {
    const owned = isAvatarOwned(avatar.id, index);
    
    if (!owned) {
      // Try to purchase the avatar
      if (!user || (user.gems || 0) < 10) {
        toast({
          title: "Gemmes insuffisantes",
          description: "Vous avez besoin de 10 gemmes pour acheter cet avatar.",
          variant: "destructive",
        });
        return;
      }
      
      purchaseAvatarMutation.mutate(avatar.id);
      return;
    }
    
    // Avatar is owned, select it
    setSelectedId(avatar.id);
    
    // Save immediately upon click
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
  };

  const handleSaveAvatar = async () => {
    if (selectedId === currentAvatarId) return;
    
    setIsUpdating(true);
    try {
      updateUser({ selectedAvatarId: selectedId });
      // Avatar mis à jour silencieusement
      if (onAvatarSelect) {
        onAvatarSelect(selectedId);
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {AVAILABLE_AVATARS.map((avatar, index) => {
          const owned = isAvatarOwned(avatar.id, index);
          const isPurchasing = purchaseAvatarMutation.isPending && purchaseAvatarMutation.variables === avatar.id;
          
          return (
            <motion.div
              key={avatar.id}
              className={`cursor-pointer rounded-2xl p-4 border-2 transition-all relative ${
                selectedId === avatar.id 
                  ? 'border-[#60A5FA] bg-[#60A5FA]/10 shadow-lg' 
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              } ${!owned ? 'opacity-60' : ''}`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAvatarClick(avatar, index)}
              data-testid={`avatar-option-${avatar.id}`}
            >
              <div className="aspect-square relative">
                <img 
                  src={avatar.image} 
                  alt={avatar.name}
                  className={`w-full h-full object-contain rounded-xl ${!owned ? 'grayscale' : ''}`}
                />
                {!owned && !isPurchasing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <div className="flex items-center space-x-1 bg-black/70 rounded-full px-2 py-1">
                      <FaGem className="w-3 h-3 text-purple-400" />
                      <span className="text-white text-xs font-bold">10</span>
                    </div>
                  </div>
                )}
                {isPurchasing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                    <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
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
              <span className="text-sm">Sauvegarde...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}