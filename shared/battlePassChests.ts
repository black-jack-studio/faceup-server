// The 5 Battle Pass chest tiers (replaces the old "same 2 icons for all 50 tiers" system).
// Ranked weakest -> strongest: wood < silver < gold < purple < crown. Only the top two
// (purple, crown) can drop a card dose — everything below only ever pays out coins/gems/
// swap tokens, in escalating amounts. See getChestTierForPassTier() below for which tier
// of the pass hands out which chest, on the free and premium tracks.
export type BattlePassChestTier = 'wood' | 'silver' | 'gold' | 'purple' | 'crown';

export const BATTLE_PASS_CHEST_TIERS: BattlePassChestTier[] = ['wood', 'silver', 'gold', 'purple', 'crown'];

interface ResourceRoll {
  chance: number; // 0-1, probability this resource appears at all in the chest
  min: number;
  max: number; // inclusive
}

export interface BattlePassChestContents {
  coins: ResourceRoll; // coins always roll (chance is 1 for every tier)
  gems: ResourceRoll;
  swapTokens: ResourceRoll;
  cardDose?: {
    chance: number; // probability of at least one card
    extraCardChance?: number; // probability of a *second* card, rolled only if the first hit
  };
}

// Reward pools per chest tier. Numbers are deliberately in the same ballpark as the game's
// existing economy (old free BP: 200-400 coins or 5 gems; old premium: 500-2000 coins or 15
// gems; shop gold chest costs 40 gems for one card) so the new chests feel like a richer,
// more textured version of what already existed rather than a totally different scale.
export const BATTLE_PASS_CHEST_CONTENTS: Record<BattlePassChestTier, BattlePassChestContents> = {
  wood: {
    coins: { chance: 1, min: 80, max: 180 },
    gems: { chance: 0.5, min: 2, max: 4 },
    swapTokens: { chance: 0.5, min: 1, max: 1 },
  },
  silver: {
    coins: { chance: 1, min: 150, max: 300 },
    gems: { chance: 0.5, min: 3, max: 6 },
    swapTokens: { chance: 0.5, min: 1, max: 1 },
  },
  gold: {
    coins: { chance: 1, min: 300, max: 600 },
    gems: { chance: 0.5, min: 6, max: 12 },
    swapTokens: { chance: 0.5, min: 1, max: 2 },
  },
  purple: {
    coins: { chance: 1, min: 600, max: 1200 },
    gems: { chance: 0.5, min: 12, max: 20 },
    swapTokens: { chance: 0.5, min: 2, max: 3 },
    cardDose: { chance: 0.5 },
  },
  crown: {
    coins: { chance: 1, min: 1500, max: 3000 },
    gems: { chance: 0.5, min: 20, max: 40 },
    swapTokens: { chance: 0.5, min: 3, max: 5 },
    cardDose: { chance: 0.5, extraCardChance: 0.5 },
  },
};

// Milestone tiers (10/20/30/40/50) already got a "golden" glow treatment in the old system.
// Their chest tier is boosted one notch further and their coin/gem amounts get a bonus
// multiplier below, so they read as clearly bigger than a same-tier filler chest.
export const MILESTONE_TIERS = new Set([10, 20, 30, 40, 50]);

// Applied to coin/gem/swapToken amounts (not to card-dose odds) so the *same* chest tier
// still feels bigger the deeper into the pass it's opened -- e.g. premium's Crown at 30 vs
// 40 vs 50 aren't identical payouts even though they're the same rarity of chest.
export const MILESTONE_AMOUNT_MULTIPLIER: Record<number, number> = {
  10: 1.2,
  20: 1.4,
  30: 1.6,
  40: 1.8,
  50: 2.2,
};

export function amountMultiplierForTier(tier: number): number {
  return MILESTONE_AMOUNT_MULTIPLIER[tier] ?? 1;
}

const CHEST_RANK: Record<BattlePassChestTier, number> = { wood: 0, silver: 1, gold: 2, purple: 3, crown: 4 };
const CHEST_BY_RANK = BATTLE_PASS_CHEST_TIERS; // index === rank

