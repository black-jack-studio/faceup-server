import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
// as HandCards. The waiting hand always renders at a real xs-sized box (see the component doc
// for why that's a real box, not a CSS scale) — but see REFERENCE_SIZE below for how that box
// actually gets its content drawn at that size without redrawing it.
const OVERLAP_RATIO = 0.65;
const CARD_WIDTH = { sm: 80, xs: 40 } as const;
const CARD_HEIGHT = { sm: 115, xs: 58 } as const;
// PlayingCard itself is always rendered at this one size in here, full stop — every visual size
// this row ever shows (sm, xs, or mid-FLIP between them) is a uniform CSS scale of that single
// "sm" render, via the inner wrapper in HandCardRow below, never a re-render of PlayingCard at a
// different `size` prop. Framer's automatic counter-scale correction — the thing that's supposed
// to keep a layout-animating parent's content undistorted while its own box resizes — doesn't
// reliably reach through PlayingCard's own inner rotateY flip wrapper (card.tsx), which sits
// between this row's box and the actual rank/suit text with no layout tracking of its own. In
// practice that meant a card whose OUTER box was still mid-FLIP (interpolating from sm to xs)
// had its rank/suit *already* snapped to xs's own smaller pixel values the instant the `size`
// prop changed — a card that still looked big with digits rendering tiny inside it for a beat.
// A single uniform `scale` transform can't produce that mismatch: it scales the whole rendered
// card — background, digit, suit glyph, padding, corner radius, all of it — together, by
// definition, so the two can never drift apart the way independently-sized renders did.
const REFERENCE_SIZE = "sm" as const;
const REFERENCE_WIDTH = CARD_WIDTH[REFERENCE_SIZE];
const REFERENCE_HEIGHT = CARD_HEIGHT[REFERENCE_SIZE];
// The waiting hand's cards converge onto this tight a stack instead of the active fan's step —
// just enough to read as one pile with the most recent card on top (a sliver of each card
// behind's own edge/shadow peeking out), not two full cards sitting visibly side by side.
const WAITING_STACK_OFFSET = 2;
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const ROW_HEIGHT = 190;
// A little breathing room from the true screen edge, on top of the page's own px-5 gutter this
// component already sits inside — the anchor point, not just the cards. A plain number (not a
// CSS px string) because it now feeds straight into HandBlock's own explicit x-position math
// (see WAITING_BOX_WIDTH and HandBlock below), not a padding style.
const WALL_PADDING_PX = 8;
// The waiting hand's own box width — wide enough to comfortably fit its badge (up to 44px, see
// TotalBadge) or its card stack (40px plus a couple of WAITING_STACK_OFFSET peeks) without
// clipping either, with a few px to spare. Deliberately a fixed number, not measured from actual
// content: HandBlock positions this whole box by explicit pixel math (see its own comment), and
// a box whose own width also depended on a measurement would need that measurement to already be
// known before the very first paint too — one fixed constant both hands share removes that
// entirely, at the cost of never being pixel-perfectly tight around a given hand's own content.
const WAITING_BOX_WIDTH = 56;
// How long the active<->waiting switch transition itself runs — layout tracking on the row/
// badge stays on for this long after a hand goes inactive, so the shrink itself still animates
// smoothly, then turns off once it's actually done (see useSettledLayoutTracking below).
const SWITCH_DURATION = 0.7;
// Pulls the active hand back toward its own side instead of sitting dead-center of the full
// width it's actually centered within — roughly the same visual bias the earlier 75/25 grid
// gave it, without needing a second column to produce it.
const ACTIVE_SIDE_BIAS = 60;
// The becoming-active hand's own container doesn't start its move until this far into the
// switch (see HandBlock's transition below) — the outgoing hand gets a head start clearing the
// center before the incoming one arrives. Shared with useSettledReveal so the total badge's own
// reveal timer knows to wait this much longer too, on that side specifically.
const ACTIVE_ENTER_DELAY = SWITCH_DURATION * 0.3;

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
  const targetWidth = CARD_WIDTH[size];
  const targetHeight = CARD_HEIGHT[size];
  const activeStep = targetWidth * OVERLAP_RATIO - targetWidth;
  const contentScale = targetWidth / REFERENCE_WIDTH;
  // Waiting: each later card overlaps almost the entire one before it — WAITING_STACK_OFFSET is
  // how much of it still peeks out (a sliver, not a second visible card) — instead of sitting
  // beside it the way the active fan's positive step does.
  const waitingStep = -(targetWidth - WAITING_STACK_OFFSET);
  return (
    // Natural height (the tallest card currently showing), same as before REFERENCE_HEIGHT was
    // ever introduced here: this row is the last child of a bottom-anchored block (see
    // HandBlock), so its own bottom edge already lines up with that anchor regardless of height
    // — a waiting hand's small card and an active hand's big card share that exact same bottom
    // line for free. Fixing this row's height to always the *tallest* size it ever shows, to
    // stop a becoming-active card's growth from also reading as drifting upward, instead broke
    // that shared line: with items-center vertically centering a smaller card inside a band
    // sized for the bigger one, waiting's own card floated well above where the active card's
    // own bottom sits, not on it.
    <div className="flex items-center">
      {cards.map((card, index) => {
        // This exact card is the one continuing straight out of the pre-split pair (see
        // HandCards' `cardLayoutIdPrefix`) — it should just pick up wherever that one already
        // was via the shared layoutId FLIP below, not pop-in-from-nothing like a freshly
        // dealt/hit card does.
        const isContinuingFromSplit = index === 0 && !!firstCardLayoutId;
        const marginLeft = index === 0 ? 0 : isActive ? activeStep : waitingStep;
        return (
          <motion.div
            key={index}
            layoutId={isContinuingFromSplit ? firstCardLayoutId : undefined}
            // "position" only, deliberately: this outer box's own width/height are driven
            // explicitly below (targetWidth/targetHeight, animated via plain `animate`, not
            // framer's layout-projection system) specifically so the FLIP here only ever has to
            // reconcile *position* — the one thing "position" mode is built to do robustly. Full
            // `layout` tried to also FLIP the box's *size* through the same projection/counter-
            // scale mechanism that doesn't reliably reach this card's actual content (see
            // REFERENCE_WIDTH's comment) — this sidesteps that entirely rather than trying to
            // fix the correction itself.
            layout={layoutTracked ? "position" : false}
            initial={isContinuingFromSplit ? false : { opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              width: targetWidth,
              height: targetHeight,
              transition: {
                opacity: { duration: 0.3, ease: "easeInOut" },
                scale: { duration: 0.3, ease: "easeInOut" },
                x: { duration: 0.3, ease: "easeInOut" },
                // The real size change — same timeline as the position FLIP and the hand block
                // around it, on every card alike (freshly hit or not), so a switch never has one
                // card's box resizing on a different clock than its own position glide.
                width: { duration: SWITCH_DURATION, ease: "easeInOut" },
                height: { duration: SWITCH_DURATION, ease: "easeInOut" },
              },
            }}
            // Named `layout` only: this card's own position shifting between the fan and the
            // stack should move in step with the block around it, not framer's unrelated default
            // speed. No per-card delay anywhere here — every card shares this exact timeline.
            transition={{ layout: { type: "tween", duration: SWITCH_DURATION, ease: "easeInOut" } }}
            style={{ marginLeft, position: "relative", zIndex: index }}
          >
            <motion.div
              // PlayingCard itself never redraws at a different size in here (see
              // REFERENCE_WIDTH) — this uniform scale is the one and only thing that makes it
              // look bigger or smaller, so the digit/suit and the card around them can never
              // drift out of proportion with each other.
              animate={{ scale: contentScale, transition: { duration: SWITCH_DURATION, ease: "easeInOut" } }}
              // Absolute, pinned to the outer box's own top-left corner: this inner div is
              // always REFERENCE_WIDTH/HEIGHT (the "sm" card's real pixel size) regardless of
              // what the outer box's own explicit, animated width/height currently is — sitting
              // in normal flow would make it overflow that box in *layout* terms (even though
              // the scale transform above already makes it *look* exactly the right size), which
              // risked feeding a wrong, unscaled measurement back into the outer element's own
              // "position"-only layout FLIP above.
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: REFERENCE_WIDTH,
                height: REFERENCE_HEIGHT,
                transformOrigin: "top left",
              }}
            >
              <PlayingCard
                suit={card.suit}
                value={card.value}
                size={REFERENCE_SIZE}
                cardBackUrl={cardBackUrl}
                // This card was already showing face-up a moment ago (see the layoutId right
                // above) — skip PlayingCard's own back->front reveal, which otherwise always
                // plays on a fresh mount regardless of a shared layoutId on an ancestor:
                // layoutId only carries an element's *position*, not this inner card's own
                // flip state, across a remount.
                skipFlip={isContinuingFromSplit}
              />
            </motion.div>
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
    // Becoming-active hands don't even start moving until ACTIVE_ENTER_DELAY in (see HandBlock's
    // transition) — revealing on a flat SWITCH_DURATION timer fired while that hand's own
    // container was still finishing its move, the badge popping in visibly ahead of the card
    // settling. Waiting hands have no such head-start delay, so their own timer is unaffected.
    const delay = (isActive ? SWITCH_DURATION + ACTIVE_ENTER_DELAY : SWITCH_DURATION) * 1000;
    const t = setTimeout(() => setRevealed(true), delay);
    return () => clearTimeout(t);
  }, [isActive]);
  return revealed;
}

