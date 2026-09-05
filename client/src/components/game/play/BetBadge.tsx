import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import Coin from "@/icons/Coin";
import { formatFullNumber } from "@/lib/formatUtils";

interface BetBadgeProps {
  amount: number;
  className?: string;
}

export default function BetBadge({ amount, className }: BetBadgeProps) {
  const { t } = useTranslation("gameplay");
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
      <Coin size={16} />
      <div className="flex flex-col">
        <span className="text-white/60 text-xs leading-none">{t("betLabel")}</span>
        <span className="text-[#F8CA5A] font-medium text-sm leading-none">
          {formatFullNumber(amount)}
        </span>
      </div>
    </motion.div>
  );
}