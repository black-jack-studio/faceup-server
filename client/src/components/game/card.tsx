import { motion } from "framer-motion";
import OffsuitCard from "@/components/PlayingCard";
import { Suit } from "@/icons/Suits";

interface CardProps {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  isHidden?: boolean;
  className?: string;
}

// Wrapper component to maintain compatibility with existing HandCards component
export default function PlayingCard({ suit, value, isHidden = false, className }: CardProps) {
  return (
    <motion.div
      initial={{ 
        rotateY: isHidden ? 180 : -180,
        scale: isHidden ? 1.1 : 1
      }}
      animate={{ 
        rotateY: 0,
        scale: 1
      }}
      transition={{ 
        duration: 0.8, 
        type: "spring", 
        stiffness: 100,
        damping: 15
      }}
      whileHover={{ scale: 1.05, rotateY: isHidden ? 0 : 5 }}
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
