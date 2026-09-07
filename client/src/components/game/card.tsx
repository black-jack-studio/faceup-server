import { useRef, useState } from "react";
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
//
// Only ever renders ONE face at a time — not the more usual "two faces stacked back to back,
// each hidden on its own reverse side via backface-visibility" technique. That two-layer
// version is the textbook way to build a flip card, but it depends on the browser correctly
// compositing both faces into one shared 3D space and honoring backfaceVisibility:hidden for
// whichever one isn't currently facing the camera — and on this app's actual runtime (iOS
// WKWebView/Safari, not the Chromium this was authored and tested in), that reliably broke:
// the "hidden" face briefly showed through anyway, mirrored, especially on a card whose row was
// also mid layout-shift (the first hit after a deal, when the hand's own width first grows).
// Several rounds of the standard fixes for that (vendor-prefixed transform-style, will-change,
// a forced translateZ layer promotion) didn't resolve it on-device, and it isn't reproducible
// in Chromium to iterate against locally — so rather than continue guessing at Safari-specific
// compositing behavior, this sidesteps the whole mechanism: swap which face is MOUNTED, in
// React state, at the exact instant the card is edge-on (rotateY at the midpoint of its sweep)
// — which is already effectively invisible (foreshortened to a sliver by the perspective), so
// the swap itself is imperceptible. With only ever one face in the DOM, there's nothing for
// backface-visibility to hide and nothing for it to fail to hide.
export default function PlayingCard({ suit, value, isHidden = false, className, cardBackUrl, size = "sm", radius, revealDelay = 0.3, hideDelay = 0, onFlipComplete }: CardProps) {
  // Always -180 for "hidden", never +180: a card that mounts already face down (e.g. a
  // fresh deal) and one that mounts face up then later gets hidden both settle at the exact
  // same visual angle either way (rotateY(180deg) and rotateY(-180deg) look identical at
  // rest), but the SIGN is what a later reveal animates *from* — using 180 here meant a
  // card revealed later (the hole card going hidden -> visible) spun 180 -> 0, the opposite
  // direction from every other card, which always mounts already visible and spins -180 -> 0.
  // Keeping both at -180 makes every card in the game flip the same way, dealer, player and
  // friends alike, since they all share this one component.
  const startAngle = -180;
  const targetAngle = isHidden ? -180 : 0;

  // Which face is actually mounted right now — seeded from whichever side startAngle already
  // reads as (the back, since -180 is always the resting "face down" angle), then flipped by
  // onUpdate below the instant the live rotation crosses the midpoint of whatever sweep is
  // currently playing.
  const [face, setFace] = useState<"front" | "back">("back");
  // Avoids calling setFace on every animation frame once it's already showing the right face —
  // onUpdate fires ~60 times a second for the whole 0.5s tween, and re-deriving + re-setting
  // identical state that often is needless render churn for no visual benefit.
  const lastFaceRef = useRef<"front" | "back">("back");

  return (
    <motion.div
      initial={{ rotateY: startAngle }}
      animate={{ rotateY: targetAngle }}
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
      onUpdate={(latest) => {
        const angle = typeof latest.rotateY === "number" ? latest.rotateY : targetAngle;
        // The sweep always runs between -180 and 0 (see startAngle's own comment), so -90 is
        // its midpoint regardless of which direction this particular update is moving —
        // whichever face the angle is currently closer to is the one that should be mounted.
        const shouldShow: "front" | "back" = angle <= -90 ? "back" : "front";
        if (shouldShow !== lastFaceRef.current) {
          lastFaceRef.current = shouldShow;
          setFace(shouldShow);
        }
      }}
      onAnimationComplete={() => {
        if (!isHidden) onFlipComplete?.();
      }}
      data-testid={isHidden ? "card-hidden" : `card-${value}-${suit}`}
      style={{
        position: "relative",
        transformPerspective: "1000px",
        willChange: "transform",
      }}
    >
      {face === "front" ? (
        <OffsuitCard
          rank={value}
          suit={suit as Suit}
          faceDown={false}
          size={size}
          radius={radius}
          className={className}
        />
      ) : (
        <OffsuitCard faceDown size={size} radius={radius} cardBackUrl={cardBackUrl} />
      )}
    </motion.div>
  );
}
