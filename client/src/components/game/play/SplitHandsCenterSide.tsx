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
// Clears the header (pt-6 + "Dealer" row + mb-6 ≈ 84px) with margin — level with roughly where
// the dealer's own cards sit, off to their right. right-5 matches the page's own px-5 gutter.
const SIDE_TOP = 100;
const SIDE_RIGHT = 20;

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

function TotalBadge({ total }: { total: number }) {
  return (
    <motion.div layout="position" className="rounded-2xl px-4 py-2" style={{ backgroundColor: "#232227" }}>
      <span className="font-semibold text-lg text-white">{total}</span>
    </motion.div>
  );
}

// Classic 21's own split view: the hand currently being played sits big, truly centered, with
// its own total above it — exactly the usual player card zone. The other hand sits small,
// pinned near the top-right of the *whole screen* (position: fixed, not just "the right side of
// the player zone") — not the bottom-right, because the active hand's own row can fan out wide
// enough after several hits to run right into a side hand sitting at the same height, covering
// it. Top-right, level with the dealer, is space neither hand's own row ever grows into,
// however many cards get drawn. Being `fixed` also means it's positioned against the real
// viewport regardless of where in the tree it's mounted, so nothing the active hand does
// (hit, split further were it allowed, anything) can ever move it — its anchor is a constant.
//
// Each hand can render in either the center list or the side list depending on whose turn it
// is, never both — when the active hand changes, one hand's element unmounts from one list
// while the other mounts into it in the same commit. `layoutId` (keyed by hand index) is what
// bridges that cross-branch swap into one continuous slide instead of two unrelated mounts;
// `layout="position"` keeps that slide to a pure position change, never resizing the block
// itself (the explicit `animate` scale handles the size change as a plain transform).
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
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
                <TotalBadge total={hand.total} />
                <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
              </motion.div>
            </div>
          );
        })}
      </div>

      {splitHands.map((hand, handIndex) => {
        if (handIndex === currentSplitHand) return null;
        return (
          <div
            key={`split-side-${handIndex}`}
            className="fixed z-20 flex items-start"
            style={{ top: SIDE_TOP, right: SIDE_RIGHT }}
          >
            <motion.div
              layoutId={`split-hand-${handIndex}`}
              layout="position"
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              // Both hands start at full size/opacity, not faded in from nothing — right when a
              // split happens, these are the exact same two cards the player was just looking
              // at as one hand a moment ago, so fading them in from opacity:0 read as the cards
              // vanishing and respawning. This one visibly shrinks and slides up to its corner
              // instead, starting from how it actually looked a moment before.
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 0.55 }}
              className="flex flex-col items-center gap-1"
              style={{ transformOrigin: "top right" }}
            >
              <TotalBadge total={hand.total} />
              <HandCardRow cards={hand.hand} cardBackUrl={cardBackUrl} />
            </motion.div>
          </div>
        );
      })}
    </>
  );
}
