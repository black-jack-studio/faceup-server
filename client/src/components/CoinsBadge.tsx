import * as React from "react";
import Coin from "@/icons/Coin";

type Props = {
  amount: number | string;
  glow?: boolean;
  className?: string; // pour margin externe
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: { icon: 16, padX: "px-2.5", padY: "py-1", text: "text-[12px]" },
  md: { icon: 20, padX: "px-3",   padY: "py-1.5", text: "text-[13px]" },
  lg: { icon: 24, padX: "px-3.5", padY: "py-2", text: "text-[15px]" },
};

export default function CoinsBadge({ amount, glow = false, className = "", size = "md" }: Props) {
  const s = sizeMap[size];
  return (
    <div
      className={[
        "inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10",
        "backdrop-blur-sm",
        s.padX, s.padY, className,
      ].join(" ")}
      role="status"
      aria-label={`Coins: ${amount}`}
    >
      <Coin size={s.icon} glow={glow} />
      <span className={["font-medium text-white/90 tabular-nums", s.text].join(" ")}>
        {typeof amount === "number" ? amount.toLocaleString('fr-FR', { 
          maximumFractionDigits: 0,
          notation: 'standard' 
        }) : amount}
      </span>
    </div>
  );
}