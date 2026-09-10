import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
// The waiting hand's cards converge onto this tight a stack instead of the active fan's step —
// small enough to read as one pile with the most recent card on top, not a second fanned hand.
const WAITING_STACK_OFFSET = 4;
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const ROW_HEIGHT = 190;
// A little breathing room from the true screen edge, on top of the page's own px-5 gutter this
// component already sits inside — the anchor point, not just the cards.
const WALL_PADDING = "8px";
// How long the active<->waiting switch transition itself runs — layout tracking on the row/
// badge stays on for this long after a hand goes inactive, so the shrink itself still animates
// smoothly, then turns off once it's actually done (see useSettledLayoutTracking below).
const SWITCH_DURATION = 0.7;
// Pulls the active hand back toward its own side instead of sitting dead-center of the full
// width it's actually centered within — roughly the same visual bias the earlier 75/25 grid
// gave it, without needing a second column to produce it.
const ACTIVE_SIDE_BIAS = 60;

// Every one of the hand's cards is always mounted here, active or waiting — never sliced down
// to just the last one. What changes with `isActive` is how tightly they overlap: the active
// fan's usual step, or WAITING_STACK_OFFSET's tight stack (later cards, higher zIndex, sit on
// top of earlier ones — "6 lands on the 3, 5 lands on the 6"). Because nothing here ever
// unmounts on that switch, there's no exit/fade to choreograph and nothing to desync: every
// card gets the exact same `layout` FLIP, on the exact same timeline, so the whole hand always
// reads as one stack gathering together or fanning back out — never one card racing ahead of
// (or lagging behind) the rest. layoutTracked gates `layout` on each card.
function HandCardRow({
  cards,
  cardBackUrl,
  isActive,
  size,
  layoutTracked,
  firstCardLayoutId,
}: {
  cards: Card[];
  cardBackUrl?: string | null;
  isActive: boolean;
  size: "sm" | "xs";
  layoutTracked: boolean;
  // Bridges this hand's very first card back to the single-hand pair it was split from (see
  // HandCards' own `cardLayoutIdPrefix`) — only ever passed while this hand still has exactly
  // that one card (right after the split, before either hand has been hit), so it's undefined
  // again the moment a real distinction between "the original card" and "a drawn one" stops
  // mattering. This is the one spot in this component that still bridges across a genuine
  // mount/unmount boundary (HandCards -> here) — everything else below is a single persisting
  // hand block for the whole round (see the component doc), so nothing else needs this.
  firstCardLayoutId?: string;
}) {
  const cardWidth = CARD_WIDTH[size];
  const activeStep = cardWidth * OVERLAP_RATIO - cardWidth;
  return (
    <div className="flex items-center">
      {cards.map((card, index) => {
        // This exact card is the one continuing straight out of the pre-split pair (see
        // HandCards' `cardLayoutIdPrefix`) — it should just pick up wherever that one already
        // was via the shared layoutId FLIP below, not pop-in-from-nothing like a freshly
        // dealt/hit card does.
        const isContinuingFromSplit = index === 0 && !!firstCardLayoutId;
        const marginLeft = index === 0 ? 0 : isActive ? activeStep : WAITING_STACK_OFFSET;
        return (
          <motion.div
            key={index}
            layoutId={isContinuingFromSplit ? firstCardLayoutId : undefined}
            // Full layout (position AND size together), not "position" alone: this card's own
            // `size` prop (sm <-> xs, set by HandBlock below) changes in the very same render
            // `isActive` does, and "position" mode explicitly ignores size changes when
            // deciding what to animate — that let the size snap instantly while only the
            // position glided in afterward, which is what read as a newly-active hand's card
            // popping to full size (at the wall) before it had even started moving over.
            layout={layoutTracked}
            initial={isContinuingFromSplit ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1, x: 0, transition: { duration: 0.3, ease: "easeInOut" } }}
            // Named `layout` only: this card's own position/size shifting between the fan and
            // the stack should move in step with the block around it, not framer's unrelated
            // default speed. No per-card delay anywhere here — every card shares this exact
            // timeline.
            transition={{ layout: { type: "tween", duration: SWITCH_DURATION, ease: "easeInOut" } }}
            style={{ marginLeft, position: "relative", zIndex: index }}
          >
            <PlayingCard
              suit={card.suit}
              value={card.value}
              size={size}
              cardBackUrl={cardBackUrl}
              // This card was already showing face-up a moment ago (see the layoutId right
              // above) — skip PlayingCard's own back->front reveal, which otherwise always
              // plays on a fresh mount regardless of a shared layoutId on an ancestor:
              // layoutId only carries an element's *position*, not this inner card's own
              // flip state, across a remount.
              skipFlip={isContinuingFromSplit}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

function TotalBadge({
  total,
  small,
  layoutTracked,
  revealed,
}: {
  total: number;
  small: boolean;
  layoutTracked: boolean;
  // False for the SWITCH_DURATION right after this hand's `isActive` changes — including its
  // very first mount right after a fresh split (see `useSettledReveal` above) — kept opacity-0
  // rather than unmounted, so it never has to reflow into existence later, but invisible
  // specifically because it sits inside the same `layout`-tracked hand block as its own card,
  // which is mid-FLIP for that whole window, and gets swept into the same projection
  // recalculation — otherwise visibly starting this number from a stale, inherited position
  // (the middle of the screen right after a split; half off past the wall on becoming active)
  // instead of just appearing already in place. Whatever wrong position that produces is
  // harmless while it's invisible — by the time `revealed` flips true the FLIP has already
  // finished, so this fades in already sitting exactly where it belongs.
  revealed: boolean;
}) {
  return (
    <motion.div
      // Full `layout` (not "position") once minWidth below took digit-count width changes off
      // the table: "position" mode opts OUT of framer's automatic counter-scale correction —
      // the thing that keeps a motion child's own content looking undistorted while its
      // layout-animating parent (the hand block) is itself being visually resized during the
      // switch. Without that correction this text rendered visibly skewed. Full layout
      // tracking gets the correction back, and minWidth already stops this element's own width
      // from changing on its own, so there's nothing left for full layout to mis-animate.
      layout={layoutTracked}
      initial={{ opacity: 0 }}
      animate={{ opacity: revealed ? 1 : 0 }}
      // Named per-value (layout / opacity): the reveal fade should always run at its own quick
      // pace, never inherit the parent hand block's much longer SWITCH_DURATION tween just
      // because both happen to be animating at once.
      transition={{
        layout: { type: "tween", duration: SWITCH_DURATION, ease: "easeInOut" },
        opacity: { duration: 0.15, ease: "easeOut" },
      }}
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
//
// Turning ON, by contrast, has to happen in the exact same render `isActive` itself flips true
// in — not one render later. `isActive` and this hand's card `size`/`marginLeft` (see
// HandCardRow) are derived from the very same prop in the very same render, so if tracking only
// caught up a render afterward, the size/position change had already painted untracked (with
// no FLIP at all) by the time tracking switched on — nothing left for it to smoothly animate.
// That one-render lag, from going through useState+useEffect for both edges, was the real cause
// of a newly-active hand's card popping straight to full size before sliding over. The plain
// `useState(isActive)` + effect version above only fixes the *off* edge's own timing; this ref
// comparison during render (React's documented way to derive state synchronously from a changed
// prop, safe from render loops because it's guarded by the comparison itself) fixes the *on*
// edge the same way, without touching the *off* edge's own deliberate delay.
function useSettledLayoutTracking(isActive: boolean): boolean {
  const [tracked, setTracked] = useState(isActive);
  const prevIsActive = useRef(isActive);
  if (prevIsActive.current !== isActive) {
    prevIsActive.current = isActive;
    if (isActive) setTracked(true);
  }
  useEffect(() => {
    if (isActive) return;
    const t = setTimeout(() => setTracked(false), SWITCH_DURATION * 1000);
    return () => clearTimeout(t);
  }, [isActive]);
  return tracked;
}

// True whenever this hand's total badge isn't sitting on a card that's currently mid-move —
// false for the SWITCH_DURATION right after `isActive` changes (either direction, including
// this hand's very first mount right after a fresh split — see the effect running on mount
// too), true the rest of the time. TotalBadge's own opacity gates on this instead of trying to
// track the moving card, so the number never has to be positioned correctly mid-flight (that's
// what visibly started it from a stale, inherited position instead of appearing already in
// place, and — for the hand becoming active — left it rendering half off past the wall for a
// beat) — it just isn't there to look wrong until the card it belongs to has actually stopped.
function useSettledReveal(isActive: boolean): boolean {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), SWITCH_DURATION * 1000);
    return () => clearTimeout(t);
  }, [isActive]);
  return revealed;
}

function HandBlock({
  hand,
  isActive,
  isLeft,
  firstCardLayoutId,
  cardBackUrl,
}: {
  hand: SplitHand;
  isActive: boolean;
  isLeft: boolean;
  firstCardLayoutId?: string;
  cardBackUrl?: string | null;
}) {
  const layoutTracked = useSettledLayoutTracking(isActive);
  const revealed = useSettledReveal(isActive);
  return (
    <motion.div
      // No layoutId: this is one persistent element for the WHOLE round (see the component
      // doc — it's rendered once per hand, keyed by that hand's own index, and never
      // unmounts), so there's no separate element anywhere to bridge identity with. Earlier
      // versions of this switch used two fixed *slots* (an "active" one and a "waiting" one)
      // that each showed "whichever hand is currently mine" — meaning a switch handed the SAME
      // persistent slot instance a new layoutId (keyed by the newly-arrived hand), which is two
      // already-mounted elements trading ids in one commit, not a real unmount/mount pair, and
      // Framer couldn't FLIP that cleanly (confirmed repeatedly via video: a card would
      // instantly snap or render oversized in the wrong spot for a frame). Rendering by *hand*
      // instead of by *slot* means this exact element just changes ITS OWN size and position as
      // `isActive` toggles — plain `layout` on a persisting element is the ordinary, reliable
      // case Framer is built around, not the edge case above.
      layout
      // Active: spans the full width so it can center itself (with the bias below) across the
      // whole row, exactly like the old "center slot" div did. Waiting: shrinks to its own
      // content's width and pins to its own wall — always the same side for a given hand
      // (isLeft never changes), with a little breathing room from the true screen edge.
      className={cn(
        "absolute bottom-0 flex flex-col items-center gap-1",
        isActive ? "inset-x-0" : isLeft ? "left-0" : "right-0"
      )}
      style={
        isActive
          ? undefined
          : { paddingLeft: isLeft ? WALL_PADDING : 0, paddingRight: isLeft ? 0 : WALL_PADDING }
      }
      // The center position spans the full width, so centering alone puts every active hand at
      // true dead-center — this pulls it back over toward its own side (roughly the same 75/25
      // bias the grid version had), via a plain animatable x offset rather than anything that
      // could make the slot itself reflow.
      animate={{ x: isActive ? (isLeft ? -ACTIVE_SIDE_BIAS : ACTIVE_SIDE_BIAS) : 0 }}
      // Named per-value (layout / x): a flat transition object reliably drives the explicit `x`
      // bias, but didn't obviously extend to the automatic `layout` FLIP (the real wall<->center
      // move + xs<->sm resize) on its own — naming both explicitly forces them onto the exact
      // same timeline, which is what makes it read as one continuous glide+grow. The delay on
      // the way IN only: without it, the hand becoming active (traveling from its wall toward
      // the center) and the hand becoming waiting (traveling from the center toward its wall)
      // both start at the same instant, moving in opposite directions through the same middle
      // stretch of screen at the same time — that's what actually reads as the two hands'
      // cards crossing/swapping places rather than one shrinking while the other grows. Letting
      // the outgoing hand get a head start clears the center before the incoming one arrives
      // there.
      transition={{
        layout: {
          type: "tween",
          duration: SWITCH_DURATION,
          ease: "easeInOut",
          delay: isActive ? SWITCH_DURATION * 0.3 : 0,
        },
        x: {
          type: "tween",
          duration: SWITCH_DURATION,
          ease: "easeInOut",
          delay: isActive ? SWITCH_DURATION * 0.3 : 0,
        },
      }}
    >
      <TotalBadge total={hand.total} small={!isActive} layoutTracked={layoutTracked} revealed={revealed} />
      <HandCardRow
        cards={hand.hand}
        cardBackUrl={cardBackUrl}
        isActive={isActive}
        size={isActive ? (hand.hand.length >= 6 ? "xs" : "sm") : "xs"}
        layoutTracked={layoutTracked}
        firstCardLayoutId={firstCardLayoutId}
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
// - Waiting: every one of its cards stays mounted (see HandCardRow above) but converges onto a
//   tight stack — the most recently dealt card on top — and every one renders at a genuinely
//   smaller size ("xs" card, a smaller badge), not a full-size card shrunk with a CSS transform.
//   A `transform: scale()` only ever changes paint, never the element's own layout box, so
//   `items-end` (which aligns layout boxes) was aligning the *unscaled* box — the shrunk card
//   visually floated above the active hand's own baseline instead of sharing it. Real card
//   sizes make what's on screen and what layout measures the same thing, so the shared bottom
//   edge is exact. It's pinned to its own outer wall with a fixed WALL_PADDING — that anchor
//   never moves, so a card touching the actual screen edge is impossible.
//
// Each hand gets exactly ONE persistent element for the entire round, rendered by mapping over
// `splitHands` and keying by each hand's own index — NOT two fixed "slots" (an active one, a
// waiting one) that each show "whichever hand is currently mine". The slot-based version's
// deeper problem wasn't just its layoutId bookkeeping: it meant an ordinary switch or hit
// forced the whole subtree (cards included) to unmount and remount so the two slots could trade
// which hand's data they held, which brought a pile of its own second-order bugs (every card
// replaying its reveal flip on a switch, layout-tracking timers restarting from the wrong
// state, and so on) that each needed their own workaround. Rendering by *hand* sidesteps all of
// it at once: the element backing a given hand never goes away for the whole round, so React
// never has a reason to remount it, and everything below (PlayingCard's own mount state,
// useSettledLayoutTracking's timer) just keeps working the ordinary way. `layout` on that
// persisting element is what animates the active<->waiting switch itself (full width <->
// pinned-to-wall, full size <-> shrunk) as one continuous move+resize, exactly the mainstream
// case Framer's layout animation is built around — not the "two already-mounted elements
// trading identity" edge case the slot-based version relied on.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  return (
    <div className="relative w-full" style={{ height: ROW_HEIGHT }}>
      {splitHands.map((hand, index) => (
        <HandBlock
          key={index}
          hand={hand}
          isActive={index === currentSplitHand}
          isLeft={index === 0}
          cardBackUrl={cardBackUrl}
          // Only while this hand still has exactly the one card it was split with — the
          // moment it's hit, its first card stops being "the thing that used to be half of the
          // pair" and just becomes a normal card in a normal hand, no different from any other.
          firstCardLayoutId={hand.hand.length === 1 ? `split-card-${index}` : undefined}
        />
      ))}
    </div>
  );
}
