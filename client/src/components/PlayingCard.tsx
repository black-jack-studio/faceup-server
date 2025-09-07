import * as React from "react";
import { Suit, SuitIcon, suitColor } from "@/icons/Suits";

/**
 * Offsuit-like blackjack card:
 * - very round corners, soft shadow
 * - rank super large centered
 * - suit small at the bottom
 * - optional facedown back with concentric rings
 */

export type CardSize = "xs" | "sm" | "md" | "lg";
const sizeMap = {
  xs: { w: 40, h: 58, r: 12, rank: "text-[16px]", suit: 14 },
  sm: { w: 62, h: 90, r: 18, rank: "text-[24px]", suit: 16 },
  md: { w: 86, h: 124, r: 22, rank: "text-[34px]", suit: 18 },
  lg: { w: 110, h: 160, r: 26, rank: "text-[44px]", suit: 22 },
};

export type PlayingCardProps = {
  rank?: string;       // "A", "2".."10", "J", "Q", "K"
  suit?: Suit;         // hearts | diamonds | clubs | spades
  faceDown?: boolean;  // render back
  size?: CardSize;
  dimmed?: boolean;    // for inactive/hidden states
  className?: string;
};

export default function PlayingCard({
  rank = "A",
  suit = "spades",
  faceDown = false,
  size = "md",
  dimmed = false,
  className = "",
}: PlayingCardProps) {
  const S = sizeMap[size];

  return (
    <div
      className={[
        "relative select-none will-change-transform",
        "shadow-[0_6px_24px_rgba(0,0,0,0.35)]",
        "bg-white text-[#0B0B0F]",
        "flex items-center justify-center",
        "transition-transform duration-150",
        dimmed ? "opacity-55" : "opacity-100",
        className,
      ].join(" ")}
      style={{
        width: S.w,
        height: S.h,
        borderRadius: S.r,
      }}
    >
      {/* Card face or back */}
      {faceDown ? <CardBack radius={S.r} /> : (
        <CardFace rank={rank} suit={suit} size={size} />
      )}

      {/* subtle inner border */}
      <div
        className="pointer-events-none absolute inset-0 ring-1"
        style={{ borderRadius: S.r, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)" }}
      />
    </div>
  );
}

function CardFace({ rank, suit, size }: { rank: string; suit: Suit; size: CardSize }) {
  const S = sizeMap[size];
  const isRed = suit === "hearts" || suit === "diamonds";
  const rankColor = isRed ? "#E55C73" : "#0B0B0F";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-2">
      {/* Rank big center */}
      <div
        className={[
          "font-semibold leading-none tracking-tight",
          S.rank,
        ].join(" ")}
        style={{ color: rankColor }}
      >
        {rank}
      </div>

      {/* Suit small bottom */}
      <div className="mb-1" style={{ color: suitColor(suit) }}>
        <SuitIcon suit={suit} size={sizeMap[size].suit} />
      </div>
    </div>
  );
}

function CardBack({ radius }: { radius: number }) {
  // Concentric rings like Offsuit (dark purple on dark)
  return (
    <svg className="absolute inset-0" viewBox="0 0 100 145" style={{ borderRadius: radius }}>
      <defs>
        <linearGradient id="back-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2C2742" />
          <stop offset="100%" stopColor="#1E1A2B" />
        </linearGradient>
        <radialGradient id="ring" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8C86F9" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#7D76F0" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6B64E6" stopOpacity="0.06" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="100" height="145" rx={radius} fill="url(#back-grad)" />
      {Array.from({ length: 6 }).map((_, i) => (
        <circle key={i} cx="50" cy="72.5" r={8 + i * 8} fill="none" stroke="url(#ring)" strokeWidth="2" />
      ))}
      <circle cx="50" cy="72.5" r="6" fill="#CFCBFF" opacity="0.9" />
    </svg>
  );
}