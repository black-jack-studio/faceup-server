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
  // Overrides the size preset's own corner radius — see PlayingCard.tsx for why.
  radius?: number;
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
export default function PlayingCard({ suit, value, isHidden = false, className, cardBackUrl, size = "sm", radius, revealDelay = 0.3, onFlipComplete }: CardProps) {
  return (
    <motion.div
      // Always -180 for "hidden", never +180: a card that mounts already face down (e.g. a
      // fresh deal) and one that mounts face up then later gets hidden both settle at the exact
      // same visual angle either way (rotateY(180deg) and rotateY(-180deg) look identical at
      // rest), but the SIGN is what a later reveal animates *from* — using 180 here meant a
      // card revealed later (the hole card going hidden -> visible) spun 180 -> 0, the opposite
      // direction from every other card, which always mounts already visible and spins -180 -> 0.
      // Keeping both at -180 makes every card in the game flip the same way, dealer, player and
      // friends alike, since they all share this one component.
      initial={{ rotateY: -180 }}
      animate={{
        rotateY: isHidden ? -180 : 0,
        scale: 1
      }}
      // A plain eased tween, not a physics spring: a spring here (stiffness/damping) overshoots
      // past the target before settling, which on a Y-axis flip briefly swings rotateY back
      // past the flat-on angle — reads as the card flashing face-down again right after it had
      // just turned face-up. A tween moves monotonically from back to front with no overshoot,
      // and its duration is exact (spring "settle time" is only ever an estimate).
      transition={{
        duration: isHidden ? 0.1 : 0.5,
        type: "tween",
        ease: "easeInOut",
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
          radius={radius}
          className={className}
        />
      </div>
      <div
        className="absolute inset-0"
        style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
      >
        <OffsuitCard faceDown size={size} radius={radius} cardBackUrl={cardBackUrl} />
      </div>
    </motion.div>
  );
}
