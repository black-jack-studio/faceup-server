import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { playSound } from "@/lib/sound";
import { MovingBorder } from "@/components/ui/moving-border";
import { Plus, Hand, Copy, Split as SplitIcon } from "@/icons";

interface ActionBarProps {
  canHit?: boolean;
  canStand?: boolean;
  canDouble?: boolean;
  canSplit?: boolean;
  onHit?: () => void;
  onStand?: () => void;
  onDouble?: () => void;
  onSplit?: () => void;
  // Practice/Cash only (blackjack-table.tsx) — table-test.tsx (Classic solo) no longer passes
  // either of these, having replaced Surrender with the permanent Swap slot below. Same
  // presence-gated pattern as onSwap/canSwap: the button simply doesn't render without
  // onSurrender, rather than this being a Classic-solo/Practice mode switch baked in here.
  canSurrender?: boolean;
  onSurrender?: () => void;
  // Classic solo only (table-test.tsx) — omitted entirely by Practice/Cash (blackjack-table.tsx),
  // which never pass onSwap, so the button below simply doesn't render for them. Governs only
  // whether the slot is in the row at all — see swapDisabled for whether it's actually tappable
  // right now. table-test.tsx keeps this permanently true once a hand is dealt (rather than
  // unmounting the slot when ineligible), so the button always occupies its spot, just grayed
  // out when a tap wouldn't do anything, instead of appearing/disappearing.
  canSwap?: boolean;
  onSwap?: () => void;
  swapBalance?: number;
  // True while a swap tap wouldn't do anything — a rewarded ad is in flight, this hand's swap
  // is already spent, or another action is mid-request. The slot stays rendered (see canSwap)
  // but greys out and stops responding, same treatment as Double/Surrender once illegal.
  swapDisabled?: boolean;
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
  const enabledClasses = variant === "primary"
    ? "bg-[#B5F3C7] text-[#0B0B0F]"
    : "bg-white/6 text-white hover:bg-white/10";

