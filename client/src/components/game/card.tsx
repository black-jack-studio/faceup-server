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
      initial={{ rotateY: isHidden ? 180 : -180 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
      whileHover={{ scale: 1.05, rotateY: isHidden ? 0 : 5 }}
      data-testid={isHidden ? "card-hidden" : `card-${value}-${suit}`}
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
