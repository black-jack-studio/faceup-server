import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/lib/blackjack/engine";
import PlayingCard from "../card";

interface SplitHand {
  hand: Card[];
  total: number;
  result: "win" | "lose" | "push" | null;
  isActive: boolean;
  isComplete: boolean;
}

interface SplitHandsCenterSideProps {
  splitHands: SplitHand[];
  currentSplitHand: number;
  cardBackUrl?: string | null;
}

// sm/xs widths (see PlayingCard's sizeMap) — same overlap ratio HandCards uses, so the active
// hand fans the same way the rest of the table does. Shrinks to xs past 6 cards, same threshold
// as HandCards. The waiting hand always renders at xs (see the component doc for why that's a
// real size, not a CSS scale).
const OVERLAP_RATIO = 0.65;
const CARD_WIDTH = { sm: 80, xs: 40 } as const;
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const ROW_HEIGHT = 190;
// A little breathing room from the true screen edge, on top of the page's own px-5 gutter this
// component already sits inside — the anchor point, not just the cards.
const WALL_PADDING = "8px";
// How long the active<->waiting switch transition itself runs — layout tracking on the row/
// badge stays on for this long after a hand goes inactive, so the shrink itself still animates
// smoothly, then turns off once it's actually done (see SplitHandSlot below).
const SWITCH_DURATION = 0.5;

