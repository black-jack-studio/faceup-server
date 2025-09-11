import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { cardBacks, CardBack } from "@/lib/card-backs";
import { useToast } from "@/hooks/use-toast";
import { Lock } from "lucide-react";
import OffsuitCard from "@/components/PlayingCard";

interface CardBackSelectorProps {
  currentCardBackId: string;
  onCardBackSelect?: () => void;
}

export default function CardBackSelector({ currentCardBackId, onCardBackSelect }: CardBackSelectorProps) {
  const [selectedCardId, setSelectedCardId] = useState(currentCardBackId);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateUser = useUserStore((state) => state.updateUser);
  const { balance } = useChipsStore();

  // Query pour récupérer les cartes possédées par l'utilisateur
  const { data: ownedCardBacks = [] } = useQuery({
    queryKey: ["/api/inventory/card-backs"],
  });

  const handleCardClick = async (cardBack: CardBack) => {
    const isOwned = isCardOwned(cardBack.id);
    
    if (!isOwned) {
      // Si la carte n'est pas possédée, essayer de l'acheter
      if (cardBack.price && balance >= cardBack.price) {
        handleBuyCard(cardBack);
      } else {
        toast({
          title: "Insufficient funds",
          description: `You need ${cardBack.price?.toLocaleString()} coins to buy this card.`,
          variant: "destructive",
        });
      }
      return;
    }
    
    // Si la carte est possédée, la sélectionner directement
    setSelectedCardId(cardBack.id);
    
    if (cardBack.id !== currentCardBackId) {
      setIsUpdating(true);
      try {
        updateUser({ selectedCardBackId: cardBack.id });
        // Carte changée silencieusement
        if (onCardBackSelect) {
          onCardBackSelect();
        }
      } catch (error) {
        // Erreur silencieuse
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Mutation pour acheter une carte
  const buyCardBackMutation = useMutation({
    mutationFn: async (cardBack: CardBack) => {
      const response = await fetch("/api/shop/buy-card-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardBackId: cardBack.id }),
      });
      if (!response.ok) throw new Error("Failed to buy card back");
      return response.json();
    },
    onSuccess: (_, cardBack) => {
      // Invalidate queries to refresh both inventory and user balance
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/card-backs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Automatically select the newly purchased card
      setSelectedCardId(cardBack.id);
      updateUser({ selectedCardBackId: cardBack.id });
      
      toast({
        title: "Card purchased and selected!",
        description: `You've successfully purchased and equipped ${cardBack.name}.`,
      });
      
      // Close the dialog
      if (onCardBackSelect) {
        onCardBackSelect();
      }
    },
    onError: () => {
      toast({
        title: "Purchase failed",
        description: "Failed to purchase card back. Please try again.",
        variant: "destructive",
      });
    },
  });


  const handleBuyCard = (cardBack: CardBack) => {
    if (!cardBack.price || balance >= cardBack.price) {
      buyCardBackMutation.mutate(cardBack);
    }
  };

  const isCardOwned = (cardId: string) => {
    return cardId === "classic" || (Array.isArray(ownedCardBacks) && ownedCardBacks.some((item: any) => item.itemId === cardId));
  };

  const canAffordCard = (price?: number) => {
    return !price || balance >= price;
  };

  return (
    <div className="space-y-6 w-full px-4">
      <div className="text-left mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Select Card Back</h2>
        <p className="text-white/60">Choose your preferred card design</p>
      </div>

      {/* Grille des cartes - style similaire aux avatars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 justify-items-start">
        {cardBacks.map((cardBack) => {
          const isOwned = isCardOwned(cardBack.id);
          const isSelected = selectedCardId === cardBack.id;
          const isCurrent = currentCardBackId === cardBack.id;
          const canAfford = canAffordCard(cardBack.price);

          return (
            <motion.div
              key={cardBack.id}
              className={`cursor-pointer rounded-xl p-2 border-2 transition-all flex items-center justify-center ${
                isSelected || isCurrent
                  ? 'border-accent-green shadow-lg shadow-accent-green/50' 
                  : isOwned
                  ? 'border-white/20 hover:border-white/40'
                  : canAfford
                  ? 'border-yellow-400/30 hover:border-yellow-400/50'
                  : 'border-red-500/30 opacity-60'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(cardBack)}
              data-testid={`card-back-${cardBack.id}`}
            >
              {/* Card preview */}
              <div className="w-24 sm:w-28 md:w-32 aspect-[3/4] relative grid place-items-center">
                <OffsuitCard
                  rank="A"
                  suit="spades"
                  faceDown={true}
                  size="xs"
                  className="block w-full h-auto"
                />
                  
                  {/* Status icons */}
                  
                {!isOwned && (
                  <div className="absolute -top-1 -left-1 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                    <Lock className="w-4 h-4 text-white" />
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