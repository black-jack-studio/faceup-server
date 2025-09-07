import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  isHidden?: boolean;
  className?: string;
}

const suitSymbols = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const suitColors = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-gray-900",
  spades: "text-gray-900",
};

export default function PlayingCard({ suit, value, isHidden = false, className }: CardProps) {
  if (isHidden) {
    return (
      <motion.div
        className={cn(
          "w-16 h-24 bg-gradient-to-br from-blue-900 to-blue-700 rounded-lg border border-blue-600 flex items-center justify-center",
          className
        )}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.6 }}
        data-testid="card-hidden"
      >
        <div className="text-white/20 text-xs rotate-45 select-none">
          OFFSUIT
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "w-16 h-24 bg-white rounded-lg border border-gray-300 flex flex-col justify-between p-2 shadow-lg",
        className
      )}
      initial={{ rotateY: -180 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.6 }}
      data-testid={`card-${value}-${suit}`}
    >
      {/* Top left corner */}
      <div className="flex flex-col items-center">
        <span className={cn("text-sm font-bold", suitColors[suit])}>
          {value}
        </span>
        <span className={cn("text-lg leading-none", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>

      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center">
        <span className={cn("text-2xl", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div className="flex flex-col items-center transform rotate-180">
        <span className={cn("text-sm font-bold", suitColors[suit])}>
          {value}
        </span>
        <span className={cn("text-lg leading-none", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>
    </motion.div>
  );
}
