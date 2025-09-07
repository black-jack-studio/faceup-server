import * as React from "react";

export type CoinProps = {
  size?: number;         // px
  className?: string;    // tailwind etc.
  glow?: boolean;        // halo externe
};

export default function Coin({ size = 24, className = "", glow = false }: CoinProps) {
  const s = size;
  const rOuter = s * 0.48;
  const cx = s / 2;
  const cy = s / 2;

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      className={className}
      aria-hidden
    >
      {/* Glow externe */}
      {glow && (
        <circle
          cx={cx}
          cy={cy}
          r={rOuter}
          fill="none"
          stroke="rgba(248,202,90,0.35)"
          strokeWidth={s * 0.14}
          filter="url(#coin-blur)"
        />
      )}

      <defs>
        {/* léger blur pour le glow */}
        <filter id="coin-blur">
          <feGaussianBlur stdDeviation={s * 0.12} />
        </filter>

        {/* face principale (doré) */}
        <radialGradient id="coin-fill" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#FFE28A" />
          <stop offset="45%" stopColor="#F8CA5A" />
          <stop offset="100%" stopColor="#D89B2C" />
        </radialGradient>

        {/* bord extérieur plus sombre */}
        <linearGradient id="coin-edge" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#8A5D19" />
          <stop offset="100%" stopColor="#5A3F12" />
        </linearGradient>

        {/* reflet glossy */}
        <linearGradient id="coin-gloss" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
        </linearGradient>

        {/* ombre interne subtile */}
        <filter id="coin-inner-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feOffset dx="0" dy="1" />
          <feGaussianBlur stdDeviation={s * 0.03} result="offset-blur" />
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
          <feFlood floodColor="rgba(0,0,0,0.35)" result="color" />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>

      {/* tranche extérieure */}
      <circle cx={cx} cy={cy} r={rOuter} fill="url(#coin-edge)" />

      {/* face */}
      <circle
        cx={cx}
        cy={cy}
        r={s * 0.42}
        fill="url(#coin-fill)"
        filter="url(#coin-inner-shadow)"
      />

      {/* "mint mark" (petit sigle) – simple losange stylisé */}
      <g transform={`translate(${cx}, ${cy})`}>
        <path
          d={`M 0 ${-s * 0.17} L ${s * 0.12} 0 L 0 ${s * 0.17} L ${-s * 0.12} 0 Z`}
          fill="#FFE9B0"
          opacity="0.85"
        />
        <path
          d={`M 0 ${-s * 0.13} L ${s * 0.09} 0 L 0 ${s * 0.13} L ${-s * 0.09} 0 Z`}
          fill="#B97C1A"
          opacity="0.35"
        />
      </g>

      {/* reflet haut */}
      <ellipse
        cx={cx}
        cy={cy - s * 0.18}
        rx={s * 0.22}
        ry={s * 0.10}
        fill="url(#coin-gloss)"
      />
    </svg>
  );
}