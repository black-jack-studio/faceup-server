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
  const coins = user?.coins ?? 10550;

  return (
    <section
      aria-label="Coins summary"
      className="text-center px-6 mb-16"
      data-testid="coins-hero"
    >
      <div className="text-[72px] leading-none font-light tracking-tight text-white" data-testid="coins-amount">
        {coins.toLocaleString()}
      </div>
    </section>
  );
}