// Tiers + gem pricing for chests. Kept separate from the reward-odds table (in
// client/src/lib/economy.ts's EconomyManager, which the server also imports) so both the
// client display and the server route can price-check chest purchases from one shared source
// instead of trusting whatever cost the client sends.

export type ChestTier = 'bronze' | 'silver' | 'gold';

export const CHEST_TIERS: ChestTier[] = ['bronze', 'silver', 'gold'];

// Priced well above a casual impulse buy on purpose: these chests also drop for free as
// Battle Pass tier rewards (see shared/battlePassChests.ts), so if the standalone gem price
// felt trivial it would undercut the $3.99/month pass's value proposition.
export const CHEST_GEM_COST: Record<ChestTier, number> = {
  bronze: 50,
  silver: 100,
  gold: 200,
};

export function chestCostFor(tier: ChestTier): number {
  return CHEST_GEM_COST[tier];
}
