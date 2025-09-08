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
  sm: { w: 80, h: 115, r: 16, rank: "text-[32px]", suit: 20 },
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
        "shadow-[0_4px_20px_rgba(0,0,0,0.08),0_8px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12),0_16px_60px_rgba(0,0,0,0.08)]",
        "bg-gradient-to-br from-white via-white to-gray-50/80",
        "text-[#1a1a1a]",
        "flex items-center justify-center",
        "transition-all duration-400 ease-out",
        "border border-gray-200/40",
        "transform-gpu",
        dimmed ? "opacity-60" : "opacity-100",
        className,
      ].join(" ")}
      style={{
        width: S.w,
        height: S.h,
        borderRadius: S.r,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {/* Card face or back */}
      {faceDown ? <CardBack radius={S.r + 2} /> : (
        <CardFace rank={rank} suit={suit} size={size} />
      )}

      {/* Subtle 3D light effect */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ 
          borderRadius: S.r,
          background: "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 50%, rgba(0,0,0,0.02) 100%)",
          mixBlendMode: "overlay"
        }}
      />
      
      {/* Soft inner glow */}
      <div
        className="pointer-events-none absolute inset-[1px]"
        style={{ 
          borderRadius: S.r - 1,
          boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.03)"
        }}
      />
    </div>
  );
}

function CardFace({ rank, suit, size }: { rank: string; suit: Suit; size: CardSize }) {
  const S = sizeMap[size];
  const isRed = suit === "hearts" || suit === "diamonds";
  const rankColor = isRed ? "#dc2626" : "#1f2937";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center py-4">
      {/* Rank big center */}
      <div
        className={[
          "font-bold leading-none tracking-tight mb-3",
          "drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]",
          S.rank,
        ].join(" ")}
        style={{ 
          color: rankColor,
          textShadow: "0 1px 3px rgba(0,0,0,0.08)",
          fontWeight: "700"
        }}
      >
        {rank}
      </div>

      {/* Suit with subtle shadow */}
      <div 
        className="transform transition-transform duration-200 hover:scale-110"
        style={{
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
        }}
      >
        <SuitIcon suit={suit} size={Math.floor(sizeMap[size].suit * 0.85)} />
      </div>
    </div>
  );
}

function CardBack({ radius }: { radius: number }) {
  // Modern minimalist black on white design
  return (
    <svg className="absolute inset-0" viewBox="0 0 100 145" style={{ borderRadius: radius }}>
      <defs>
        <pattern id="dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="4" r="0.5" fill="#1f2937" opacity="0.08"/>
        </pattern>
        <linearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>
      
      {/* Main background */}
      <rect x="0" y="0" width="100" height="145" rx={radius} fill="url(#cardGradient)" />
      
      {/* Subtle dot pattern */}
      <rect x="8" y="12" width="84" height="121" fill="url(#dots)" />
      
      {/* Central geometric design */}
      <g transform="translate(50, 72.5)">
        {/* Outer rounded square */}
        <rect x="-16" y="-20" width="32" height="40" rx="6" fill="none" stroke="#1f2937" strokeWidth="0.8" opacity="0.12"/>
        
        {/* Inner elements */}
        <rect x="-10" y="-12" width="20" height="24" rx="3" fill="none" stroke="#1f2937" strokeWidth="0.6" opacity="0.18"/>
        
        {/* Center diamond */}
        <rect x="-4" y="-4" width="8" height="8" rx="1" fill="#1f2937" opacity="0.06" transform="rotate(45)"/>
        
        {/* Corner dots */}
        <circle cx="-12" cy="-15" r="1" fill="#1f2937" opacity="0.1"/>
        <circle cx="12" cy="-15" r="1" fill="#1f2937" opacity="0.1"/>
        <circle cx="-12" cy="15" r="1" fill="#1f2937" opacity="0.1"/>
        <circle cx="12" cy="15" r="1" fill="#1f2937" opacity="0.1"/>
      </g>
      
      {/* Bottom accent line */}
      <line x1="20" y1="130" x2="80" y2="130" stroke="#1f2937" strokeWidth="0.5" opacity="0.08"/>
    </svg>
  );
}