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
    <div className="absolute inset-0 py-2 px-2">
      {/* Rank top-left */}
      <div className="absolute top-2 left-2">
        <div
          className={[
            "font-bold leading-none tracking-tight",
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
        
        {/* Small suit under rank */}
        <div 
          className="mt-1"
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
          }}
        >
          <SuitIcon suit={suit} size={Math.floor(sizeMap[size].suit * 0.4)} />
        </div>
      </div>

      {/* Large suit bottom-center */}
      <div 
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 transition-transform duration-200 hover:scale-110"
        style={{
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
        }}
      >
        <SuitIcon suit={suit} size={Math.floor(sizeMap[size].suit * 0.9)} />
      </div>

      {/* Rank bottom-right (inverted) */}
      <div className="absolute bottom-2 right-2 transform rotate-180">
        <div
          className={[
            "font-bold leading-none tracking-tight",
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
        
        {/* Small suit under rank (inverted) */}
        <div 
          className="mt-1"
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
          }}
        >
          <SuitIcon suit={suit} size={Math.floor(sizeMap[size].suit * 0.4)} />
        </div>
      </div>
    </div>
  );
}

function CardBack({ radius }: { radius: number }) {
  // Modern minimalist black on white design with strong contrast
  return (
    <svg className="absolute inset-0" viewBox="0 0 100 145" style={{ borderRadius: radius }}>
      <defs>
        <pattern id="dots" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.8" fill="#1f2937" opacity="0.25"/>
        </pattern>
        <linearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f9fafb" />
        </linearGradient>
      </defs>
      
      {/* Main background */}
      <rect x="0" y="0" width="100" height="145" rx={radius} fill="url(#cardGradient)" />
      
      {/* Dot pattern background */}
      <rect x="10" y="15" width="80" height="115" fill="url(#dots)" />
      
      {/* Central geometric design */}
      <g transform="translate(50, 72.5)">
        {/* Outer rounded square */}
        <rect x="-18" y="-22" width="36" height="44" rx="8" fill="none" stroke="#1f2937" strokeWidth="1.5" opacity="0.4"/>
        
        {/* Inner elements */}
        <rect x="-12" y="-14" width="24" height="28" rx="4" fill="none" stroke="#1f2937" strokeWidth="1.2" opacity="0.6"/>
        
        {/* Center diamond */}
        <rect x="-6" y="-6" width="12" height="12" rx="2" fill="#1f2937" opacity="0.3" transform="rotate(45)"/>
        
        {/* Inner diamond */}
        <rect x="-3" y="-3" width="6" height="6" rx="1" fill="#ffffff" opacity="0.8" transform="rotate(45)"/>
        
        {/* Corner decorative elements */}
        <circle cx="-14" cy="-17" r="1.5" fill="#1f2937" opacity="0.5"/>
        <circle cx="14" cy="-17" r="1.5" fill="#1f2937" opacity="0.5"/>
        <circle cx="-14" cy="17" r="1.5" fill="#1f2937" opacity="0.5"/>
        <circle cx="14" cy="17" r="1.5" fill="#1f2937" opacity="0.5"/>
        
        {/* Small accent lines */}
        <line x1="-8" y1="-18" x2="8" y2="-18" stroke="#1f2937" strokeWidth="0.8" opacity="0.4"/>
        <line x1="-8" y1="18" x2="8" y2="18" stroke="#1f2937" strokeWidth="0.8" opacity="0.4"/>
      </g>
      
      {/* Border accent lines */}
      <line x1="15" y1="20" x2="85" y2="20" stroke="#1f2937" strokeWidth="0.8" opacity="0.3"/>
      <line x1="15" y1="125" x2="85" y2="125" stroke="#1f2937" strokeWidth="0.8" opacity="0.3"/>
    </svg>
  );
}