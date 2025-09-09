import { motion } from "framer-motion";
import OffsuitCard from "@/components/PlayingCard";
import { Suit } from "@/icons/Suits";
import { useAudio } from "@/lib/audio";

interface CardProps {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  isHidden?: boolean;
  className?: string;
}

// Wrapper component to maintain compatibility with existing HandCards component
export default function PlayingCard({ suit, value, isHidden = false, className }: CardProps) {
  const { playCardFlip } = useAudio();
  
  return (
    <motion.div
      initial={{ rotateY: isHidden ? 180 : -180 }}
      animate={{ 
        rotateY: isHidden ? 180 : 0,
        scale: 1
      }}
      transition={{ 
        duration: isHidden ? 0.1 : 1.0,
        type: "spring", 
        stiffness: 60,
        damping: 12,
        delay: isHidden ? 0 : 0.3
      }}
      onAnimationStart={() => {
        // Play flip sound when card flips (only for face-up cards)
        if (!isHidden) {
          playCardFlip(300); // Slight delay to match animation
        }
      }}
      whileHover={{ scale: 1.05 }}
      data-testid={isHidden ? "card-hidden" : `card-${value}-${suit}`}
      style={{
        transformPerspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      <OffsuitCard
        rank={value}
        suit={suit as Suit}
        faceDown={isHidden}
        size="sm"
        className={className}
      />
    </motion.div>
  );
}
