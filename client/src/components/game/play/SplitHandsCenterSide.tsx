import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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

// sm card width is 80px (see PlayingCard's sizeMap) — same overlap ratio HandCards uses, so a
// split hand that grows past one card (a hit) fans the same way the rest of the table does.
const CARD_WIDTH = 80;
const OVERLAP = CARD_WIDTH * 0.65 - CARD_WIDTH;
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room.
const CENTER_SLOT_HEIGHT = 190;
const SIDE_RIGHT = 12;
// A little clearance above the active hand's own score line, in px.
const SIDE_GAP_ABOVE_SCORE = 10;

function HandCardRow({ cards, cardBackUrl }: { cards: Card[]; cardBackUrl?: string | null }) {
  return (
    // layout on the row, not per card: a hit widens this row, recentering it under its "flex
    // justify-center" ancestor — layout on each card separately made them drift there
    // independently instead of moving together as one hand (same fix as HandCards.tsx).
    <motion.div layout="position" transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }} className="flex items-center">
      {cards.map((card, i) => (
        <div key={i} style={{ marginLeft: i > 0 ? OVERLAP : 0, position: "relative", zIndex: i }}>
          <PlayingCard suit={card.suit} value={card.value} size="sm" cardBackUrl={cardBackUrl} />
        </div>
      ))}
    </motion.div>
  );
}

// Classic 21's own split view: the hand currently being played sits big, truly centered, with
// its own total above it — exactly the usual player card zone. The other hand sits small,
// pinned (position: fixed) just above and to the right of that zone — not level with it,
// because the active hand's own row can fan out wide enough after several hits to run right
// into a side hand sitting at the same height, covering it.
//
// Where "just above" actually lands is measured off the real DOM, once, right when the split
// starts (see sideTopRef/centerBadgeRef below) — not computed from guessed pixel constants for
// the header/control-zone/safe-area heights stacked together. Those guesses landed way off
// (near the dealer, not the player) because they don't account for how much of the screen this
// layout leaves as genuinely empty space between the dealer and the player's own cards. A real
// measurement is exact on any device, and — just as important — it's taken exactly *once* and
// then frozen for the rest of this split: measuring again on every hit/switch (e.g. off a
// ResizeObserver) meant the anchor itself moved a few px whenever a hand's card count changed
// its rendered height (six-plus cards shrink the card size), which is exactly the "it moved a
// little" and "the other hand didn't land in the same spot" bugs. One measurement, taken from
// whichever hand happens to be centered right when the split begins, used for both hands for
// the rest of it, is what actually makes this a constant.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  const centerBadgeRef = useRef<HTMLDivElement>(null);
  const [sideTop, setSideTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (sideTop !== null) return;
    const el = centerBadgeRef.current;
    if (!el) return;
    setSideTop(el.getBoundingClientRect().top - SIDE_GAP_ABOVE_SCORE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="relative w-full" style={{ height: CENTER_SLOT_HEIGHT }}>
        {splitHands.map((hand, handIndex) => {
          if (handIndex !== currentSplitHand) return null;
          return (
            <div key={`split-center-${handIndex}`} className="absolute inset-0 flex items-end justify-center">
              <motion.div
                layoutId={`split-hand-${handIndex}`}
                layout="position"
                transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2"
                style={{ transformOrigin: "bottom" }}
              >
                <motion.div
                  ref={centerBadgeRef}
                  layout="position"
                  className="rounded-2xl px-4 py-2"
                  style={{ backgroundColor: "#232227" }}
                >
                  <span className="font-semibold text-lg text-white">{hand.total}</span>
                </motion.div>
                <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
              </motion.div>
            </div>
          );
        })}
      </div>

      {sideTop !== null &&
        splitHands.map((hand, handIndex) => {
          if (handIndex === currentSplitHand) return null;
          return (
            <div
              key={`split-side-${handIndex}`}
              className="fixed z-20 flex items-start"
              style={{ top: sideTop, right: SIDE_RIGHT }}
            >
              <motion.div
                layoutId={`split-hand-${handIndex}`}
                layout="position"
                transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
                // Both hands start at full size/opacity, not faded in from nothing — right when
                // a split happens, these are the exact same two cards the player was just
                // looking at as one hand a moment ago, so fading them in from opacity:0 read as
                // the cards vanishing and respawning. This one visibly shrinks and slides over
                // to its corner instead, starting from how it actually looked a moment before.
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 1, scale: 0.55 }}
                className="flex flex-col items-center gap-1"
                style={{ transformOrigin: "top right" }}
              >
                <motion.div layout="position" className="rounded-2xl px-4 py-2" style={{ backgroundColor: "#232227" }}>
                  <span className="font-semibold text-lg text-white">{hand.total}</span>
                </motion.div>
                <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
              </motion.div>
            </div>
          );
        })}
    </>
  );
}
