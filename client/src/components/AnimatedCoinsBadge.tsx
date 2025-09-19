import * as React from "react";
import Coin from "@/icons/Coin";
import AnimatedCounter from "@/components/AnimatedCounter";

type Props = {
  amount: number;
  glow?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
  storageKey: string;
};

const sizeMap = {
  sm: { icon: 16, padX: "px-4", padY: "py-1", text: "text-[12px]" },
  md: { icon: 20, padX: "px-6",   padY: "py-1.5", text: "text-[13px]" },
  lg: { icon: 24, padX: "px-8", padY: "py-3", text: "text-lg" },
};

export default function AnimatedCoinsBadge({ amount, glow = false, className = "", size = "md", storageKey }: Props) {
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
      <AnimatedCounter
        value={amount}
        storageKey={storageKey}
        className={["text-accent-gold tabular-nums", s.text].join(" ")}
        testId="animated-coins-badge"
      />
    </div>
  );
}