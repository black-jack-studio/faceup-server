import * as React from "react";
import flameImage from "@assets/fire_3d_1758055031099.png";

export type FlameProps = {
  size?: number;         // px
  className?: string;    // tailwind etc.
  glow?: boolean;        // halo externe
};

export default function Flame({ size = 24, className = "", glow = false }: FlameProps) {
  return (
    <img
      src={flameImage}
      alt="Streak"
      width={size}
      height={size}
      className={`${className} ${glow ? 'filter drop-shadow-[0_0_8px_rgba(255,138,61,0.5)]' : ''}`}
      style={{ width: size, height: size }}
    />
  );
}
