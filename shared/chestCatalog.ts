// Tiers + bolt pricing for chests. Kept separate from the reward-odds table (in
// client/src/lib/economy.ts's EconomyManager, which the server also imports) so both the
// client display and the server route can price-check chest purchases from one shared source
// instead of trusting whatever cost the client sends.

export type ChestTier = 'bronze' | 'silver' | 'gold';

export const CHEST_TIERS: ChestTier[] = ['bronze', 'silver', 'gold'];

export const CHEST_BOLT_COST: Record<ChestTier, number> = {
  bronze: 25,
  silver: 50,
  gold: 100,
};

export function chestCostFor(tier: ChestTier): number {
  return CHEST_BOLT_COST[tier];
}
