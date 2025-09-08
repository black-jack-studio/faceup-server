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
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.18)]",
        "bg-gradient-to-br from-white via-gray-50 to-gray-100",
        "text-[#1d1d1f]",
        "flex items-center justify-center",
        "transition-all duration-300 ease-out",
        "border border-white/60 backdrop-blur-xl",
        dimmed ? "opacity-60" : "opacity-100",
        className,
      ].join(" ")}
      style={{
        width: S.w,
        height: S.h,
        borderRadius: S.r + 2,
      }}
    >
      {/* Card face or back */}
      {faceDown ? <CardBack radius={S.r + 2} /> : (
        <CardFace rank={rank} suit={suit} size={size} />
      )}

      {/* Premium glass effect border */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ 
          borderRadius: S.r + 2, 
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(0,0,0,0.02)" 
        }}
      />
    </div>
  );
}

function CardFace({ rank, suit, size }: { rank: string; suit: Suit; size: CardSize }) {
  const S = sizeMap[size];
  const isRed = suit === "hearts" || suit === "diamonds";
  const rankColor = isRed ? "#ff3b5e" : "#1d1d1f";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center py-4">
      {/* Rank big center */}
      <div
        className={[
          "font-bold leading-none tracking-tight mb-3",
          "drop-shadow-sm",
          S.rank,
        ].join(" ")}
        style={{ 
          color: rankColor,
          textShadow: "0 1px 2px rgba(0,0,0,0.1)"
        }}
      >
        {rank}
      </div>

      {/* Suit with modern 3D effect */}
      <div className="transform transition-transform duration-200 hover:scale-110">
        <SuitIcon suit={suit} size={Math.floor(sizeMap[size].suit * 0.9)} />
      </div>
    </div>
  );
}

function CardBack({ radius }: { radius: number }) {
  // Modern Apple-inspired card back design
  return (
    <svg className="absolute inset-0" viewBox="0 0 100 145" style={{ borderRadius: radius }}>
      <defs>
        <linearGradient id="back-grad-modern" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#667eea" />
          <stop offset="50%" stopColor="#764ba2" />
          <stop offset="100%" stopColor="#f093fb" />
        </linearGradient>
        <radialGradient id="ring-modern" cx="50%" cy="50%" r="45%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
        </radialGradient>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
        </filter>
      </defs>
      <rect x="0" y="0" width="100" height="145" rx={radius} fill="url(#back-grad-modern)" />
      
      {/* Subtle geometric pattern */}
      {Array.from({ length: 4 }).map((_, i) => (
        <circle 
          key={i} 
          cx="50" 
          cy="72.5" 
          r={12 + i * 12} 
          fill="none" 
          stroke="url(#ring-modern)" 
          strokeWidth="1.5" 
          filter="url(#blur)"
        />
      ))}
      
      {/* Central highlight */}
      <circle cx="50" cy="72.5" r="8" fill="#ffffff" opacity="0.12" />
      <circle cx="50" cy="72.5" r="4" fill="#ffffff" opacity="0.2" />
    </svg>
  );
}