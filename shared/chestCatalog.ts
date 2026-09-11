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
// felt trivial it would undercut the $3.99/month pass's value proposition. Scaled 2x per tier,
// same ratio as the old bronze->silver->gold ladder. Lowered back to these values (Anatole,
// 2026-09-11): the 2026-09-02 bump to 100/250/600 left the currency-only expected return well
// under what these paid out at this price (~14-21%), reads as bad value even accounting for the
// unpriced chance of a card back/avatar/emote — see shared/battlePassChests.ts's own reward
// tables, unchanged since.
export const CHEST_GEM_COST: Record<ChestTier, number> = {
  gold: 50,
  purple: 100,
  crown: 200,
};

export function chestCostFor(tier: ChestTier): number {
  return CHEST_GEM_COST[tier];
}