function bump(tier: BattlePassChestTier, by: number): BattlePassChestTier {
  const rank = Math.min(CHEST_RANK[tier] + by, CHEST_RANK.crown);
  return CHEST_BY_RANK[rank];
}

// Free track (tiers 1-30): Wood filler with a Silver every 5 tiers. Capped there on purpose --
// Gold/Purple/Crown are premium-exclusive, so free never hands out a chest that visually reads
// as a premium reward, even at its own tier-30 finale.
function freeChestTier(tier: number): BattlePassChestTier {
  if (tier % 5 === 0) return 'silver';
  return 'wood';
}

// Milestones 30/40/50 are explicitly pinned to Crown -- the pass's endgame rarity -- rather
// than derived, so Crown reads as "you made it deep into premium," not just "it's a
// multiple of 10." 10/20 are pinned to Purple: already clearly better than anything free
// offers at that point, but held back from Crown so tier 30 still feels like a step up.
const PREMIUM_MILESTONE_CHEST: Record<number, BattlePassChestTier> = {
  10: 'purple',
  20: 'purple',
  30: 'crown',
  40: 'crown',
  50: 'crown',
};

// Premium track (tiers 1-50): tier 1 is forced straight to Gold -- the instant "I paid for
// this and I can feel it" hook. Non-milestone tiers track two full rarities above the free
// track's curve tier-for-tier (so premium never gives *less* than what free already teased:
// free's Wood filler -> Gold, free's every-5 Silver treat -> Purple). Tiers 31-49 have no
// free equivalent so they ramp on their own, purple/gold alternating, tilting to crown near
// the very end.
function premiumChestTier(tier: number): BattlePassChestTier {
  if (tier === 1) return 'gold';
  if (PREMIUM_MILESTONE_CHEST[tier]) return PREMIUM_MILESTONE_CHEST[tier];
  if (tier <= 30) return bump(freeChestTier(tier), 2);
  // 31-49 filler: alternate purple/gold, tilting to crown near the very end
  if (tier >= 45) return tier % 2 === 1 ? 'purple' : 'crown';
  return tier % 2 === 1 ? 'purple' : 'gold';
}

export function getChestTierForPassTier(tier: number, isPremium: boolean): BattlePassChestTier {
  return isPremium ? premiumChestTier(tier) : freeChestTier(tier);
}

export function isBattlePassMilestoneTier(tier: number): boolean {
  return MILESTONE_TIERS.has(tier);
}

export interface BattlePassChestRoll {
  coins: number;
  gems: number;
  swapTokens: number;
  cardCount: number; // 0, 1, or 2 -- actual card selection needs a DB read, done by the caller
}

function rollResource(roll: ResourceRoll, multiplier: number): number {
  if (Math.random() > roll.chance) return 0;
  const amount = roll.min + Math.floor(Math.random() * (roll.max - roll.min + 1));
  return Math.round(amount * multiplier);
}

// Coins always land (every chest guarantees *something*); gems/swap tokens/cards each roll
// independently against the tier's odds, so two chests of the same tier can look different --
// same spirit as the old system's "50% coins or 50% gems," just richer.
export function rollChestRewards(chestTier: BattlePassChestTier, tier: number): BattlePassChestRoll {
  const contents = BATTLE_PASS_CHEST_CONTENTS[chestTier];
  const multiplier = amountMultiplierForTier(tier);

  let cardCount = 0;
  if (contents.cardDose && Math.random() < contents.cardDose.chance) {
    cardCount = 1;
    if (contents.cardDose.extraCardChance && Math.random() < contents.cardDose.extraCardChance) {
      cardCount = 2;
    }
  }

  return {
    coins: rollResource(contents.coins, multiplier),
    gems: rollResource(contents.gems, multiplier),
    swapTokens: rollResource(contents.swapTokens, multiplier),
    cardCount,
  };
}