  return (
    <motion.button
      onClick={() => {
        playSound("buttonClick");
        onClick?.();
      }}
      disabled={disabled}
      // Same two-layer shell (outer shape/padding, inner visible pill) as the Swap button
      // below — a plain single-layer button here used to render very slightly shorter than
      // Swap's p-[1.5px]-wrapped one once both sat in the same flex row (that wrapper padding
      // is real box height Swap adds and this button didn't), which is what actually made the
      // bottom row read as uneven sizes rather than anything about flex-1 itself.
      className={cn(
        "relative flex-1 min-w-0 rounded-[19px] p-[1.5px] overflow-hidden transition-opacity duration-150",
        disabled && "opacity-40 pointer-events-none"
      )}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      data-testid={testId}
    >
      <span
        className={cn(
          "relative flex items-center justify-center gap-1.5 w-full h-full rounded-[19px] ring-1 ring-white/10 px-5 py-3 text-[15px] font-medium transition-transform duration-150 ease-out will-change-transform",
          enabledClasses,
          className
        )}
      >
        {children}
      </span>
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
  swapDisabled = false,
  swapViaAd = false,
  className,
  animateEntrance = true,
}: ActionBarProps) {
  const { t } = useTranslation("gameplay");
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
          className={cn(
            "bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0",
            canSplit && "px-2 text-[13px] truncate"
          )}
          testId="button-hit"
        >
          <Plus className="w-[17px] h-[17px] flex-shrink-0" />
          {t("hit")}
        </ActionButton>
        <ActionButton
          onClick={onStand}
          disabled={!canStand}
          className={cn(
            "bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0",
            canSplit && "px-2 text-[13px] truncate"
          )}
          testId="button-stand"
        >
          <Hand className="w-[17px] h-[17px] flex-shrink-0" />
          {t("stand")}
        </ActionButton>
        {canSplit && (
          <ActionButton
            onClick={onSplit}
            className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
            testId="button-split"
          >
            <SplitIcon className="w-[17px] h-[17px] flex-shrink-0" />
            {t("split")}
          </ActionButton>
        )}
      </div>

      {/* Secondary Actions - Bottom Row — Double always renders, greyed out (not removed) once
          it stops being legal, so this row never collapses/reflows the rest of the table.
          Surrender (Practice/Cash only, see onSurrender's own comment) and Swap (Classic solo
          only) each only join as an extra item once actually relevant to that mode, same as
          Split above. Double picks up the smaller px-2/text-13px sizing whenever a 2nd item is
          sharing the row with it, whichever mode that item came from. */}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          onClick={onDouble}
          disabled={!canDouble}
          className={cn(
            "bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0",
            (canSwap || !!onSurrender) && "px-2 text-[13px] truncate"
          )}
          testId="button-double"
        >
          <Copy className="w-[17px] h-[17px] flex-shrink-0" />
          {t("double")}
        </ActionButton>
        {onSurrender && (
          <ActionButton
            onClick={onSurrender}
            disabled={!canSurrender}
            className="bg-[#232227] text-white hover:bg-[#1a1a1e] flex-1 min-w-0 px-2 text-[13px] truncate"
            testId="button-surrender"
          >
            {t("surrender")}
          </ActionButton>
        )}
        {onSwap && canSwap && (
          // Joins the row the same way Split joins the top row: absent (not just greyed out)
          // until it's actually usable, so Double/Surrender stay their normal size the rest of
          // the time instead of always reserving it a slot.
          //
          // Same Aceternity "moving border" structure as GameResultOverlay's "Watch to 2X": the
          // button itself is the rounded-xl, overflow-hidden, p-[1.5px] clipping container — the
          // glow is an absolutely-positioned inset-0 span traced by a small radial-gradient dot
          // (MovingBorder, duration 2200, rx 30%/ry 50%), fully clipped to the button's own
          // corners rather than a separate outset halo behind it. The inner span (offset from
          // the button's edge by exactly that 1.5px padding, opaque #232227 fill) is what turns
          // that clip into a thin traced ring instead of the dot showing through as a solid
          // blob — an opaque fill right up against the clip boundary is what hides the dot
          // everywhere except the sliver of padding it's currently tracing through.
          <motion.button
            onClick={() => {
              if (swapDisabled) return;
              playSound("buttonClick");
              onSwap();
            }}
            disabled={swapDisabled}
            className={cn(
              // rounded-[19px] to match ActionButton's own outer shell exactly (was 17px) —
              // now that ActionButton uses the same two-layer p-[1.5px] shell (see its own
              // comment), any radius mismatch between the two would show up as a visibly
              // different corner curve between Swap and its row-mates.
              "relative flex-1 min-w-0 rounded-[19px] p-[1.5px] overflow-hidden transition-opacity duration-150",
              swapDisabled && "opacity-40 pointer-events-none"
            )}
            whileHover={!swapDisabled ? { scale: 1.02 } : {}}
            whileTap={!swapDisabled ? { scale: 0.98 } : {}}
            data-testid="button-swap"
          >
            {/* Only runs while tapping would actually do something — same "still there, just
                stops selling itself" treatment the button gets via opacity once disabled. */}
            {!swapDisabled && (
              <span className="absolute inset-0 rounded-[19px]">
                <MovingBorder duration={2200} rx="30%" ry="50%">
                  <div className="h-9 w-9 bg-[radial-gradient(#ffffff_40%,transparent_70%)] opacity-90" />
                </MovingBorder>
              </span>
            )}
            <span
              className="relative flex items-center justify-center gap-1.5 w-full h-full rounded-[19px] ring-1 ring-white/10 bg-[#232227] px-2 py-3 text-[13px] font-medium truncate transition-transform duration-150 ease-out will-change-transform"
              style={{ color: "#ffffff" }}
            >
              {!swapViaAd && typeof swapBalance === "number" && (
                <span className="opacity-50 tabular-nums">{swapBalance}</span>
              )}
              {t("swap")}
            </span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
