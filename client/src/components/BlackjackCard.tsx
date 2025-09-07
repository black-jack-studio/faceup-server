import React from "react";

type Suit = "spades" | "hearts" | "diamonds" | "clubs";
type Props = {
  rank: string;               // "A","2"... "10","J","Q","K"
  suit: Suit;
  size?: number;              // largeur en px (ratio ~ 300x420)
  faceDown?: boolean;
};

const suitGlyph: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const suitColor: Record<Suit, string> = {
  spades: "#15171C",
  clubs: "#15171C",
  hearts: "#F16060",
  diamonds: "#F16060",
};

export default function BlackjackCard({ rank, suit, size = 120, faceDown }: Props) {
  const w = size;
  const h = Math.round(size * (420 / 300)); // ratio 300x420
  if (faceDown) {
    return (
      <div
        style={{ width: w, height: h }}
        className="rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,.25)] border border-white/10 overflow-hidden"
        data-testid={`card-facedown`}
      >
        {/* dos simple type rings */}
        <svg viewBox="0 0 300 420" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="420" rx="28" fill="#111214"/>
          <g fill="none" stroke="#fff" opacity=".14">
            <circle cx="150" cy="210" r="110" strokeWidth="2"/>
            <circle cx="150" cy="210" r="80" strokeWidth="2"/>
            <circle cx="150" cy="210" r="50" strokeWidth="2"/>
          </g>
          <rect x="10" y="10" width="280" height="400" rx="24" stroke="#22252B" strokeWidth="4"/>
        </svg>
      </div>
    );
  }

  return (
    <div
      style={{ width: w, height: h }}
      className="bg-white rounded-2xl shadow-[0_6px_24px_rgba(0,0,0,.25)] border border-black/5 flex items-center justify-center relative overflow-hidden"
      data-testid={`card-${rank}-${suit}`}
    >
      {/* valeur centrale */}
      <div
        className="font-semibold select-none"
        style={{
          fontSize: Math.round(w * 0.42),
          lineHeight: 1,
          color: suitColor[suit],
          letterSpacing: -1,
        }}
        data-testid="card-rank"
      >
        {rank}
      </div>

      {/* glyphe en bas */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 select-none"
        style={{ color: suitColor[suit], fontSize: Math.round(w * 0.22) }}
        data-testid="card-suit"
      >
        {suitGlyph[suit]}
      </div>

      {/* micro-bord */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5 pointer-events-none" />
    </div>
  );
}