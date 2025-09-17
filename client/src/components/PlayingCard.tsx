import * as React from "react";
import { useState } from "react";
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
  cardBackUrl?: string | null; // custom card back image URL
};

export default function PlayingCard({
  rank = "A",
  suit = "spades",
  faceDown = false,
  size = "md",
  dimmed = false,
  className = "",
  cardBackUrl = null,
}: PlayingCardProps) {
  const S = sizeMap[size];

  // Si c'est une image personnalisée, afficher avec un border-radius cohérent
  if (faceDown && cardBackUrl) {
    return (
      <div
        className={[
          "relative select-none will-change-transform",
          "transition-all duration-400 ease-out",
          "transform-gpu",
          dimmed ? "opacity-60" : "opacity-100",
          className,
        ].join(" ")}
        style={{
          width: S.w,
          height: S.h,
        }}
      >
        <CardBack radius={S.r} imageUrl={cardBackUrl} />
      </div>
    );
  }

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
      {faceDown ? <CardBack radius={S.r} imageUrl={cardBackUrl} /> : (
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

function CardBack({ radius, imageUrl }: { radius: number; imageUrl?: string | null }) {
  const [hasError, setHasError] = useState(false);

  // Show classic card back if no custom imageUrl provided or if custom image failed to load
  if (hasError || !imageUrl) {
    return (
      <div 
        className="absolute inset-0 w-full h-full bg-white flex items-center justify-center"
        style={{ borderRadius: radius }}
      >
        {/* Classic card back: white background with exactly 11 black diagonal lines */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 300 400" 
          style={{ borderRadius: radius }}
          preserveAspectRatio="xMidYMid slice"
          data-testid="card-back-classic"
        >
          <defs>
            <clipPath id="cardClip">
              <rect x="0" y="0" width="300" height="400" rx={radius * 3} />
            </clipPath>
          </defs>
          
          <g clipPath="url(#cardClip)">
            {/* White background */}
            <rect x="0" y="0" width="300" height="400" fill="white" />
            
            {/* Exactly 11 diagonal lines at 45° - with white border margin around */}
            <g>
              <line x1="20" y1="-221.67" x2="280" y2="38.33" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="-163.33" x2="280" y2="96.67" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="-105" x2="280" y2="155" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="-46.67" x2="280" y2="213.33" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="11.67" x2="280" y2="271.67" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="70" x2="280" y2="330" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="128.33" x2="280" y2="388.33" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="186.67" x2="280" y2="446.67" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="245" x2="280" y2="505" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="303.33" x2="280" y2="563.33" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
              <line x1="20" y1="361.67" x2="280" y2="621.67" stroke="black" strokeWidth="10" strokeLinecap="butt"/>
            </g>
          </g>
        </svg>
      </div>
    );
  }

  // Show custom image with error handling - optimized for 3:4 ratio
  return (
    <div 
      className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-100 to-gray-200"
      style={{ borderRadius: radius }}
    >
      <img 
        src={imageUrl}
        alt="Custom card back"
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        style={{ 
          borderRadius: radius,
          aspectRatio: '3 / 4' // Force ratio 3:4 pour cartes
        }}
        onError={(e) => {
          console.error('❌ CardBack custom image failed to load:', imageUrl, e);
          console.error('Error details:', e.currentTarget.naturalWidth, e.currentTarget.naturalHeight, e.currentTarget.complete);
          setHasError(true);
        }}
        onLoad={(e) => {
          console.log('✅ CardBack custom image loaded successfully:', imageUrl);
          console.log('Image dimensions:', e.currentTarget.naturalWidth, 'x', e.currentTarget.naturalHeight);
        }}
        data-testid="card-back-custom"
      />
      
      {/* Overlay subtil pour améliorer l'intégration visuelle */}
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{ 
          borderRadius: radius,
          background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)"
        }}
      />
    </div>
  );
}