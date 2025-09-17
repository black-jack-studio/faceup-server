import * as React from "react";

export type CoinProps = {
  size?: number;         // px
  className?: string;    // tailwind etc.
  glow?: boolean;        // halo externe
};

export default function Coin({ size = 24, className = "", glow = false }: CoinProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${glow ? 'filter drop-shadow-[0_0_8px_rgba(248,202,90,0.5)]' : ''}`}
    >
      <circle cx="12" cy="12" r="10" fill="#F59E0B" stroke="#D97706" strokeWidth="2"/>
      <circle cx="12" cy="12" r="6" fill="#FCD34D"/>
      <text x="12" y="16" textAnchor="middle" fontSize="8" fill="#92400E" fontWeight="bold">$</text>
    </svg>
  );
}