// visibleCount caps how many of the hand's cards actually render — 1 once this hand is waiting
// (see the component doc below for why), the full hand while it's active. AnimatePresence
// animates the ones that drop out of view when a hand goes from active to waiting, instead of
// them just vanishing. layoutTracked gates `layout` on each card.
function HandCardRow({
  cards,
  cardBackUrl,
  visibleCount,
  size,
  layoutTracked,
}: {
  cards: Card[];
  cardBackUrl?: string | null;
  visibleCount: number;
  size: "sm" | "xs";
  layoutTracked: boolean;
}) {
  const cardWidth = CARD_WIDTH[size];
  const step = cardWidth * OVERLAP_RATIO - cardWidth;
  // The visual distance from one card's left edge to the next's — used below to slide a
  // departing card toward wherever the one remaining card (the last one dealt) actually sits,
  // instead of just fading out in place.
  const increment = cardWidth * OVERLAP_RATIO;
  const shown = cards.slice(Math.max(0, cards.length - visibleCount));
  const skipped = cards.length - shown.length;
  const lastIndex = shown.length - 1;
  return (
    <div className="flex items-center">
      <AnimatePresence>
        {shown.map((card, i) => {
          const index = skipped + i;
          // How many cards used to sit further right in the *fully shown* hand, before this
          // one collapsed down to size 1 — that's how far right this card needs to slide to
          // land where the one surviving card (the pile) ends up. 0 for that survivor itself.
          const distanceToPile = (cards.length - 1 - index) * increment;
          return (
            <motion.div
              key={index}
              layout={layoutTracked ? "position" : false}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1, x: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
              // Slides toward wherever the one surviving card (the pile) ends up, instead of
              // just fading out in place — and cards further from the pile start gathering a
              // beat later, so the whole hand visibly sweeps together into one stack instead of
              // every card vanishing at once.
              exit={{
                opacity: 0,
                scale: 0.35,
                x: distanceToPile,
                transition: { duration: 0.5, ease: "easeInOut", delay: (lastIndex - i) * 0.06 },
              }}
              style={{ marginLeft: i > 0 ? step : 0, position: "relative", zIndex: index }}
            >
              <PlayingCard suit={card.suit} value={card.value} size={size} cardBackUrl={cardBackUrl} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function TotalBadge({ total, small, layoutTracked }: { total: number; small: boolean; layoutTracked: boolean }) {
  return (
    <motion.div
      layout={layoutTracked ? "position" : false}
      className={cn("rounded-2xl text-center", small ? "px-2.5 py-1" : "px-4 py-2")}
      // A fixed min-width, not just padding: without it, the pill's own width tracks the
      // number's digit count (e.g. "9" vs "22"), and since this sits inside a `layout`-tracked
      // parent, that width change got caught up in the parent's own size interpolation — read
      // as the pill visibly squeezing shut and popping back open around the new number instead
      // of just displaying it. A width that never changes has nothing to interpolate.
      style={{ backgroundColor: "#232227", minWidth: small ? 28 : 44 }}
    >
      <span className={cn("font-semibold text-white", small ? "text-sm" : "text-lg")}>{total}</span>
    </motion.div>
  );
}

// Delays turning layout-tracking off on the way *into* waiting — the shrink transition itself
// still needs `layout` engaged on the inner row/badge to animate smoothly (see the component
// doc for why turning it off exactly when the transition starts made the shrink stutter and
// then teleport into place), but once genuinely settled, tracking comes back off so nothing
// here can be nudged by an unrelated change elsewhere (see the component doc for that bug).
function useSettledLayoutTracking(isActive: boolean): boolean {
  const [tracked, setTracked] = useState(isActive);
  useEffect(() => {
    if (isActive) {
      setTracked(true);
      return;
    }
    const t = setTimeout(() => setTracked(false), SWITCH_DURATION * 1000);
    return () => clearTimeout(t);
  }, [isActive]);
  return tracked;
}

function SplitHandSlot({
  hand,
  isActive,
  isLeft,
  cardBackUrl,
}: {
  hand: SplitHand;
  isActive: boolean;
  isLeft: boolean;
  cardBackUrl?: string | null;
}) {
  const layoutTracked = useSettledLayoutTracking(isActive);
  return (
    <div
      className={cn("min-w-0 flex items-end", isActive ? "justify-center" : isLeft ? "justify-start" : "justify-end")}
      style={isActive ? undefined : { paddingLeft: isLeft ? WALL_PADDING : 0, paddingRight: isLeft ? 0 : WALL_PADDING }}
    >
      <motion.div layout transition={{ type: "tween", duration: SWITCH_DURATION, ease: "easeInOut" }} className="flex flex-col items-center gap-2">
        <TotalBadge total={hand.total} small={!isActive} layoutTracked={layoutTracked} />
        <HandCardRow
          cards={hand.hand}
          cardBackUrl={cardBackUrl}
          visibleCount={isActive ? hand.hand.length : 1}
          size={isActive ? (hand.hand.length >= 6 ? "xs" : "sm") : "xs"}
          layoutTracked={layoutTracked}
        />
      </motion.div>
    </div>
  );
}

// Classic 21's own split view: hand 1 always lives in the left half, hand 2 always lives in
// the right half — neither one ever crosses over or changes which half it's in, for the whole
// rest of the round. What changes when the active hand switches is its size and how many of
// its own cards actually render:
//
// - Active: every card, at full ("sm", shrinking to "xs" past 6 cards) size, fanned, centered
//   within its own half — not pinned to that half's own outer wall, which used to look
//   lopsided and left less room before a long hand could reach the wall than centering does.
// - Waiting: collapses down to just its *last* card + its total badge, both rendered at a
//   genuinely smaller size ("xs" card, a smaller badge) — not a full-size card shrunk with a
//   CSS transform. A `transform: scale()` only ever changes paint, never the element's own
//   layout box, so `items-end` (which aligns layout boxes) was aligning the *unscaled* box —
//   the shrunk card visually floated above the active hand's own baseline instead of sharing
//   it, and floated by a different amount depending on which hand happened to be shrunk. Real
//   card sizes make what's on screen and what layout measures the same thing, so the shared
//   bottom edge is exact regardless of which hand is which. It's still pinned to its own outer
//   wall (not the boundary between the hands), with a fixed WALL_PADDING — that anchor never
//   moves, so a card touching the actual screen edge is structurally impossible.
//
// This is a real 2-column CSS grid (grid-cols-2), not a flex row that happens to look similar:
// a flex row centered as one group would visibly recenter the *whole pair* — nudging the
// inactive hand sideways — the instant the active hand's card count changed the pair's total
// width. Grid tracks don't do that: each column is a fixed 50% of this component's own
// (already fixed, see table-test.tsx) width regardless of either hand's content. min-w-0 on
// each column is load-bearing: without it, a wide active hand can force its own grid track to
// grow past its fair 50% share, which would move the *other* hand's anchor too. The active
// hand's own column is 75% of that width, not a flat 50/50 — it's the one doing all the
// growing, while the waiting side only ever shows one small card and doesn't need much room.
//
// Each hand's own outer block always carries `layout` — that's what animates the active<->
// waiting switch itself (centered <-> pinned-to-wall, full size <-> shrunk) as one continuous
// move+resize. The row and badge inside it stay layout-tracked through that same transition
// (see useSettledLayoutTracking) so the shrinking content animates smoothly *with* the outer
// block instead of snapping to its final compact size the instant the switch starts — that
// mismatch (container still mid-tween, content already final) was the stutter-then-teleport
// bug. Tracking only turns off once a hand is genuinely settled into waiting, which is what
// actually guarantees it can never be nudged by a sibling's changes afterward — see the
// tracking-related bug this originally worked around: several `layout`-tracked elements
// sharing a page can trigger a stray remeasure-and-correct micro-animation on each other even
// when a given one's own real position never changed.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  return (
    <div
      className="w-full grid gap-3 items-end"
      style={{ height: ROW_HEIGHT, gridTemplateColumns: currentSplitHand === 0 ? "3fr 1fr" : "1fr 3fr" }}
    >
      {[0, 1].map((handIndex) => {
        const hand = splitHands[handIndex];
        if (!hand) return <div key={handIndex} />;
        return (
          <SplitHandSlot
            key={handIndex}
            hand={hand}
            isActive={handIndex === currentSplitHand}
            isLeft={handIndex === 0}
            cardBackUrl={cardBackUrl}
          />
        );
      })}
    </div>
  );
}