// The active<->waiting switch used to move each hand's box by changing *what CSS positions it*
// (a content-width box pinned to its own wall <-> a full-width box centered via flexbox), with
// Framer's `layout` FLIP smoothing the difference — three attempts at reconciling that FLIP with
// this hand's own side bias (a separate x transform; then asymmetric padding) each still read as
// a curve, not the straight line this switch is supposed to be. The FLIP's own transform carries
// a scale component whenever the box's *width* is changing (which it always was, waiting's narrow
// box <-> active's full width) — and a still-nested, independently layout-tracked child (this
// hand's own card, its total badge) composing a translate *of its own* with an ancestor's
// simultaneously-changing scale is exactly what bends a straight line into an arc, no matter which
// element the bias itself lived on.
//
// This sidesteps the FLIP system for this one move entirely: HandBlock now sits at a fixed
// `left: 0` always (never toggling to `right-0`/`inset-x-0`), and both its literal pixel position
// (`x`) and width are explicit, measured, plain `animate` values — ordinary motion values with no
// scale hidden inside them, so nothing downstream can misread one relative to the other, and the
// result is guaranteed linear in transform-space. That needs this row's actual on-device width in
// real pixels (phones vary), not a guessed constant — hence measuring it here, once, before the
// very first paint (useLayoutEffect, not useEffect: this runs before the browser shows anything,
// so HandBlock's very first render already has the real number and never has to visibly correct
// itself from a placeholder).
function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (ref.current) setWidth(ref.current.getBoundingClientRect().width);
  }, []);
  return [ref, width] as const;
}

