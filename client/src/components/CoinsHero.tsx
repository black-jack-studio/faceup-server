import React from 'react';
import { useUserStore } from '@/store/user-store';

// Icône coin minimaliste en SVG (asset original)
const CoinIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <defs>
      <radialGradient id="coinGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F8CA5A" />
        <stop offset="60%" stopColor="#E5AE3F" />
        <stop offset="100%" stopColor="#C98E1F" />
      </radialGradient>
    </defs>
    <circle cx="12" cy="12" r="9" fill="url(#coinGrad)" />
    <circle cx="12" cy="12" r="9" stroke="#5a4314" strokeOpacity={0.35} />
  </svg>
);

export default function CoinsHero() {
  // valeurs depuis le store, avec fallback pour dev
  const user = useUserStore((state) => state.user);
  const coins = user?.coins ?? 1000;

  return (
    <section
      aria-label="Coins summary"
      className="mx-auto mt-6 w-[92%] rounded-3xl bg-gradient-to-b from-[#121318] to-[#0E0F13] 
                 shadow-[0_0_60px_rgba(60,255,170,0.08)] ring-1 ring-white/5 p-5 text-center
                 transition-transform duration-150 active:scale-[0.985]"
      data-testid="coins-hero"
    >
      <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 ring-1 ring-white/10">
        <CoinIcon />
        <span className="text-white/80 text-sm">Coins</span>
      </div>

      <div className="mt-3 text-[64px] leading-none font-semibold tracking-tight text-[#B5F3C7]" data-testid="coins-amount">
        {coins.toLocaleString()}
      </div>

      <p className="mt-1 text-white/50 text-sm">Total coins</p>
    </section>
  );
}