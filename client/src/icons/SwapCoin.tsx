import * as React from "react";
import swapCoinImage from "@assets/coin_swap_purple_2026-09-01.png";

export type SwapCoinProps = {
  size?: number;         // px
  className?: string;    // tailwind etc.
};

// The swap-token currency icon (Classic solo's "discard and redeal" resource) — a 3D coin
// stamped with the swap glyph, matching the Coin/Gem icons' style. Replaces the plain
// SwapIcon arrows glyph everywhere swap tokens are shown as a currency amount.
export default function SwapCoin({ size = 24, className = "" }: SwapCoinProps) {
  return (
    <img
      src={swapCoinImage}
      alt="Swap token"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
