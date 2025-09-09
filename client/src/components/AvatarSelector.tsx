import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AVAILABLE_AVATARS, type Avatar } from '@/data/avatars';
import { useUserStore } from '@/store/user-store';
import { useToast } from '@/hooks/use-toast';

interface AvatarSelectorProps {
  currentAvatarId?: string;
  onAvatarSelect?: (avatarId: string) => void;
}

export default function AvatarSelector({ currentAvatarId, onAvatarSelect }: AvatarSelectorProps) {
  const [selectedId, setSelectedId] = useState(currentAvatarId || 'face-with-tears-of-joy');
  const [isUpdating, setIsUpdating] = useState(false);
  const updateUser = useUserStore((state) => state.updateUser);
  const { toast } = useToast();

  const handleAvatarClick = async (avatar: Avatar) => {
    setSelectedId(avatar.id);
    
    // Sauvegarder immédiatement lors du clic
    if (avatar.id !== currentAvatarId) {
      setIsUpdating(true);
      try {
        updateUser({ selectedAvatarId: avatar.id });
        // Avatar changé silencieusement
        if (onAvatarSelect) {
          onAvatarSelect(avatar.id);
        }
      } catch (error) {
        // Erreur silencieuse
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
        {AVAILABLE_AVATARS.map(avatar => (
          <motion.div
            key={avatar.id}
            className={`cursor-pointer rounded-2xl p-4 border-2 transition-all ${
              selectedId === avatar.id 
                ? 'border-accent-green bg-accent-green/10 shadow-lg' 
                : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAvatarClick(avatar)}
            data-testid={`avatar-option-${avatar.id}`}
          >
            <div className="aspect-square relative">
              <img 
                src={avatar.image} 
                alt={avatar.name}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {isUpdating && (
        <div className="flex justify-center pt-4">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 text-accent-green">
              <div className="w-4 h-4 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
              <span className="text-sm">Sauvegarde...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}