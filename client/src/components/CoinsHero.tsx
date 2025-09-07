import React from 'react';
import { useUserStore } from '@/store/user-store';

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