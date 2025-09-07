import * as React from "react";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export const suitFill = (s: Suit) =>
  s === "hearts" || s === "diamonds" ? "#E55C73" : "#25292F";

export const Hearts = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#E55C73" d="M12 21s-7.55-4.82-9.5-8.08C.96 10.08 2.12 6.5 5.38 6.5c2.1 0 3.17 1.12 3.87 2.17.7-1.05 1.77-2.17 3.87-2.17 3.26 0 4.42 3.58 2.88 6.42C19.55 16.18 12 21 12 21z"/>
  </svg>
);

export const Diamonds = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#E55C73" d="M12 2l7 10-7 10-7-10 7-10z" />
  </svg>
);

export const Clubs = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#25292F" d="M12 22a1 1 0 01-1-1v-2.1a5 5 0 01-2.9.9 4.9 4.9 0 01-4.1-2.3 4.9 4.9 0 018-5.3 4.9 4.9 0 11-3.9-8 4.9 4.9 0 014 2.1 4.9 4.9 0 018 5.9 4.9 4.9 0 01-4.1 2.3 5 5 0 01-2.9-.9V21a1 1 0 01-1 1z"/>
  </svg>
);

export const Spades = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#25292F" d="M12 2s7.5 5.3 7.5 10.2A3.8 3.8 0 0115.8 16H14a5.5 5.5 0 01.6 2.6A3.4 3.4 0 0111 22a3.4 3.4 0 01-3.6-3.4A5.5 5.5 0 018 16H6.2A3.8 3.8 0 014.5 12.2C4.5 7.3 12 2 12 2z"/>
  </svg>
);

export const SuitIcon = ({ suit, size=18 }: { suit: Suit; size?: number }) => {
  if (suit === "hearts") return <Hearts size={size} />;
  if (suit === "diamonds") return <Diamonds size={size} />;
  if (suit === "clubs") return <Clubs size={size} />;
  return <Spades size={size} />;
};