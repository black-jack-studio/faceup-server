import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Coins } from "lucide-react";

interface BetBadgeProps {
  amount: number;
  className?: string;
}

export default function BetBadge({ amount, className }: BetBadgeProps) {
  return (
    <motion.div
      className={cn(
        "flex items-center gap-2",
        className
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      data-testid="bet-badge"
    >
      <Coins className="w-4 h-4 text-[#F8CA5A]" />
      <div className="flex flex-col">
        <span className="text-white/60 text-xs leading-none">Bet</span>
        <span className="text-[#F8CA5A] font-medium text-sm leading-none">
          {amount.toLocaleString('fr-FR', { 
            maximumFractionDigits: 0,
            notation: 'standard' 
          })}
        </span>
      </div>
    </motion.div>
  );
}