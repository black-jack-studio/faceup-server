import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/lib/blackjack/engine";
import PlayingCard from "../card";
import { CardSize } from "@/components/PlayingCard";

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
// as HandCards.
const OVERLAP_RATIO = 0.65;
const CARD_WIDTH = { sm: 80, xs: 40 } as const;
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const ROW_HEIGHT = 190;
const ACTIVE_SCALE = 1;
const WAITING_SCALE = 0.48;
// A little breathing room from the true screen edge, on top of the page's own px-5 gutter this
// component already sits inside — the anchor point, not just the cards.
const WALL_PADDING = "8px";

// visibleCount caps how many of the hand's cards actually render — 1 once this hand is waiting
// (see the component doc below for why), the full hand while it's active. AnimatePresence
// animates the ones that drop out of view when a hand goes from active to waiting, instead of
// them just vanishing. layoutTracked gates `layout` on each card and enables/disables it
// together with the row's own transform-tracking — see the component doc for why this only
// ever runs true for the currently active hand.
function HandCardRow({
  cards,
  cardBackUrl,
  visibleCount,
  layoutTracked,
}: {
  cards: Card[];
  cardBackUrl?: string | null;
  visibleCount: number;
  layoutTracked: boolean;
}) {
  const size: CardSize = cards.length >= 6 ? "xs" : "sm";
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

function TotalBadge({ total, layoutTracked }: { total: number; layoutTracked: boolean }) {
  return (
    <motion.div layout={layoutTracked ? "position" : false} className="rounded-2xl px-4 py-2" style={{ backgroundColor: "#232227" }}>
      <span className="font-semibold text-lg text-white">{total}</span>
    </motion.div>
  );
}

// Classic 21's own split view: hand 1 always lives in the left half, hand 2 always lives in
// the right half — neither one ever crosses over or changes which half it's in, for the whole
// rest of the round. What changes when the active hand switches is its scale (full size active,
// shrunk waiting) *and* how many of its own cards actually render:
//
// - Active: every card, fanned, centered within its own half — not pinned to that half's own
//   outer wall, which used to look lopsided and left less room before a long hand could reach
//   the wall than centering does.
// - Waiting: collapses down to just its *last* card + its total badge — showing a whole waiting
//   hand's cards at a shrunk scale doesn't actually save the space a two-hand split needs; one
//   card does. It's still pinned to its own outer wall (not the boundary between the hands),
//   with a fixed WALL_PADDING — that anchor never moves, so a card touching the actual screen
//   edge is structurally impossible regardless of either hand's size.
//
// This is a real 2-column CSS grid (grid-cols-2), not a flex row that happens to look similar:
// a flex row centered as one group would visibly recenter the *whole pair* — nudging the
// inactive hand sideways — the instant the active hand's card count changed the pair's total
// width. Grid tracks don't do that: each column is a fixed 50% of this component's own
// (already fixed, see table-test.tsx) width regardless of either hand's content. min-w-0 on
// each column is load-bearing: without it, a wide active hand can force its own grid track to
// grow past its fair 50% share, which would move the *other* hand's anchor too.
//
// Each hand's own outer block always carries `layout="position"` — that's what animates the
// active<->waiting switch itself (centered <-> pinned-to-wall, full size <-> shrunk). But the
// row and badge *inside* it are only layout-tracked while that hand is active. With several
// `layout`-tracked elements sharing a page, one of them changing can trigger a stray remeasure-
// and-correct micro-animation on *other* tracked elements even when their own real position
// never changed — that's what nudged the waiting hand's cards a few px whenever a hit landed on
// the active one. The waiting hand's row never needs its own tracking anyway: it's pinned to
// exactly one card, so there's never an internal reflow for it to smooth over.
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
            <motion.div
              layout="position"
              animate={{ scale: isActive ? ACTIVE_SCALE : WAITING_SCALE }}
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2"
              style={{ transformOrigin: isActive ? "bottom" : isLeft ? "bottom left" : "bottom right" }}
            >
              <TotalBadge total={hand.total} layoutTracked={isActive} />
              <HandCardRow
                cards={hand.hand}
                cardBackUrl={cardBackUrl}
                visibleCount={isActive ? hand.hand.length : 1}
                layoutTracked={isActive}
              />
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
