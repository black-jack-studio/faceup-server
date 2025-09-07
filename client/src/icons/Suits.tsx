import * as React from "react";

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
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
  >
    <path
      fill={color ?? "#E55C73"}
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
    />
  </svg>
);

/* ─────────────────────  DIAMONDS (♦)  ───────────────────── */
export const Diamonds: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
  >
    <path fill={color ?? "#E55C73"} d="M12 3l6 9-6 9-6-9 6-9z" />
  </svg>
);

/* ─────────────────────  CLUBS (♣)  ───────────────────── */
export const Clubs: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
  >
    <g fill={color ?? "#000000"}>
      <circle cx="12" cy="7" r="3"/>
      <circle cx="7" cy="12" r="3"/>
      <circle cx="17" cy="12" r="3"/>
      <rect x="11" y="15" width="2" height="6" rx="1"/>
    </g>
  </svg>
);

/* ─────────────────────  SPADES (♠)  ───────────────────── */
export const Spades: React.FC<{ size?: number; color?: string; className?: string }> = ({
  size = 18,
  color,
  className = "",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    aria-hidden
  >
    <path
      fill={color ?? "#000000"}
      d="M12 2c0 0 6 4 6 9 0 3-2 5-5 5h-0.5c0.3 1 0.5 2 0.5 3 0 1-1 2-2 2s-2-1-2-2c0-1 0.2-2 0.5-3H9c-3 0-5-2-5-5 0-5 6-9 6-9z"
    />
  </svg>
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