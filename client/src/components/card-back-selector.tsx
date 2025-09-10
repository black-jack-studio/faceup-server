import { useState } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { cardBacks, getCardBackById, getRarityColor, CardBack } from "@/lib/card-backs";
import { useToast } from "@/hooks/use-toast";
import { Check, Lock, ShoppingCart } from "lucide-react";

interface CardBackSelectorProps {
  currentCardBackId: string;
  onCardBackSelect?: () => void;
}

export default function CardBackSelector({ currentCardBackId, onCardBackSelect }: CardBackSelectorProps) {
  const [selectedCardId, setSelectedCardId] = useState(currentCardBackId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateUser = useUserStore((state) => state.updateUser);
  const { balance, deductBet } = useChipsStore();

  // Query pour récupérer les cartes possédées par l'utilisateur
  const { data: ownedCardBacks = [] } = useQuery({
    queryKey: ["/api/inventory/card-backs"],
  });

  // Mutation pour changer de carte
  const selectCardBackMutation = useMutation({
    mutationFn: async (cardBackId: string) => {
      const response = await fetch("/api/user/select-card-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardBackId }),
      });
      if (!response.ok) throw new Error("Failed to select card back");
      return response.json();
    },
    onSuccess: () => {
      updateUser({ selectedCardBackId: selectedCardId });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      toast({
        title: "Card changed!",
        description: "Your selected card back has been updated.",
      });
      onCardBackSelect?.();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to change card back. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour acheter une carte
  const buyCardBackMutation = useMutation({
    mutationFn: async (cardBack: CardBack) => {
      const response = await fetch("/api/shop/buy-card-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardBackId: cardBack.id, price: cardBack.price }),
      });
      if (!response.ok) throw new Error("Failed to buy card back");
      return response.json();
    },
    onSuccess: (_, cardBack) => {
      deductBet(cardBack.price || 0);
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/card-backs"] });
      toast({
        title: "Card purchased!",
        description: `You've successfully purchased ${cardBack.name}.`,
      });
    },
    onError: () => {
      toast({
        title: "Purchase failed",
        description: "Failed to purchase card back. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCardSelect = (cardId: string) => {
    setSelectedCardId(cardId);
  };

  const handleConfirmSelect = () => {
    if (selectedCardId !== currentCardBackId) {
      selectCardBackMutation.mutate(selectedCardId);
    }
  };

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
    <div className="p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Select Card Back</h2>
        <p className="text-white/60">Choose your preferred card design</p>
      </div>

      {/* Grille des cartes */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-h-[60vh] overflow-y-auto">
        {cardBacks.map((cardBack) => {
          const isOwned = isCardOwned(cardBack.id);
          const isSelected = selectedCardId === cardBack.id;
          const isCurrent = currentCardBackId === cardBack.id;
          const canAfford = canAffordCard(cardBack.price);

          return (
            <motion.div
              key={cardBack.id}
              className={`relative rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "border-blue-400 bg-blue-400/10"
                  : isOwned
                  ? "border-white/20 bg-white/5 hover:border-white/40"
                  : canAfford
                  ? "border-white/10 bg-white/5 hover:border-yellow-400/50"
                  : "border-red-500/30 bg-red-500/5 opacity-60"
              }`}
              onClick={() => isOwned && handleCardSelect(cardBack.id)}
              whileHover={isOwned ? { scale: 1.02 } : {}}
              whileTap={isOwned ? { scale: 0.98 } : {}}
              data-testid={`card-back-${cardBack.id}`}
            >
              <div className="p-4">
                {/* Image de la carte */}
                <div className="relative mb-3 mx-auto w-20 h-28 bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg flex items-center justify-center">
                  <div className="text-white/40 text-xs font-bold">CARD</div>
                  
                  {/* Icônes de statut */}
                  {isCurrent && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  {!isOwned && (
                    <div className="absolute -top-2 -left-2 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Nom et rareté */}
                <div className="text-center">
                  <h3 className="text-white font-bold text-sm mb-1">{cardBack.name}</h3>
                  <p className={`text-xs font-medium ${getRarityColor(cardBack.rarity)}`}>
                    {cardBack.rarity.charAt(0).toUpperCase() + cardBack.rarity.slice(1)}
                  </p>
                  
                  {/* Prix ou statut */}
                  {!isOwned && cardBack.price && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant={canAfford ? "default" : "destructive"}
                        className="w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canAfford) {
                            handleBuyCard(cardBack);
                          }
                        }}
                        disabled={!canAfford || buyCardBackMutation.isPending}
                        data-testid={`buy-card-${cardBack.id}`}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {cardBack.price?.toLocaleString()}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Boutons d'action */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onCardBackSelect}
          className="flex-1"
          data-testid="button-cancel-card-selection"
        >
          Cancel
        </Button>
        
        <Button
          onClick={handleConfirmSelect}
          disabled={selectedCardId === currentCardBackId || selectCardBackMutation.isPending}
          className="flex-1"
          data-testid="button-confirm-card-selection"
        >
          {selectCardBackMutation.isPending ? "Changing..." : "Confirm"}
        </Button>
      </div>
    </div>
  );
}