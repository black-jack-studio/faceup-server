import * as React from "react";
import coinImage from "@assets/jgfcf_1757452832920.png";

export type CoinProps = {
  size?: number;         // px
  className?: string;    // tailwind etc.
  glow?: boolean;        // halo externe
};

export default function Coin({ size = 24, className = "", glow = false }: CoinProps) {
  return (
    <img
      src={coinImage}
      alt="Coin"
      width={size}
      height={size}
      className={`${className} ${glow ? 'filter drop-shadow-[0_0_8px_rgba(248,202,90,0.5)]' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}