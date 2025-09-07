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
          "w-16 h-24 bg-gradient-to-br from-accent-purple/80 to-violet-600/80 rounded-xl border border-accent-purple/60 flex items-center justify-center shadow-xl backdrop-blur-sm",
          className
        )}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
        data-testid="card-hidden"
      >
        <div className="text-white/30 text-xs rotate-45 select-none font-bold">
          OFFSUIT
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={cn(
        "w-16 h-24 bg-white rounded-xl border border-gray-200 flex flex-col justify-between p-2 shadow-xl relative overflow-hidden",
        className
      )}
      initial={{ rotateY: -180 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      data-testid={`card-${value}-${suit}`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl" />

      {/* Top left corner */}
      <div className="flex flex-col items-center relative z-10">
        <span className={cn("text-sm font-bold drop-shadow-sm", suitColors[suit])}>
          {value}
        </span>
        <span className={cn("text-base leading-none drop-shadow-sm", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>

      {/* Center symbol */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <motion.span 
          className={cn("text-3xl drop-shadow-sm", suitColors[suit])}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          {suitSymbols[suit]}
        </motion.span>
      </div>

      {/* Bottom right corner (rotated) */}
      <div className="flex flex-col items-center transform rotate-180 relative z-10">
        <span className={cn("text-sm font-bold drop-shadow-sm", suitColors[suit])}>
          {value}
        </span>
        <span className={cn("text-base leading-none drop-shadow-sm", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>
    </motion.div>
  );
}
