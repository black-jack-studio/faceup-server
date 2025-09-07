import React from 'react';
import { useUserStore } from '@/store/user-store';
import { useChipsStore } from '@/store/chips-store';

export default function CoinsHero() {
  // valeurs depuis le store de jetons
  const { balance } = useChipsStore();

  return (
    <section
      aria-label="Coins summary"
      className="text-center px-6 mb-16"
      data-testid="coins-hero"
    >
      <div className="text-[72px] leading-none font-light tracking-tight text-white" data-testid="coins-amount">
        {balance.toLocaleString()}
      </div>
    </section>
  );
}