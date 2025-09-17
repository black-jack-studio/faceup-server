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

  // Debug: Log pour voir quelles URLs arrivent ici
  console.log('🃏 CardBack render:', { imageUrl, hasError });

  // Show default SVG or TEST with static URL if no imageUrl provided or if image failed to load
  if (hasError || !imageUrl) {
    // TEST : Essayons de forcer une URL pour diagnostiquer
    const testImageUrl = '/card-backs/common-grid-003.webp';
    console.log('🔎 Testing with static URL:', testImageUrl);
    
    return (
      <div 
        className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center"
        style={{ borderRadius: radius }}
      >
        {/* Test : essayer de charger une image statique pour diagnostiquer */}
        <img 
          src={testImageUrl}
          alt="Card back test"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ borderRadius: radius }}
          onLoad={() => console.log('✅ STATIC IMAGE LOADED SUCCESSFULLY:', testImageUrl)}
          onError={(e) => {
            console.error('❌ STATIC IMAGE ALSO FAILED:', testImageUrl, e);
            // Si même l'image statique échoue, montrer un meilleur SVG par défaut
            e.currentTarget.style.display = 'none';
          }}
          data-testid="card-back-test"
        />
        
        {/* SVG de fallback amélioré avec ratio 3:4 */}
        <svg 
          className="absolute inset-0 w-full h-full" 
          viewBox="0 0 300 400" 
          style={{ borderRadius: radius }}
          preserveAspectRatio="xMidYMid slice"
          data-testid="card-back-fallback"
        >
          <defs>
            <linearGradient id="cardBackGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1f2937" />
              <stop offset="50%" stopColor="#374151" />
              <stop offset="100%" stopColor="#4b5563" />
            </linearGradient>
            
            <pattern id="gridPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="20" height="20" fill="#1f2937"/>
              <rect x="0" y="0" width="1" height="20" fill="#6b7280"/>
              <rect x="0" y="0" width="20" height="1" fill="#6b7280"/>
            </pattern>
          </defs>
          
          <rect x="0" y="0" width="300" height="400" rx={radius * 3} fill="url(#cardBackGradient)" />
          <rect x="15" y="15" width="270" height="370" rx={radius * 2} fill="url(#gridPattern)" opacity="0.7" />
          <rect x="15" y="15" width="270" height="370" rx={radius * 2} fill="none" stroke="#9ca3af" strokeWidth="1" opacity="0.3" />
          
          {/* Logo ou texte centre pour identifier que c'est un fallback */}
          <text x="150" y="200" textAnchor="middle" fill="#9ca3af" fontSize="16" fontFamily="monospace">Card Back</text>
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