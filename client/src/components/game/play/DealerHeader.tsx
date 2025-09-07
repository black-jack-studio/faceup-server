import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DealerHeaderProps {
  avatar?: string;
  name: string;
  total?: number;
  chips?: number;
  className?: string;
}

export default function DealerHeader({
  avatar = "🎩",
  name,
  total,
  chips,
  className
}: DealerHeaderProps) {
  return (
    <motion.div 
      className={cn("p-6", className)}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-center gap-3">
        {/* Dealer Avatar */}
        <div className="h-10 w-10 rounded-full bg-[#13151A] ring-1 ring-white/10 flex items-center justify-center">
          <span className="text-xl">{avatar}</span>
        </div>
        
        {/* Dealer Info */}
        <div className="text-center">
          <div className="text-white/90 font-medium text-lg">{name}</div>
          {total !== undefined && (
            <div className="text-white/60 text-sm">
              Total: {total}
            </div>
          )}
        </div>
        
        {/* Optional chips display */}
        {chips !== undefined && (
          <div className="bg-[#13151A] rounded-2xl ring-1 ring-white/10 px-3 py-1">
            <div className="text-[#F8CA5A] text-sm font-medium">
              {chips.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}