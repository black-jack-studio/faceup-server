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
          "w-20 h-32 bg-gradient-to-br from-[#B79CFF]/80 to-violet-600/80 rounded-[18px] shadow-[0_6px_24px_rgba(0,0,0,0.35)] flex items-center justify-center backdrop-blur-sm transition-transform duration-150 ease-out will-change-transform",
          className
        )}
        initial={{ rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
        whileHover={{ scale: 1.05 }}
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
        "w-20 h-32 bg-white rounded-[18px] shadow-[0_6px_24px_rgba(0,0,0,0.35)] flex flex-col justify-between p-3 relative overflow-hidden text-[#0B0B0F] transition-transform duration-150 ease-out will-change-transform",
        className
      )}
      initial={{ rotateY: -180 }}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.6, type: "spring", stiffness: 120 }}
      whileHover={{ scale: 1.05, rotateY: 5 }}
      data-testid={`card-${value}-${suit}`}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[18px]" />

      {/* Top left corner */}
      <div className="flex flex-col items-center relative z-10">
        <span className={cn("text-sm font-bold drop-shadow-sm", suitColors[suit])}>
          {value}
        </span>
        <span className={cn("text-base leading-none drop-shadow-sm", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>

      {/* Center value - large and prominent */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <span className={cn("font-semibold text-[28px] tracking-tight drop-shadow-sm", suitColors[suit])}>
          {value}
        </span>
      </div>

      {/* Bottom symbol */}
      <div className="flex justify-center relative z-10">
        <span className={cn("text-[14px] opacity-80 drop-shadow-sm", suitColors[suit])}>
          {suitSymbols[suit]}
        </span>
      </div>
    </motion.div>
  );
}
