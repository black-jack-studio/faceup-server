import { motion } from "framer-motion";
import OffsuitCard, { CardSize } from "@/components/PlayingCard";
import { Suit } from "@/icons/Suits";

interface CardProps {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
  isHidden?: boolean;
  className?: string;
  cardBackUrl?: string | null;
  size?: CardSize;
  // Delay (seconds) before a revealed (non-hidden) card starts its flip. Lets a caller push a
  // group of cards' reveal to start after another group's has already finished, instead of
  // everything flipping in lockstep at the same instant.
  revealDelay?: number;
  // Fires when a revealed card's flip has actually finished animating (spring settle time isn't
  // a fixed duration, so callers that need to sequence off "this card is done flipping" should
  // use this instead of guessing a matching setTimeout delay).
  onFlipComplete?: () => void;
}

// Wrapper component to maintain compatibility with existing HandCards component.
// A real two-sided flip, not just the same face rotated: the rotateY animation below only
// ever spins this container, so each side needs its own backface-visibility:hidden face to
// actually swap what's shown mid-flip — otherwise a "hidden" card that's mid-reveal briefly
// shows its own face mirrored instead of the card back.
export default function PlayingCard({ suit, value, isHidden = false, className, cardBackUrl, size = "sm", revealDelay = 0.3, onFlipComplete }: CardProps) {
  return (
    <motion.div
      initial={{ rotateY: isHidden ? 180 : -180 }}
      animate={{
        rotateY: isHidden ? 180 : 0,
        scale: 1
      }}
      transition={{
        duration: isHidden ? 0.1 : 1.0,
        type: "spring",
        stiffness: 60,
        damping: 12,
        delay: isHidden ? 0 : revealDelay
      }}
      onAnimationComplete={() => {
        if (!isHidden) onFlipComplete?.();
      }}
      data-testid={isHidden ? "card-hidden" : `card-${value}-${suit}`}
      style={{
        position: "relative",
        transformPerspective: "1000px",
        transformStyle: "preserve-3d"
      }}
    >
      <div style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
        <OffsuitCard
          rank={value}
          suit={suit as Suit}
          faceDown={false}
          size={size}
          className={className}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      >
        <OffsuitCard faceDown size={size} cardBackUrl={cardBackUrl} />
      </div>
    </motion.div>
  );
}
