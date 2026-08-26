import { motion } from "framer-motion";
import { RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sound";

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
  // Classic solo only (table-test.tsx) — omitted entirely by Practice/Cash (blackjack-table.tsx),
  // which never pass onSwap, so the button below simply doesn't render for them.
  canSwap?: boolean;
  onSwap?: () => void;
  swapBalance?: number;
  // True once the player is out of Swap tokens — the button still lights up the same way,
  // just offers a rewarded ad in place of spending a token (see table-test.tsx's handleSwap).
  swapViaAd?: boolean;
  className?: string;
  // Some callers (e.g. table-test.tsx) already crossfade this whole component in via their
  // own AnimatePresence, synced with the bet-wheel it replaces. Layering this component's own
  // opacity/y entrance (with its 0.3s delay) on top of that left a ~300-700ms dead gap between
  // the wheel disappearing and the buttons actually becoming visible. Callers with their own
  // wrapper should pass false here so this stays a plain, always-visible div.
  animateEntrance?: boolean;
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
      onClick={() => {
        playSound("buttonClick");
        onClick?.();
      }}
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
  canSwap = false,
  onSwap,
  swapBalance,
  swapViaAd = false,
  className,
  animateEntrance = true,
}: ActionBarProps) {
  return (
    <motion.div
      className={cn("space-y-3", className)}
      initial={animateEntrance ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={animateEntrance ? { duration: 0.4, delay: 0.3 } : { duration: 0 }}
    >
      {/* Primary Actions - Top Row — flex rather than a plain 2-col grid so Split can join
          Hit/Stand here (as a 3rd equal-width item) on a starting pair, instead of crowding
          the bottom row. */}
      <div className="flex gap-3">
        <ActionButton
          onClick={onHit}
          disabled={!canHit}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0"
          testId="button-hit"
        >
          Hit
        </ActionButton>
        <ActionButton
          onClick={onStand}
          disabled={!canStand}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0"
          testId="button-stand"
        >
          Stand
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
      </div>

      {/* Secondary Actions - Bottom Row — Double/Surrender (and Swap, Classic solo only)
          always render, greyed out (not removed) once they stop being legal, so this row
          never collapses/reflows the rest of the table. Toggling Split above only ever
          changes that row's own item widths, never this row's, so it doesn't reintroduce the
          table-shifting bug either. */}
      <div className="flex flex-wrap gap-2">
        <ActionButton
          onClick={onDouble}
          disabled={!canDouble}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
          testId="button-double"
        >
          Double
        </ActionButton>
        <ActionButton
          onClick={onSurrender}
          disabled={!canSurrender}
          className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
          testId="button-surrender"
        >
          Surrender
        </ActionButton>
        {onSwap && (
          // Bespoke rather than a plain ActionButton — needs the rotating glow ring to stand
          // out and invite a tap once it's live, violet to match Swap's own color.
          //
          // NOT GameResultOverlay's MovingBorder-traced-dot technique: that traces a single
          // point along an SVG path, sized for a rounded-full button where the whole shape is
          // one continuous curve. On this wide pill, no combination of dot size / corner radius
          // ever hugged the sharp straight-to-12px-arc-to-straight transition at all 4 corners
          // cleanly — the dot's bright core kept swinging from mostly outside the outer clip to
          // mostly under the solid inner pill with too little overlap on the ring itself,
          // pinching to near-invisible right at each corner.
          //
          // A rotating conic-gradient instead: no point-tracing at all, just a full-bleed
          // gradient "comet" rotating behind the same padding-gap ring mask. Its brightness at
          // any point in the ring is purely a function of angle from center, which varies
          // smoothly no matter how the ring's own boundary curves — so it can't pinch at a
          // corner the way a discrete traced dot can.
          <motion.button
            onClick={() => {
              playSound("buttonClick");
              onSwap();
            }}
            disabled={!canSwap}
            className="relative flex-1 min-w-0 rounded-xl overflow-hidden disabled:opacity-40 disabled:pointer-events-none transition-opacity duration-150"
            style={{ padding: canSwap ? "2px" : 0 }}
            whileHover={canSwap ? { scale: 1.02 } : {}}
            whileTap={canSwap ? { scale: 0.98 } : {}}
            data-testid="button-swap"
          >
            {canSwap && (
              <span className="absolute inset-0 rounded-xl overflow-hidden">
                <motion.div
                  className="absolute"
                  style={{
                    inset: "-100%",
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, #a78bfa 70deg, transparent 140deg, transparent 360deg)",
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                />
              </span>
            )}
            {/* rounded-[10px] = the button's own 12px minus the 2px padding gap above, so the
                gap reads as a uniform ring all the way around instead of pinching/widening at
                the corners. */}
            <span className="relative flex items-center justify-center gap-1.5 w-full h-full rounded-[10px] bg-[#232227] px-2 py-3 text-[13px] font-medium text-white truncate">
              {swapViaAd ? (
                <Play className="w-3.5 h-3.5 text-violet-400" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5 text-violet-400" />
              )}
              Swap
              {!swapViaAd && typeof swapBalance === "number" && (
                <span className="text-white/40 tabular-nums">{swapBalance}</span>
              )}
            </span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}