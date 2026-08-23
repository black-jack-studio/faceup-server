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
// Tall enough for a total badge + a full-size "sm" card (115px) with a little breathing room —
// fixed so both slots (center and side) always share the exact same bottom baseline below.
const SLOT_HEIGHT = 190;

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
// its own total above it; the other sits small, pinned to the right edge of the play area with
// a little padding, all its cards still visible and its own total still shown. It never moves
// for any reason unrelated to itself — its slot ("absolute right-0 bottom-0") is a fixed anchor
// that has nothing to do with the center hand's own width, so a hit there can't nudge it.
// When the active hand finishes, they swap: each hand keeps one permanent wrapper (by hand
// index, never reordered), whose *alignment* toggles between "center" and "side" — the inner
// motion.div's layout="position" (not full `layout`, which also interpolates size and made the
// block visibly squish) picks up the resulting position change and slides it there, while the
// explicit scale animate handles the grow/shrink as a plain transform, not a layout projection.
export default function SplitHandsCenterSide({ splitHands, currentSplitHand, cardBackUrl }: SplitHandsCenterSideProps) {
  return (
    <div className="relative w-full" style={{ height: SLOT_HEIGHT }}>
      {splitHands.map((hand, handIndex) => {
        const isCenter = handIndex === currentSplitHand;
        return (
          <div
            key={`split-slot-${handIndex}`}
            className={
              isCenter
                ? "absolute inset-0 flex items-end justify-center"
                : "absolute right-0 bottom-0 flex items-end"
            }
          >
            <motion.div
              layout="position"
              transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
              // Both hands start at full size/opacity, not faded in from nothing — right when a
              // split happens, these are the exact same two cards the player was just looking
              // at as one hand a moment ago, so fading them in from opacity:0 read as the cards
              // vanishing and respawning. The center hand (already close to this position) barely
              // seems to move; the side hand visibly shrinks and slides over to its slot instead.
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: isCenter ? 1 : 0.55 }}
              className="flex flex-col items-center gap-2"
              style={{ transformOrigin: "bottom" }}
            >
              <motion.div
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
  );
}