function HandBlock({
  hand,
  isActive,
  isLeft,
  firstCardLayoutId,
  cardBackUrl,
  containerWidth,
}: {
  hand: SplitHand;
  isActive: boolean;
  isLeft: boolean;
  firstCardLayoutId?: string;
  cardBackUrl?: string | null;
  // Real, measured pixel width of the row this hand lives in (see useMeasuredWidth) — this
  // hand's own box position/width below is computed directly from it, in real pixels, rather
  // than left to CSS/`layout` to reconcile (see this component's own comment for why).
  containerWidth: number;
}) {
  // Also forced on for as long as this hand is still showing the one card it was just split
  // with (firstCardLayoutId, see HandCardRow's isContinuingFromSplit) — regardless of isActive.
  // That card's very first render here is a genuine shared-layoutId FLIP bridging it back to
  // where it sat in the joined pre-split pair, and that FLIP needs layout tracking engaged the
  // whole time it plays, same as any other — but useSettledLayoutTracking only turns tracking on
  // for whichever hand *starts active*, since it was built around the later active<->waiting
  // switch, where the waiting side genuinely has nothing of its own to track yet. The hand that
  // *starts waiting* right after a split still has this one FLIP of its own to finish, and
  // without tracking engaged for it, that card's size (and, until it settles, its position) just
  // free-floated untracked until something else happened to force a re-measure later — which is
  // what read as the two split cards briefly sitting at mismatched sizes, then one of them
  // visibly snapping into its real spot.
  const layoutTracked = useSettledLayoutTracking(isActive) || !!firstCardLayoutId;
  const revealed = useSettledReveal(isActive);
  // Active: this box is exactly containerWidth wide, so translating it by the bias and letting
  // items-center center its own (badge+row) content inside puts that content at
  // `containerWidth/2 + bias` on screen — centered across the whole row, pulled toward this
  // hand's own side, in one step. Waiting: a fixed WAITING_BOX_WIDTH box, translated so its own
  // outer edge sits WALL_PADDING_PX from this hand's own wall.
  const boxWidth = isActive ? containerWidth : WAITING_BOX_WIDTH;
  const targetX = isActive
    ? isLeft
      ? -ACTIVE_SIDE_BIAS
      : ACTIVE_SIDE_BIAS
    : isLeft
      ? WALL_PADDING_PX
      : containerWidth - WAITING_BOX_WIDTH - WALL_PADDING_PX;
  return (
    <motion.div
      // Always left-0 — never toggled to right-0/inset-x-0 the way this used to switch between
      // "pinned to its own wall" and "spanning the full width". `x` and `width` below now do the
      // entire job those class swaps used to (see this component's own comment for why): a
      // single fixed CSS anchor point means there's only one thing moving this box at all, not a
      // CSS positioning scheme change *plus* a transform trying to compensate for it.
      className="absolute bottom-0 left-0 flex flex-col items-center gap-1"
      animate={{ x: targetX, width: boxWidth }}
      // The delay is on the way IN only: without it, the hand becoming active (traveling from
      // its wall toward the center) and the hand becoming waiting (traveling from the center
      // toward its wall) both start at the same instant, moving in opposite directions through
      // the same middle stretch of screen at the same time — that's what actually reads as the
      // two hands' cards crossing/swapping places rather than one shrinking while the other
      // grows. Letting the outgoing hand get a head start clears the center before the incoming
      // one arrives there. Named per-value (x / width): a flat transition object works fine
      // here too since both share the same timing, but naming keeps this future-proof against
      // ever needing to split them.
      transition={{
        x: { type: "tween", duration: SWITCH_DURATION, ease: "easeInOut", delay: isActive ? ACTIVE_ENTER_DELAY : 0 },
        width: { type: "tween", duration: SWITCH_DURATION, ease: "easeInOut", delay: isActive ? ACTIVE_ENTER_DELAY : 0 },
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
//   visually floated above the active hand's own baseline instead of sharing it. Real card sizes
//   make what's on screen and what layout measures the same thing, so the shared bottom edge is
//   exact: the row is the last child of this bottom-anchored block, so its own bottom lines up
//   with the anchor at whatever height it currently is, active or waiting alike — no fixed/
//   matched height needed. It's pinned to its own outer wall with WALL_PADDING_PX of breathing
//   room — that anchor never moves, so a card touching the actual screen edge is impossible.
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
// useSettledLayoutTracking's timer) just keeps working the ordinary way. HandBlock's own
// explicit, measured x/width animation (see its own comment, and useMeasuredWidth above) is what
// animates the active<->waiting switch itself as one continuous move+resize.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  const [rowRef, containerWidth] = useMeasuredWidth();
  return (
    <div ref={rowRef} className="relative w-full" style={{ height: ROW_HEIGHT }}>
      {// Nothing renders until the real width is measured (see useMeasuredWidth) — HandBlock's
      // own x/width math needs it to already be correct on its very first render, not correct
      // itself visibly a frame after mounting at some placeholder position.
      containerWidth > 0 &&
        splitHands.map((hand, index) => (
          <HandBlock
            key={index}
            hand={hand}
            isActive={index === currentSplitHand}
            isLeft={index === 0}
            cardBackUrl={cardBackUrl}
            containerWidth={containerWidth}
            // Only while this hand still has exactly the one card it was split with — the
            // moment it's hit, its first card stops being "the thing that used to be half of
            // the pair" and just becomes a normal card in a normal hand, no different from any
            // other.
            firstCardLayoutId={hand.hand.length === 1 ? `split-card-${index}` : undefined}
          />
        ))}
    </div>
  );
}
