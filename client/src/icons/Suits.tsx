import * as React from "react";

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export const suitFill = (s: Suit) =>
  s === "hearts" || s === "diamonds" ? "#DC2626" : "#25292F";

export const Hearts = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#DC2626" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
  </svg>
);

export const Diamonds = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#DC2626" d="M12 2l6 9-6 9-6-9 6-9z" />
  </svg>
);

export const Clubs = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#25292F" d="M12 2c1.1 0 2 .9 2 2 0 .9-.6 1.7-1.5 1.9.8.2 1.4.6 1.8 1.2.6.9.7 2 .2 3-.4.8-1.1 1.4-2 1.7.9.3 1.6.9 2 1.7.5 1 .4 2.1-.2 3-.4.6-1 1-1.8 1.2.9.2 1.5 1 1.5 1.9 0 1.1-.9 2-2 2s-2-.9-2-2c0-.9.6-1.7 1.5-1.9-.8-.2-1.4-.6-1.8-1.2-.6-.9-.7-2-.2-3 .4-.8 1.1-1.4 2-1.7-.9-.3-1.6-.9-2-1.7-.5-1-.4-2.1.2-3 .4-.6 1-1 1.8-1.2C10.6 5.7 10 4.9 10 4c0-1.1.9-2 2-2z"/>
  </svg>
);

export const Spades = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <path fill="#25292F" d="M12 2s6 4.5 6 9c0 2.2-1.8 4-4 4h-.5c.3.9.5 1.8.5 2.8 0 1.1-.9 2-2 2s-2-.9-2-2c0-1 .2-1.9.5-2.8H10c-2.2 0-4-1.8-4-4 0-4.5 6-9 6-9z"/>
  </svg>
);

export const SuitIcon = ({ suit, size=18 }: { suit: Suit; size?: number }) => {
  if (suit === "hearts") return <Hearts size={size} />;
  if (suit === "diamonds") return <Diamonds size={size} />;
  if (suit === "clubs") return <Clubs size={size} />;
  return <Spades size={size} />;
};