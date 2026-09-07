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
  // Same idea as revealDelay but for the reverse trip (visible -> hidden) — round end flips
  // every already-dealt card back to its card-back face, and this staggers that the same way
  // the deal itself staggers reveals, instead of every card on the table snapping over at once.
  hideDelay?: number;
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
export default function PlayingCard({ suit, value, isHidden = false, className, cardBackUrl, size = "sm", radius, revealDelay = 0.3, hideDelay = 0, onFlipComplete }: CardProps) {
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
      // z: 0 on both — a static value, nothing actually moves along it — is there purely to
      // force framer-motion to bake a translateZ(0) into this element's own transform from the
      // very first frame. WebKit is far more reliable about honoring backfaceVisibility:hidden
      // on an element that already has its own 3D-promoted compositing layer than one it only
      // decides to promote once the rotateY animation is already under way — an explicit
      // translateZ(0) forces that promotion immediately instead of leaving it to the browser's
      // own (occasionally late) judgment call.
      initial={{ rotateY: -180, z: 0 }}
      animate={{
        rotateY: isHidden ? -180 : 0,
        scale: 1,
        z: 0
      }}
      // A plain eased tween, not a physics spring: a spring here (stiffness/damping) overshoots
      // past the target before settling, which on a Y-axis flip briefly swings rotateY back
      // past the flat-on angle — reads as the card flashing face-down again right after it had
      // just turned face-up. A tween moves monotonically from back to front with no overshoot,
      // and its duration is exact (spring "settle time" is only ever an estimate).
      //
      // Same 0.5s duration both ways — round end wants the "cards turn to their back" flip to
      // read as literally the same motion as the deal's own reveal, just running in reverse,
      // not a quick unrelated snap. (There's no on-screen path today where a card that's
      // actually been showing its face gets hidden again on any tighter deadline, so nothing
      // depends on the old rushed timing.)
      transition={{
        duration: 0.5,
        type: "tween",
        ease: "easeInOut",
        delay: isHidden ? hideDelay : revealDelay
      }}
      onAnimationComplete={() => {
        if (!isHidden) onFlipComplete?.();
      }}
      data-testid={isHidden ? "card-hidden" : `card-${value}-${suit}`}
      style={{
        position: "relative",
        transformPerspective: "1000px",
        transformStyle: "preserve-3d",
        // WebKit (the iOS WKWebView this app actually ships in) needs its own -webkit- prefix
        // for 3D transform-style even on fairly recent versions — without it, the two faces
        // below sometimes aren't correctly composited into the shared 3D space, so mid-flip the
        // front face's backfaceVisibility:hidden silently fails to hide it and it briefly shows
        // through mirrored (readable as a backwards rank in the wrong corner) instead of the
        // card back. willChange primes the browser to promote this element to its own layer
        // BEFORE the flip starts rather than mid-animation — that promotion-timing race is what
        // made this intermittent (worse on a card whose row is also mid layout-shift, e.g. the
        // very first hit after the deal, when the hand's own width just grew for the first time).
        WebkitTransformStyle: "preserve-3d",
        willChange: "transform",
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
