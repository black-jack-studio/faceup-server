import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { UserCardBack, getRarityColor, getRarityBackground, getRarityDisplayName } from "@/lib/card-backs";
import OffsuitCard from "@/components/PlayingCard";

interface CardBackCollectionItemProps {
  userCardBack: UserCardBack;
  isSelected: boolean;
  onSelect: (cardBackId: string) => void;
  isLoading?: boolean;
}

export default function CardBackCollectionItem({ 
  userCardBack, 
  isSelected, 
  onSelect, 
  isLoading = false 
}: CardBackCollectionItemProps) {
  const { cardBack } = userCardBack;
  const rarityColor = getRarityColor(cardBack.rarity);
  const rarityBackground = getRarityBackground(cardBack.rarity);
  const rarityDisplayName = getRarityDisplayName(cardBack.rarity);

  return (
    <motion.div
      className={`relative bg-white/5 rounded-2xl p-4 border transition-all duration-200 ${
        isSelected 
          ? 'border-accent-green shadow-lg shadow-accent-green/20' 
          : 'border-white/10 hover:border-white/20'
      }`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid={`card-back-item-${cardBack.id}`}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-accent-green rounded-full p-2 shadow-lg z-10">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Card preview */}
      <div className="flex justify-center mb-3">
        <div className="w-20 aspect-[3/4] relative">
          <OffsuitCard
            rank="A"
            suit="spades"
            faceDown={true}
            size="xs"
            className="w-full h-auto"
          />
        </div>
      </div>

      {/* Card info */}
      <div className="text-center space-y-2">
        <h3 className="text-white font-bold text-sm truncate" data-testid={`card-name-${cardBack.id}`}>
          {cardBack.name}
        </h3>
        
        {cardBack.description && (
          <p className="text-white/60 text-xs line-clamp-2" data-testid={`card-description-${cardBack.id}`}>
            {cardBack.description}
          </p>
        )}

        {/* Rarity badge */}
        <div className="flex justify-center">
          <Badge 
            className={`text-xs px-2 py-1 ${rarityBackground} ${rarityColor} border`}
            data-testid={`rarity-badge-${cardBack.id}`}
          >
            {rarityDisplayName}
          </Badge>
        </div>

        {/* Selection button */}
        <Button
          onClick={() => onSelect(cardBack.id)}
          disabled={isSelected || isLoading}
          className={`w-full text-xs py-2 transition-all duration-200 ${
            isSelected
              ? 'bg-accent-green/20 text-accent-green border border-accent-green cursor-default'
              : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105 active:scale-95'
          }`}
          variant={isSelected ? "outline" : "default"}
          data-testid={`select-button-${cardBack.id}`}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              <span>Selecting...</span>
            </div>
          ) : isSelected ? (
            "Selected"
          ) : (
            "Select"
          )}
        </Button>
      </div>
    </motion.div>
  );
}