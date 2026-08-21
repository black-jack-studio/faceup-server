import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  canHit?: boolean;
  canStand?: boolean;
  canDouble?: boolean;
  canSplit?: boolean;
  canSurrender?: boolean;
  onHit?: () => void;
  onStand?: () => void;
  onDouble?: () => void;
  onSplit?: () => void;
  onSurrender?: () => void;
  className?: string;
  playerCardCount?: number;
}

interface ActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  className?: string;
  testId?: string;
}

function ActionButton({ 
  children, 
  onClick, 
  disabled = false, 
  variant = "secondary",
  className,
  testId
}: ActionButtonProps) {
  const baseClasses = "rounded-xl ring-1 ring-white/10 px-5 py-3 text-[15px] font-medium transition-transform duration-150 ease-out will-change-transform";
  const enabledClasses = variant === "primary" 
    ? "bg-[#B5F3C7] text-[#0B0B0F]" 
    : "bg-white/6 text-white hover:bg-white/10";
  const disabledClasses = "opacity-40 pointer-events-none";

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        baseClasses,
        disabled ? disabledClasses : enabledClasses,
        className
      )}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      data-testid={testId}
    >
      {children}
    </motion.button>
  );
}

export default function ActionBar({
  canHit = false,
  canStand = false,
  canDouble = false,
  canSplit = false,
  canSurrender = false,
  onHit,
  onStand,
  onDouble,
  onSplit,
  onSurrender,
  className,
  playerCardCount = 0
}: ActionBarProps) {
  const shouldLowerButtons = playerCardCount >= 4;
  
  return (
    <motion.div
      className={cn("space-y-3", shouldLowerButtons ? "mt-8" : "", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* Primary Actions - Top Row */}
      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          onClick={onHit}
          disabled={!canHit}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e]"
          testId="button-hit"
        >
          Hit
        </ActionButton>
        <ActionButton
          onClick={onStand}
          disabled={!canStand}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e]"
          testId="button-stand"
        >
          Stand
        </ActionButton>
      </div>

      {/* Secondary Actions - Bottom Row — Double/Surrender always render, greyed out (not
          removed) once they stop being legal mid-hand, so this row never collapses/reflows the
          rest of the table. Split is genuinely contextual (only a starting pair can ever split,
          not just "temporarily unavailable" like the other two), so it stays conditional —
          toggling it only ever changes each button's width within this row, never the row's
          own height, so it doesn't reintroduce the table-shifting bug. */}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          onClick={onDouble}
          disabled={!canDouble}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
          testId="button-double"
        >
          Double
        </ActionButton>
        {canSplit && (
          <ActionButton
            onClick={onSplit}
            className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
            testId="button-split"
          >
            Split
          </ActionButton>
        )}
        <ActionButton
          onClick={onSurrender}
          disabled={!canSurrender}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
          testId="button-surrender"
        >
          Surrender
        </ActionButton>
      </div>
    </motion.div>
  );
}