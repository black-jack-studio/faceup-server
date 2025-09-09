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
    <div className="absolute inset-0 py-3 px-3">
      {/* Rank top-left */}
      <div className="absolute top-3 left-3">
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
      </div>

      {/* Suit bottom-left, aligned with rank */}
      <div className="absolute bottom-3 left-3">
        <div 
          style={{
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
          }}
        >
          <SuitIcon suit={suit} size={Math.floor(sizeMap[size].suit * 1.6)} />
        </div>
      </div>
    </div>
  );
}

function CardBack({ radius }: { radius: number }) {
  // Sobre design noir et blanc qui s'intègre au thème de l'app
  return (
    <svg className="absolute inset-0" viewBox="0 0 100 145" style={{ borderRadius: radius }}>
      <defs>
        {/* Gradient de fond sombre harmonieux avec l'app */}
        <linearGradient id="cardBackGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#13151A" />
          <stop offset="50%" stopColor="#0B0B0F" />
          <stop offset="100%" stopColor="#1a1a1e" />
        </linearGradient>
        
        {/* Motif de lignes subtiles */}
        <pattern id="subtleLines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="4" y2="2" stroke="#ffffff" strokeWidth="0.3" opacity="0.1"/>
        </pattern>
      </defs>
      
      {/* Fond principal sombre */}
      <rect x="0" y="0" width="100" height="145" rx={radius} fill="url(#cardBackGradient)" />
      
      {/* Bordure subtile */}
      <rect x="3" y="3" width="94" height="139" rx={radius-2} fill="none" stroke="#ffffff" strokeWidth="0.5" opacity="0.15" />
      
      {/* Motif de lignes discrètes */}
      <rect x="8" y="8" width="84" height="129" fill="url(#subtileLines)" opacity="0.6" />
      
      {/* Design central minimaliste */}
      <g transform="translate(50, 72.5)">
        {/* Cercle extérieur principal */}
        <circle cx="0" cy="0" r="20" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.2"/>
        
        {/* Cercle moyen */}
        <circle cx="0" cy="0" r="14" fill="none" stroke="#ffffff" strokeWidth="0.8" opacity="0.3"/>
        
        {/* Croix centrale simple */}
        <line x1="-8" y1="0" x2="8" y2="0" stroke="#ffffff" strokeWidth="1.5" opacity="0.4"/>
        <line x1="0" y1="-8" x2="0" y2="8" stroke="#ffffff" strokeWidth="1.5" opacity="0.4"/>
        
        {/* Points cardinaux */}
        <circle cx="0" cy="-16" r="1" fill="#ffffff" opacity="0.5"/>
        <circle cx="16" cy="0" r="1" fill="#ffffff" opacity="0.5"/>
        <circle cx="0" cy="16" r="1" fill="#ffffff" opacity="0.5"/>
        <circle cx="-16" cy="0" r="1" fill="#ffffff" opacity="0.5"/>
        
        {/* Centre lumineux */}
        <circle cx="0" cy="0" r="3" fill="#ffffff" opacity="0.6"/>
        <circle cx="0" cy="0" r="1.5" fill="#13151A" opacity="0.8"/>
      </g>
      
      {/* Coins décoratifs discrets */}
      <g opacity="0.2">
        <line x1="12" y1="12" x2="20" y2="12" stroke="#ffffff" strokeWidth="0.6"/>
        <line x1="12" y1="12" x2="12" y2="20" stroke="#ffffff" strokeWidth="0.6"/>
        
        <line x1="88" y1="12" x2="80" y2="12" stroke="#ffffff" strokeWidth="0.6"/>
        <line x1="88" y1="12" x2="88" y2="20" stroke="#ffffff" strokeWidth="0.6"/>
        
        <line x1="12" y1="133" x2="20" y2="133" stroke="#ffffff" strokeWidth="0.6"/>
        <line x1="12" y1="133" x2="12" y2="125" stroke="#ffffff" strokeWidth="0.6"/>
        
        <line x1="88" y1="133" x2="80" y2="133" stroke="#ffffff" strokeWidth="0.6"/>
        <line x1="88" y1="133" x2="88" y2="125" stroke="#ffffff" strokeWidth="0.6"/>
      </g>
    </svg>
  );
}