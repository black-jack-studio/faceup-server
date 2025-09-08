import * as React from "react";
import heartImage from '@assets/heart_suit_3d_1757353734994.png';
import diamondImage from '@assets/diamond_suit_3d_1757353734994.png';
import clubImage from '@assets/club_suit_3d_1757353734987.png';
import spadeImage from '@assets/spade_suit_3d_1757353734994.png';

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
export const Clubs: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <img
    src={clubImage}
    alt="♣"
    width={size}
    height={size}
    className={`object-contain drop-shadow-sm ${className}`}
    style={{ filter: color && color !== "#000000" ? `hue-rotate(180deg)` : undefined }}
  />
);

/* ─────────────────────  SPADES (♠)  ───────────────────── */
export const Spades: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <img
    src={spadeImage}
    alt="♠"
    width={size}
    height={size}
    className={`object-contain drop-shadow-sm ${className}`}
    style={{ filter: color && color !== "#000000" ? `hue-rotate(180deg)` : undefined }}
  />
);

/* ─────────────────────  Helper  ───────────────────── */
export const SuitIcon: React.FC<{
  suit: Suit;
  size?: number;
  className?: string;
}> = ({ suit, size = 18, className }) => {
  if (suit === "hearts") return <Hearts size={size} className={className} />;
  if (suit === "diamonds") return <Diamonds size={size} className={className} />;
  if (suit === "clubs") return <Clubs size={size} className={className} />;
  return <Spades size={size} className={className} />;
};