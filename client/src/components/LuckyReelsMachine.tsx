import { motion } from "framer-motion";
import { Gem, Coin, SwapCoin } from "@/icons";

// The 3 possible slot symbols, matching the 3 real currencies EconomyManager.
// generateWheelOfFortuneReward() can award (server, kept in sync -- see that function's own
// comment). Anatole's reference screenshot used generic slot-machine icons; these are FaceUp's
// own Coin/Gem/SwapCoin in their place.
export type SlotSymbol = 'coins' | 'gems' | 'swapTokens';
export const SLOT_SYMBOLS: SlotSymbol[] = ['coins', 'gems', 'swapTokens'];

export const REEL_ITEM_SIZE = 104; // px -- height of one symbol's row in a reel strip
export const REEL_LIST_LENGTH = 24; // how many symbols long each spin's strip is
export const REEL_TARGET_INDEX = 20; // where the real result sits in that strip once it settles
// Window shows the landing symbol fully, centered, with only slivers of its neighbors peeking
// in above/below (faded to black) instead of 3 complete rows -- 2 item-heights tall, not 3.
export const REEL_WINDOW_HEIGHT = REEL_ITEM_SIZE * 2;

export function randomSlotSymbol(): SlotSymbol {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)];
}

// A random symbol that's never any of `excluded`, falling back to ignoring `excluded` entirely
// if it would otherwise cover all 3 types (always returns *something* rather than crashing).
function randomSlotSymbolExcluding(excluded: SlotSymbol[]): SlotSymbol {
  const choices = SLOT_SYMBOLS.filter((s) => !excluded.includes(s));
  const pool = choices.length > 0 ? choices : SLOT_SYMBOLS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Builds all 3 reels' strips for one spin together, row by row, rather than each reel
// independently -- two rules, both per Anatole:
//   1. Vertical: a reel's own neighbor directly above/below it is never the same symbol.
//   2. Horizontal: at any row, not all 3 reels show the same symbol -- generating each reel's
//      strip independently left this to chance, which routinely produced a row of 3 matching
//      coins with nothing forcing otherwise (outside the one row that's *supposed* to match:
//      REEL_TARGET_INDEX, the shared reward every reel deliberately lands on together).
// The vertical rule always wins if the two ever conflict (dropping the horizontal exclusion
// rather than the vertical one) -- landing distinctly next to the actual result matters more
// than a filler row's variety.
export function buildReelStripsForTarget(target: SlotSymbol): [SlotSymbol[], SlotSymbol[], SlotSymbol[]] {
  const strips: [SlotSymbol[], SlotSymbol[], SlotSymbol[]] = [[], [], []];
  for (let i = 0; i < REEL_LIST_LENGTH; i++) {
    if (i === REEL_TARGET_INDEX) {
      strips[0].push(target);
      strips[1].push(target);
      strips[2].push(target);
      continue;
    }
    const rowValues: SlotSymbol[] = [];
    for (let reel = 0; reel < 3; reel++) {
      const verticalExcluded: SlotSymbol[] = [];
      if (i > 0) verticalExcluded.push(strips[reel][i - 1]);
      if (i === REEL_TARGET_INDEX - 1) verticalExcluded.push(target);

      const bothExcluded = [...verticalExcluded];
      if (reel === 2 && rowValues[0] === rowValues[1]) bothExcluded.push(rowValues[0]);

      const value = SLOT_SYMBOLS.some((s) => !bothExcluded.includes(s))
        ? randomSlotSymbolExcluding(bothExcluded)
        : randomSlotSymbolExcluding(verticalExcluded);
      rowValues.push(value);
      strips[reel].push(value);
    }
  }
  return strips;
}

// Same two rules as buildReelStripsForTarget above, for the static (never-spun) 3-row idle
// display -- no forced target row here, every row is just decorative.
export function buildIdleTriplets(): [SlotSymbol, SlotSymbol, SlotSymbol][] {
  const strips: [SlotSymbol[], SlotSymbol[], SlotSymbol[]] = [[], [], []];
  for (let i = 0; i < 3; i++) {
    const rowValues: SlotSymbol[] = [];
    for (let reel = 0; reel < 3; reel++) {
      const verticalExcluded: SlotSymbol[] = i > 0 ? [strips[reel][i - 1]] : [];
      const bothExcluded = [...verticalExcluded];
      if (reel === 2 && rowValues[0] === rowValues[1]) bothExcluded.push(rowValues[0]);

      const value = SLOT_SYMBOLS.some((s) => !bothExcluded.includes(s))
        ? randomSlotSymbolExcluding(bothExcluded)
        : randomSlotSymbolExcluding(verticalExcluded);
      rowValues.push(value);
      strips[reel].push(value);
    }
  }
  return [
    [strips[0][0], strips[0][1], strips[0][2]],
    [strips[1][0], strips[1][1], strips[1][2]],
    [strips[2][0], strips[2][1], strips[2][2]],
  ];
}

function SlotIcon({ type, size }: { type: SlotSymbol; size: number }) {
  if (type === 'coins') return <Coin size={size} />;
  if (type === 'gems') return <Gem style={{ width: size, height: size }} />;
  return <SwapCoin size={size} />;
}

// One column of the slot machine. Idle (spinId 0) just shows a static row of 3 symbols with no
// animation. Every spin after that remounts (key={spinId}) with a fresh REEL_LIST_LENGTH-long
// strip and animates from the top down to REEL_TARGET_INDEX's resting position -- the remount
// is what lets each spin restart from y=0 instead of animating backwards from wherever the
// previous spin settled.
function SlotReel({
  spinId,
  strip,
  idleSymbols,
  duration,
  onSettled,
}: {
  spinId: number;
  strip: SlotSymbol[];
  idleSymbols: [SlotSymbol, SlotSymbol, SlotSymbol];
  duration: number;
  onSettled?: () => void;
}) {
  // Vertical offset that puts the item at `targetIndex` in a strip fully visible and centered
  // in the window, with its neighbors only half-showing above/below (cropped by the window's
  // own edges, then faded further by the gradients below).
  const centerOffset = (targetIndex: number) => (REEL_WINDOW_HEIGHT - REEL_ITEM_SIZE) / 2 - targetIndex * REEL_ITEM_SIZE;
  const restY = centerOffset(REEL_TARGET_INDEX);
  const idleY = centerOffset(1); // idleSymbols is always a 3-item [above, shown, below] triplet

  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: REEL_WINDOW_HEIGHT }}>
      {spinId === 0 ? (
        <div className="absolute inset-x-0 top-0 flex flex-col items-center" style={{ transform: `translateY(${idleY}px)` }}>
          {idleSymbols.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-center shrink-0"
              style={{ height: REEL_ITEM_SIZE, width: "100%" }}
            >
              <SlotIcon type={s} size={68} />
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          key={spinId}
          className="absolute inset-x-0 top-0 flex flex-col items-center"
          initial={{ y: 0 }}
          animate={{ y: restY }}
          transition={{ duration, ease: [0.12, 0.72, 0.32, 1] }}
          onAnimationComplete={onSettled}
        >
          {strip.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-center shrink-0"
              style={{ height: REEL_ITEM_SIZE, width: "100%" }}
            >
              <SlotIcon type={s} size={68} />
            </div>
          ))}
        </motion.div>
      )}

      {/* Fades the strip to black at the top/bottom edges instead of hard-cutting mid-symbol,
          same idea as a real slot machine's window -- sized to cover most of the half-symbol
          sliver the shorter window now leaves peeking in on each side. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-11 z-10"
        style={{ background: "linear-gradient(180deg, #2a2d34 0%, transparent 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-11 z-10"
        style={{ background: "linear-gradient(0deg, #2a2d34 0%, transparent 100%)" }}
      />
    </div>
  );
}

export interface LuckyReelsMachineProps {
  // spinId 0 = idle (shows idleSymbolsPerReel with no animation); anything else remounts each
  // reel fresh and animates it down to its strip's forced target symbol.
  spinId: number;
  reelStrips: [SlotSymbol[], SlotSymbol[], SlotSymbol[]];
  idleSymbolsPerReel: [SlotSymbol, SlotSymbol, SlotSymbol][];
  // Fires once the slowest (3rd) reel's spin animation actually settles.
  onSettled?: () => void;
  // Natural width in px, or '100%' to fill its container (the default, and what the full-size
  // Lucky Reels page itself uses). The shop header's mini version instead renders this at a
  // fixed reference width and shrinks the whole thing with a CSS transform, so passing a number
  // here keeps every internal measurement (reel item size, bezel padding, divider width, ...)
  // proportionally identical to the full-size machine instead of an independently-tuned mini
  // version that could drift out of sync with it visually.
  width?: number | string;
  // How long the first reel's spin takes, in seconds -- reel N takes firstReelDuration +
  // N*reelStagger, so they stop in sequence rather than all at once. Defaults match the
  // full-size Lucky Reels page's own pacing (1.8s/2.25s/2.7s); the Shop header's tiny preview
  // passes shorter ones since that same pacing read as barely-there at a fraction of the size.
  firstReelDuration?: number;
  reelStagger?: number;
}

// The Lucky Reels slot machine itself (bezel, reel window, dividers) -- shared between the full
// Lucky Reels page (wheel-of-fortune.tsx) and the Shop's small clickable preview of it, so both
// are guaranteed to look exactly the same rather than two hand-tuned copies drifting apart.
export default function LuckyReelsMachine({
  spinId,
  reelStrips,
  idleSymbolsPerReel,
  onSettled,
  width = "100%",
  firstReelDuration = 1.8,
  reelStagger = 0.45,
}: LuckyReelsMachineProps) {
  return (
    <div
      className="relative rounded-[28px] p-3.5 overflow-hidden"
      style={{
        width,
        // Inverse shape from the reels below: dark in the middle of the frame (nearest
        // the recessed window, where it'd naturally fall into shadow) and lighter toward
        // both the top and bottom edges (catching more light), same grey palette.
        background: "linear-gradient(180deg, #6b7280 0%, #2a2d34 50%, #6b7280 100%)",
        boxShadow: "0 20px 40px -16px rgba(0,0,0,0.6)",
      }}
    >
      <div
        className="relative rounded-[20px] overflow-hidden flex"
        style={{
          // Same grey palette as the outer bezel above, just reshaped: light in the
          // middle (where the landing symbol sits), darkening toward both the top and
          // bottom edges -- reads as a lit, curved reel drum rather than a flat black slot.
          background: "linear-gradient(180deg, #2a2d34 0%, #6b7280 50%, #2a2d34 100%)",
          boxShadow: "inset 0 2px 12px rgba(0,0,0,0.8)",
        }}
      >
        {[0, 1, 2].map((reelIndex) => (
          <div key={reelIndex} className="relative flex-1 flex">
            <SlotReel
              spinId={spinId}
              strip={reelStrips[reelIndex]}
              idleSymbols={idleSymbolsPerReel[reelIndex]}
              duration={firstReelDuration + reelIndex * reelStagger}
              onSettled={reelIndex === 2 ? onSettled : undefined}
            />
          </div>
        ))}

        {/* Column dividers, inside the window's own overflow-hidden bounds (not the outer
            bezel) and reaching a few px past its top/bottom edge -- no border-radius, so
            they're cut flush by that clip instead of ending in a visible rounded tip. Reads
            as the groove continuing behind the frame rather than a line laid on top of it. */}
        {[1, 2].map((i) => (
          <div
            key={i}
            className="absolute z-20"
            style={{
              left: `calc(100% * ${i} / 3)`,
              top: -6,
              bottom: -6,
              width: 5,
              transform: "translateX(-50%)",
              background: "radial-gradient(ellipse 70% 50% at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.6) 60%, rgba(255,255,255,0.14) 100%)",
              boxShadow: "inset 1px 0 1.5px rgba(0,0,0,0.95), inset -1px 0 1.5px rgba(0,0,0,0.95), 0 0 3px rgba(0,0,0,0.4)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
