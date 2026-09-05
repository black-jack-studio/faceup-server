import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import topHatImage from '@assets/top_hat_3d_1757354434573.png';
import { formatFullNumber } from "@/lib/formatUtils";

interface DealerHeaderProps {
  avatar?: string;
  name: string;
  total?: number;
  chips?: number;
  className?: string;
}

export default function DealerHeader({
  avatar = "default",
  name,
  total,
  chips,
  className
}: DealerHeaderProps) {
  const { t } = useTranslation("gameplay");
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
          {avatar === "default" ? (
            <img src={topHatImage} alt={t("blackjackTable.dealerHatAlt")} className="w-8 h-8 object-contain" />
          ) : (
            <span className="text-xl">{avatar}</span>
          )}
        </div>
        
        {/* Dealer Info */}
        <div className="text-center">
          <div className="text-white/90 font-medium text-lg">{name}</div>
          {total !== undefined && (
            <div className="text-white/60 text-sm">
              {t("total", { value: total })}
            </div>
          )}
        </div>
        
        {/* Optional chips display */}
        {chips !== undefined && (
          <div className="bg-[#13151A] rounded-2xl ring-1 ring-white/10 px-3 py-1">
            <div className="text-[#F8CA5A] text-sm font-medium">
              {formatFullNumber(chips)}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}