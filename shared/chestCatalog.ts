// Tiers + gem pricing for chests. Kept separate from the reward-odds table (in
// client/src/lib/economy.ts's EconomyManager, which the server also imports) so both the
// client display and the server route can price-check chest purchases from one shared source
// instead of trusting whatever cost the client sends.

export type ChestTier = 'bronze' | 'silver' | 'gold';

export const CHEST_TIERS: ChestTier[] = ['bronze', 'silver', 'gold'];

export const CHEST_GEM_COST: Record<ChestTier, number> = {
  bronze: 10,
  silver: 20,
  gold: 40,
};

export function chestCostFor(tier: ChestTier): number {
  return CHEST_GEM_COST[tier];
}
