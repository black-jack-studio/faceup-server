// Tiers + gem pricing for the Shop's chests. Kept separate from the reward-odds table (in
// shared/battlePassChests.ts, the single source of truth for what a chest actually pays out —
// the Shop and the Battle Pass both roll from it) so both the client display and the server
// route can price-check chest purchases from one shared source instead of trusting whatever
// cost the client sends.
//
// The Shop only sells the top 3 chest tiers (gold/purple/crown) — wood and silver are
// Battle-Pass-only filler, never purchasable directly. Renamed from the old bronze/silver/gold
// naming (which didn't match the Battle Pass's own tier names) so a "gold chest" means the same
// thing everywhere in the game.
export type ChestTier = 'gold' | 'purple' | 'crown';

export const CHEST_TIERS: ChestTier[] = ['gold', 'purple', 'crown'];

// Priced well above a casual impulse buy on purpose: these chests also drop for free as
// Battle Pass tier rewards (see shared/battlePassChests.ts), so if the standalone gem price
// felt trivial it would undercut the $3.99/month pass's value proposition. Scaled roughly with
// each tier's expected payout (~2-2.5x jump per tier, same ratio as the old bronze->silver->gold
// ladder).
export const CHEST_GEM_COST: Record<ChestTier, number> = {
  gold: 100,
  purple: 250,
  crown: 600,
};

export function chestCostFor(tier: ChestTier): number {
  return CHEST_GEM_COST[tier];
}
