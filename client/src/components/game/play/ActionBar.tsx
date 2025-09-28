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
  const baseClasses = "rounded-[20px] ring-1 ring-white/10 px-5 py-3 text-[15px] font-medium transition-transform duration-150 ease-out will-change-transform";
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
  className
}: ActionBarProps) {
  return (
    <motion.div
      className={cn("space-y-6", className)}
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

      {/* Secondary Actions - Bottom Row */}
      <div className="flex flex-wrap gap-3">
        {canDouble && (
          <ActionButton
            onClick={onDouble}
            className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0"
            testId="button-double"
          >
            Double
          </ActionButton>
        )}
        {canSplit && (
          <ActionButton
            onClick={onSplit}
            className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0"
            testId="button-split"
          >
            Split
          </ActionButton>
        )}
        {canSurrender && (
          <ActionButton
            onClick={onSurrender}
            className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0"
            testId="button-surrender"
          >
            Surrender
          </ActionButton>
        )}
      </div>
    </motion.div>
  );
}