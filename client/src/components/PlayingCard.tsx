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
  // Design avec rayures diagonales basé sur l'image fournie par l'utilisateur
  return (
    <svg className="absolute inset-0" viewBox="0 0 100 145" style={{ borderRadius: radius }}>
      <defs>
        {/* Gradient de fond gris clair */}
        <linearGradient id="cardBackGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E5E5E5" />
          <stop offset="50%" stopColor="#D1D1D1" />
          <stop offset="100%" stopColor="#C8C8C8" />
        </linearGradient>
        
        {/* Motif de rayures diagonales plus fines */}
        <pattern id="diagonalStripes" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect x="0" y="0" width="2" height="6" fill="#2a2a2a"/>
          <rect x="2" y="0" width="4" height="6" fill="transparent"/>
        </pattern>
      </defs>
      
      {/* Fond principal gris clair */}
      <rect x="0" y="0" width="100" height="145" rx={radius} fill="url(#cardBackGradient)" />
      
      {/* Zone principale avec rayures diagonales */}
      <rect x="6" y="6" width="88" height="133" rx={radius-3} fill="url(#diagonalStripes)" />
      
      {/* Bordure subtile */}
      <rect x="6" y="6" width="88" height="133" rx={radius-3} fill="none" stroke="#999999" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}