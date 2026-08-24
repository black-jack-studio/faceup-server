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

// visibleCount caps how many of the hand's cards actually render — 1 once this hand is waiting
// (see the component doc below for why), the full hand while it's active. AnimatePresence
// animates the ones that drop out of view when a hand goes from active to waiting, instead of
// them just vanishing. layoutTracked gates `layout` on each card — see the component doc for
// why this only ever runs true for the currently active hand.
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
  const shown = cards.slice(Math.max(0, cards.length - visibleCount));
  const skipped = cards.length - shown.length;
  return (
    <div className="flex items-center">
      <AnimatePresence>
        {shown.map((card, i) => {
          const index = skipped + i;
          return (
            <motion.div
              key={index}
              layout={layoutTracked ? "position" : false}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
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
      className={cn("rounded-2xl", small ? "px-2.5 py-1" : "px-4 py-2")}
      style={{ backgroundColor: "#232227" }}
    >
      <span className={cn("font-semibold text-white", small ? "text-sm" : "text-lg")}>{total}</span>
    </motion.div>
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
// grow past its fair 50% share, which would move the *other* hand's anchor too.
//
// Each hand's own outer block always carries `layout` — that's what animates the active<->
// waiting switch itself (centered <-> pinned-to-wall, full size <-> shrunk) as one continuous
// move+resize. But the row and badge *inside* it are only layout-tracked while that hand is
// active. With several `layout`-tracked elements sharing a page, one of them changing can
// trigger a stray remeasure-and-correct micro-animation on *other* tracked elements even when
// their own real position never changed — that's what nudged the waiting hand's card a few px
// whenever a hit landed on the active one. The waiting hand's row never needs its own tracking
// anyway: it's pinned to exactly one card, so there's never an internal reflow to smooth over.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  return (
    <div className="w-full grid grid-cols-2 gap-3 items-end" style={{ height: ROW_HEIGHT }}>
      {[0, 1].map((handIndex) => {
        const hand = splitHands[handIndex];
        if (!hand) return <div key={handIndex} />;
        const isActive = handIndex === currentSplitHand;
        const isLeft = handIndex === 0;
        return (
          <div
            key={handIndex}
            className={cn("min-w-0 flex items-end", isActive ? "justify-center" : isLeft ? "justify-start" : "justify-end")}
            style={
              isActive
                ? undefined
                : { paddingLeft: isLeft ? WALL_PADDING : 0, paddingRight: isLeft ? 0 : WALL_PADDING }
            }
          >
            <motion.div layout transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }} className="flex flex-col items-center gap-2">
              <TotalBadge total={hand.total} small={!isActive} layoutTracked={isActive} />
              <HandCardRow
                cards={hand.hand}
                cardBackUrl={cardBackUrl}
                visibleCount={isActive ? hand.hand.length : 1}
                size={isActive ? (hand.hand.length >= 6 ? "xs" : "sm") : "xs"}
                layoutTracked={isActive}
              />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
