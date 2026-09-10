import { useEffect, useRef, useState } from "react";
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
// smoothly, then turns off once it's actually done (see useSettledLayoutTracking below). Was
// 0.5 — slower reads as more deliberate for a move+resize this size (wall <-> center, xs <-> sm)
// instead of a quick snap-ish tween.
const SWITCH_DURATION = 0.7;
// Pulls the active hand back toward its own side instead of sitting dead-center of the full
// width it's actually centered within — roughly the same visual bias the earlier 75/25 grid
// gave it, without needing a second column to produce it.
const ACTIVE_SIDE_BIAS = 60;

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
  handIndex,
  firstCardLayoutId,
  alreadyRevealedCount,
}: {
  cards: Card[];
  cardBackUrl?: string | null;
  visibleCount: number;
  size: "sm" | "xs";
  layoutTracked: boolean;
  // Which hand this row belongs to — folded into every card's own layoutId below so hand0's
  // card 1 and hand1's card 1 never collide on the same id.
  handIndex: number;
  // Bridges this hand's very first card back to the single-hand pair it was split from (see
  // HandCards' own `cardLayoutIdPrefix`) — only ever passed while this hand still has exactly
  // that one card (right after the split, before either hand has been hit), so it's undefined
  // again the moment a real distinction between "the original card" and "a drawn one" stops
  // mattering.
  firstCardLayoutId?: string;
  // How many of this hand's cards (counting from index 0) had already played their own reveal
  // flip before *this* render — see SplitHandsCenterSide's own comment on why this has to be
  // tracked up there instead of here: HandBlock (and this row with it) now genuinely unmounts
  // and remounts on every active<->waiting switch, which would otherwise replay every one of a
  // hand's cards' back->front flip each time, not just a freshly-hit one.
  alreadyRevealedCount: number;
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
          // This exact card is the one continuing straight out of the pre-split pair (see
          // HandCards' `cardLayoutIdPrefix`) — it should just pick up wherever that one already
          // was via the shared layoutId FLIP below, not pop-in-from-nothing like a freshly
          // dealt/hit card does.
          const isContinuingFromSplit = index === 0 && !!firstCardLayoutId;
          // This card (any index) already played its own reveal on an earlier render, before
          // this row's current remount — a genuinely new (just-hit) card is never below this
          // count (see alreadyRevealedCount's own doc above), so this only ever catches cards
          // that are just here again because the whole row remounted, not because they're new.
          const alreadyRevealed = isContinuingFromSplit || index < alreadyRevealedCount;
          // A stable id for *this* card, scoped to its own hand so hand0's card 1 never
          // collides with hand1's card 1 — given to every already-revealed card, not just the
          // split-continuity one, so each one individually FLIPs to its new spot across a
          // switch's remount instead of just popping straight there while the block around it
          // (which does carry its own layoutId, see HandBlock) visibly resizes/moves smoothly.
          const cardLayoutId = isContinuingFromSplit ? firstCardLayoutId : `split-card-${handIndex}-${index}`;
          return (
            <motion.div
              key={index}
              layoutId={alreadyRevealed ? cardLayoutId : undefined}
              layout={layoutTracked ? "position" : false}
              initial={alreadyRevealed ? false : { opacity: 0, scale: 0.6 }}
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
              <PlayingCard
                suit={card.suit}
                value={card.value}
                size={size}
                cardBackUrl={cardBackUrl}
                // This card was already showing face-up a moment ago — skip PlayingCard's own
                // back->front reveal, which otherwise always plays on a fresh mount regardless
                // of a shared layoutId on an ancestor: layoutId only carries an element's
                // *position*, not this inner card's own flip state, across a remount.
                skipFlip={alreadyRevealed}
              />
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
      // Full `layout` (not "position") once minWidth below took digit-count width changes off
      // the table: "position" mode was never really about the parent-scale interaction, it
      // opts OUT of framer's automatic counter-scale correction (the thing that keeps a motion
      // child's own content looking un-distorted while its layout-animating parent — HandBlock
      // — is itself being visually scaled up/down during the switch). Without that correction,
      // this text inherited the parent's scale transform directly and rendered visibly skewed
      // (confirmed via screenshot: the number came out slanted/stretched mid-transition). Full
      // layout tracking gets that correction back, and now that minWidth already stops this
      // element's own width from changing, there's nothing left for full layout to mis-animate
      // the way the old comment described.
      layout={layoutTracked}
      className="text-center flex items-center justify-center"
      // A fixed min-width, not just padding: without it, this tracks the number's digit count
      // (e.g. "9" vs "22"), and since it sits inside a `layout`-tracked parent, that width
      // change got caught up in the parent's own size interpolation — read as visibly squeezing
      // shut and popping back open around the new number. A width that never changes has
      // nothing to interpolate.
      style={{ minWidth: small ? 28 : 44 }}
    >
      <span className={cn("font-semibold text-white", small ? "text-base" : "text-xl")}>{total}</span>
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

function HandBlock({
  hand,
  isActive,
  isLeft,
  handIndex,
  cardBackUrl,
  alreadyRevealedCount,
}: {
  hand: SplitHand;
  isActive: boolean;
  isLeft: boolean;
  handIndex: number;
  cardBackUrl?: string | null;
  // See SplitHandsCenterSide's own doc on why this lives up there and gets threaded down
  // through here instead of being tracked locally — this component is now keyed by which hand
  // occupies its slot (see the caller), so it genuinely unmounts and remounts on every
  // active<->waiting switch and can't remember anything across that itself.
  alreadyRevealedCount: number;
}) {
  const layoutTracked = useSettledLayoutTracking(isActive);
  return (
    <motion.div
      // handIndex (which underlying hand this is — 0 or 1, never changes for a given hand),
      // NOT isLeft: isLeft flips for both the active and waiting slot on every switch, which
      // used to make this element's own layoutId flip too. The caller now keys each slot's
      // instance by which hand actually occupies it, so a switch is a genuine unmount in one
      // slot + a genuine mount in the other — handIndex staying constant for a given hand is
      // what lets Framer recognize "the element that just appeared here used to be the one
      // that just left over there" and FLIP between them instead of snapping.
      layoutId={`split-hand-${handIndex}`}
      layout
      // The center slot spans the full width, so centering alone puts every active hand at
      // true dead-center — this pulls it back over toward its own side (roughly the same
      // 75/25 bias the grid version had), via a plain animatable x offset rather than
      // anything that could make the slot itself reflow.
      animate={{ x: isActive ? (isLeft ? -ACTIVE_SIDE_BIAS : ACTIVE_SIDE_BIAS) : 0 }}
      // delay on the way IN only: without it, the hand becoming active (traveling from its
      // wall toward the center) and the hand becoming waiting (traveling from the center
      // toward its wall) both start at the same instant, moving in opposite directions through
      // the same middle stretch of screen at the same time — that's what actually reads as the
      // two hands' cards crossing/swapping places rather than one shrinking while the other
      // grows. Letting the outgoing hand get a head start clears the center before the
      // incoming one arrives there.
      transition={{
        type: "tween",
        duration: SWITCH_DURATION,
        ease: "easeInOut",
        delay: isActive ? SWITCH_DURATION * 0.3 : 0,
      }}
      className="flex flex-col items-center gap-1"
    >
      <TotalBadge total={hand.total} small={!isActive} layoutTracked={layoutTracked} />
      <HandCardRow
        cards={hand.hand}
        cardBackUrl={cardBackUrl}
        visibleCount={isActive ? hand.hand.length : 1}
        size={isActive ? (hand.hand.length >= 6 ? "xs" : "sm") : "xs"}
        layoutTracked={layoutTracked}
        handIndex={handIndex}
        // Only while this hand still has exactly the one card it was split with — the moment
        // it's hit, its first card stops being "the thing that used to be half of the pair"
        // and just becomes a normal card in a normal hand, no different from any other.
        firstCardLayoutId={hand.hand.length === 1 ? `split-card-${handIndex}` : undefined}
        alreadyRevealedCount={alreadyRevealedCount}
      />
    </motion.div>
  );
}

// Classic 21's own split view: hand 1 always lives in the left half, hand 2 always lives in
// the right half — neither one ever crosses over or changes which half it's in, for the whole
// rest of the round. What changes when the active hand switches is its size and how many of
// its own cards actually render:
//
// - Active: every card, at full ("sm", shrinking to "xs" past 6 cards) size, fanned, centered
//   across the *entire* width (not confined to a half) — the room to grow into on either side
//   before reaching a wall or the waiting hand is what actually matters here, and confining it
//   to any fixed-width column (even a generous one) put a ceiling on that no matter how it was
//   sized.
// - Waiting: collapses down to just its *last* card + its total badge, both rendered at a
//   genuinely smaller size ("xs" card, a smaller badge) — not a full-size card shrunk with a
//   CSS transform. A `transform: scale()` only ever changes paint, never the element's own
//   layout box, so `items-end` (which aligns layout boxes) was aligning the *unscaled* box —
//   the shrunk card visually floated above the active hand's own baseline instead of sharing
//   it. Real card sizes make what's on screen and what layout measures the same thing, so the
//   shared bottom edge is exact. It's pinned to its own outer wall with a fixed WALL_PADDING —
//   that anchor never moves, so a card touching the actual screen edge is impossible.
//
// This is two absolutely-positioned slots inside one relative container, not a CSS grid whose
// column widths change with the active hand — that was the actual cause of the switch
// noticeably teleporting to the middle before sliding into place: grid-template-columns isn't
// an animatable CSS property, so the grid reflowed *instantly* the moment the active hand
// changed, and only *then* did Framer's own layout animation pick up from that already-jumped
// position. Two fixed slots (the center one spanning the *full* width, the side one pinned to
// whichever wall is unoccupied) never themselves move or resize — only their *contents* do, via
// Framer's `layout`, which is what makes it interpolate smoothly starting from wherever the
// hand actually was, in step with the drag/hit that got it there.
//
// A hand's own block carries a stable layoutId keyed by *which underlying hand it is* (index
// 0 or 1 in splitHands — see HandBlock's own comment for why side/slot would be wrong here),
// so a switch is a genuine FLIP: Framer picks up that "the element with this id used to be in
// the center slot, and it's still here, just with new props" and animates the move+resize as
// one continuous transition — same idea as the very first version of this view (before it
// became a fixed-slot grid), just applied to a layout that can't itself glitch.
//
// Each hand's own block always carries `layout` — that's what animates the active<->waiting
// switch itself (full width <-> pinned-to-wall, full size <-> shrunk) as one continuous
// move+resize. The row and badge inside it stay layout-tracked through that same transition
// (see useSettledLayoutTracking) so the shrinking content animates smoothly *with* the block
// instead of snapping to its final compact size the instant the switch starts. Tracking only
// turns off once a hand is genuinely settled into waiting, which is what actually guarantees it
// can never be nudged by a sibling's changes afterward — several `layout`-tracked elements
// sharing a page can otherwise trigger a stray remeasure-and-correct micro-animation on each
// other even when a given one's own real position never changed.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  const waitingIndex = currentSplitHand === 0 ? 1 : 0;
  const activeHand = splitHands[currentSplitHand];
  const waitingHand = splitHands[waitingIndex];
  const waitingIsLeft = waitingIndex === 0;

  // How many of each hand's cards had already played their own reveal flip before *this*
  // render — lives here, not inside HandBlock, because HandBlock is now keyed by which hand
  // occupies its slot (see below) and genuinely unmounts/remounts on every active<->waiting
  // switch, which would otherwise replay every one of a hand's cards' flip each time, not just
  // a freshly-hit one. This component itself never remounts on a switch, so a ref here
  // survives across it. Read during render (still holding last render's counts — a card that
  // just got hit is never below that), then caught up after paint so the *next* remount treats
  // it as already-seen too.
  const revealedCountsRef = useRef<number[]>([0, 0]);
  useEffect(() => {
    splitHands.forEach((hand, i) => {
      revealedCountsRef.current[i] = Math.max(revealedCountsRef.current[i] ?? 0, hand.hand.length);
    });
  });

  return (
    <div className="relative w-full" style={{ height: ROW_HEIGHT }}>
      <div className="absolute inset-0 flex items-end justify-center">
        {/* key={currentSplitHand}, not left implicit: without it, this JSX slot is one
            persistent React instance for the whole round, and a switch just hands it the
            OTHER hand's data — its own layoutId prop (handIndex) then changes underneath it
            (0 -> 1 or back), which is two already-mounted instances trading ids in the same
            commit, the exact thing layoutId can't FLIP cleanly (see HandBlock's own comment).
            A key tied to which hand actually occupies this slot forces a genuine unmount here
            + a genuine mount in the OTHER slot below whenever the active hand changes, so the
            layoutId transfer is a real one-instance-leaves / another-appears handoff — the
            actual case layoutId is built for. */}
        {activeHand && (
          <HandBlock
            key={currentSplitHand}
            hand={activeHand}
            isActive
            isLeft={currentSplitHand === 0}
            handIndex={currentSplitHand}
            cardBackUrl={cardBackUrl}
            alreadyRevealedCount={revealedCountsRef.current[currentSplitHand] ?? 0}
          />
        )}
      </div>
      <div
        className={cn("absolute bottom-0 flex items-end", waitingIsLeft ? "left-0" : "right-0")}
        style={{ paddingLeft: waitingIsLeft ? WALL_PADDING : 0, paddingRight: waitingIsLeft ? 0 : WALL_PADDING }}
      >
        {waitingHand && (
          <HandBlock
            key={waitingIndex}
            hand={waitingHand}
            isActive={false}
            isLeft={waitingIsLeft}
            handIndex={waitingIndex}
            cardBackUrl={cardBackUrl}
            alreadyRevealedCount={revealedCountsRef.current[waitingIndex] ?? 0}
          />
        )}
      </div>
    </div>
  );
}
