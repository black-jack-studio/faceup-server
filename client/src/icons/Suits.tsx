import * as React from "react";
import heartImage from '@assets/heart_suit_3d_1757353734994.png';
import diamondImage from '@assets/diamond_suit_3d_1757353734994.png';
import clubImage from '@assets/club_suit_3d_1757353734987.png';
import spadeImage from '@assets/spade_suit_3d_1757353734994.png';
// Black-theme-only siblings of the two art above: the dark purple/black bake of ♣/♠
// disappears against a dark card face, so these are the same glossy 3D render with its
// luminance remapped up into a light band (highlight/shadow order kept, not inverted -- a
// literal color invert would flip which side of the icon reads as the "raised" highlight)
// instead of the flat text-glyph fallback this used to fall back to. ♥/♦'s existing pink/red
// bake already reads fine on a dark face as-is, so those have no black-theme sibling.
import clubImageBlack from '@assets/club_suit_3d_white_1788881725.png';
import spadeImageBlack from '@assets/spade_suit_3d_white_1788881725.png';

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

/** Couleurs: rouge pour ♥ ♦, noir pour ♣ ♠ */
export const suitColor = (s: Suit) =>
  s === "hearts" || s === "diamonds" ? "#E55C73" : "#000000";

/* ─────────────────────  HEARTS (♥)  ───────────────────── */
export const Hearts: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <img
    src={heartImage}
    alt="♥"
    width={size}
    height={size}
    className={`object-contain drop-shadow-sm ${className}`}
    style={{ filter: color ? `hue-rotate(${color === "#E55C73" ? "0deg" : "180deg"})` : undefined }}
  />
);

/* ─────────────────────  DIAMONDS (♦)  ───────────────────── */
export const Diamonds: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <img
    src={diamondImage}
    alt="♦"
    width={size}
    height={size}
    className={`object-contain drop-shadow-sm ${className}`}
    style={{ filter: color ? `hue-rotate(${color === "#E55C73" ? "0deg" : "180deg"})` : undefined }}
  />
);

/* ─────────────────────  CLUBS (♣)  ───────────────────── */
export const Clubs: React.FC<{ size?: number; theme?: "white" | "black"; className?: string }> = ({
  size = 18,
  theme = "white",
  className = "",
}) => (
  <img
    src={theme === "black" ? clubImageBlack : clubImage}
    alt="♣"
    width={size}
    height={size}
    className={`object-contain drop-shadow-sm ${className}`}
  />
);

/* ─────────────────────  SPADES (♠)  ───────────────────── */
export const Spades: React.FC<{ size?: number; theme?: "white" | "black"; className?: string }> = ({
  size = 18,
  theme = "white",
  className = "",
}) => (
  <img
    src={theme === "black" ? spadeImageBlack : spadeImage}
    alt="♠"
    width={size}
    height={size}
    className={`object-contain drop-shadow-sm ${className}`}
  />
);

/* ─────────────────────  Helper  ───────────────────── */
export const SuitIcon: React.FC<{
  suit: Suit;
  size?: number;
  // Only ♣/♠ actually change art per theme (see the import comment above) -- ♥/♦ take this
  // too, for a uniform call site, but ignore it.
  theme?: "white" | "black";
  className?: string;
}> = ({ suit, size = 18, theme = "white", className }) => {
  if (suit === "hearts") return <Hearts size={size} className={className} />;
  if (suit === "diamonds") return <Diamonds size={size} className={className} />;
  if (suit === "clubs") return <Clubs size={size} theme={theme} className={className} />;
  return <Spades size={size} theme={theme} className={className} />;
};