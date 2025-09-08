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

  const handleAvatarClick = (avatar: Avatar) => {
    setSelectedId(avatar.id);
    if (onAvatarSelect) {
      onAvatarSelect(avatar.id);
    }
  };

  const handleSaveAvatar = async () => {
    if (selectedId === currentAvatarId) return;
    
    setIsUpdating(true);
    try {
      updateUser({ selectedAvatarId: selectedId });
      toast({
        title: "Avatar mis à jour",
        description: "Votre nouvel avatar a été sauvegardé !",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'avatar",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const categories = ['happy', 'smug', 'cool', 'angry', 'neutral'] as const;
  const avatarsByCategory = categories.reduce((acc, category) => {
    acc[category] = AVAILABLE_AVATARS.filter(avatar => avatar.category === category);
    return acc;
  }, {} as Record<string, Avatar[]>);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Choisissez votre avatar</h2>
        <p className="text-white/60">Votre émoticône apparaîtra dans les parties de jeu</p>
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryAvatars = avatarsByCategory[category];
          if (categoryAvatars.length === 0) return null;
          
          return (
            <div key={category} className="space-y-3">
              <h3 className="text-lg font-semibold text-white capitalize">
                {category === 'happy' ? 'Joyeux' :
                 category === 'smug' ? 'Narquois' :
                 category === 'cool' ? 'Cool' :
                 category === 'angry' ? 'En colère' : 'Neutre'}
              </h3>
              
              <div className="grid grid-cols-4 gap-3">
                {categoryAvatars.map(avatar => (
                  <motion.div
                    key={avatar.id}
                    className={`cursor-pointer rounded-2xl p-3 border-2 transition-all ${
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
                    <p className="text-xs text-center text-white/80 mt-2 leading-tight">
                      {avatar.name}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedId !== currentAvatarId && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSaveAvatar}
            disabled={isUpdating}
            className="bg-gradient-to-r from-accent-green to-emerald-400 hover:from-accent-green/90 hover:to-emerald-400/90 text-ink font-bold px-8 py-3 rounded-2xl"
            data-testid="button-save-avatar"
          >
            {isUpdating ? 'Sauvegarde...' : 'Sauvegarder l\'avatar'}
          </Button>
        </div>
      )}
    </div>
  );
}