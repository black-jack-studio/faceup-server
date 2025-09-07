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
        "inline-flex items-center gap-2 rounded-full bg-white/6 ring-1 ring-white/10",
        "backdrop-blur-[1px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]",
        s.padX, s.padY, className,
      ].join(" ")}
      role="status"
      aria-label={`Coins: ${amount}`}
    >
      <Coin size={s.icon} glow={glow} />
      <span className={["font-medium text-white/90 tabular-nums", s.text].join(" ")}>
        {typeof amount === "number" ? amount.toLocaleString() : amount}
      </span>
    </div>
  );
}