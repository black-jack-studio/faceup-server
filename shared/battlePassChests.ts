// The 5 chest tiers, shared by the Battle Pass (which hands them out as tier rewards) and the
// Shop (which sells gold/purple/crown directly for gems — see shared/chestCatalog.ts). Ranked
// weakest -> strongest: wood < silver < gold < purple < crown. Every tier can drop every kind
// of reward (coins/gems/swap tokens/card backs/Mystery avatars/emotes) — what changes per tier
// is the *chance* of an item (card back/avatar/emote) instead of currency, climbing from wood's
// 2% up to crown's 25% (see ITEM_CHANCE below), never anywhere close to a coin flip. The Shop
// and the Pass roll the *same* reward tables for gold/purple/crown by construction — both just
// call rollChestReward() with the tier — so there is only one place to tune odds.
export type BattlePassChestTier = 'wood' | 'silver' | 'gold' | 'purple' | 'crown';

export const BATTLE_PASS_CHEST_TIERS: BattlePassChestTier[] = ['wood', 'silver', 'gold', 'purple', 'crown'];

export type ChestResourceKind = 'coins' | 'gems' | 'swapTokens';

interface ResourceRange {
  min: number;
  max: number; // inclusive
}

export interface BattlePassChestContents {
  coins: ResourceRange;
  gems: ResourceRange;
  swapTokens: ResourceRange;
}

// Reward pools per chest tier. Ranges are unchanged from the previous "roll every resource
// independently" system — see rollChestReward() below for how a chest now picks *which*
// resource(s) it actually pays out from these ranges.
export const BATTLE_PASS_CHEST_CONTENTS: Record<BattlePassChestTier, BattlePassChestContents> = {
  wood: {
    coins: { min: 80, max: 180 },
    gems: { min: 2, max: 4 },
    swapTokens: { min: 1, max: 1 },
  },
  silver: {
    coins: { min: 150, max: 300 },
    gems: { min: 3, max: 6 },
    swapTokens: { min: 1, max: 1 },
  },
  gold: {
    coins: { min: 300, max: 600 },
    gems: { min: 6, max: 12 },
    swapTokens: { min: 1, max: 2 },
  },
  purple: {
    coins: { min: 600, max: 1200 },
    gems: { min: 12, max: 20 },
    swapTokens: { min: 2, max: 3 },
  },
  crown: {
    coins: { min: 1500, max: 3000 },
    gems: { min: 20, max: 40 },
    swapTokens: { min: 3, max: 5 },
  },
};

// Milestone tiers (10/20/30/40/50) already got a "golden" glow treatment in the old system.
// Their chest tier is boosted one notch further and their coin/gem/swap amounts get a bonus
// multiplier below (never applied to card-dose odds), so they read as clearly bigger than a
// same-tier filler chest.
export const MILESTONE_TIERS = new Set([10, 20, 30, 40, 50]);

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

// Free track (tiers 1-30): Wood filler with a Silver every 5 tiers, except 10/20/30 which are
// bumped up to Purple -- three deliberate "wait, THIS is free??" moments spread through the
// season instead of just one at the very end. Gold and Crown stay fully premium-exclusive;
// free never hands out either, no matter how far a player gets.
function freeChestTier(tier: number): BattlePassChestTier {
  if (tier === 10 || tier === 20 || tier === 30) return 'purple';
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

// Premium track (tiers 1-50): tier 1 is forced straight to Crown -- the immediate "I paid for
// this and I can feel it" hook, upgraded from Gold since a single Crown right away sells the
// purchase harder than a slower ramp does. Tier 44 is also forced to Crown, breaking up the
// 46/48/50 cluster so the pass's last stretch has a Crown roughly every other tier instead of
// only at the very end. Non-milestone tiers <= 30 (excluding 1) track two full rarities above
// the free track's curve tier-for-tier (free's Wood filler -> Gold, free's every-5 Silver
// treat -> Purple; tiers 10/20/30 are themselves milestones so their own free-track Purple
// never reaches this bump). Tiers 31-49 have no free equivalent so they ramp on their own:
// Purple only every 3rd tier (not every other one -- that read as too repetitive/predictable
// this deep into the pass), tilting to Crown near the very end.
function premiumChestTier(tier: number): BattlePassChestTier {
  if (tier === 1) return 'crown';
  if (tier === 44) return 'crown';
  if (PREMIUM_MILESTONE_CHEST[tier]) return PREMIUM_MILESTONE_CHEST[tier];
  if (tier <= 30) return bump(freeChestTier(tier), 2);
  if (tier >= 45) return tier % 2 === 1 ? 'purple' : 'crown';
  return tier % 3 === 0 ? 'purple' : 'gold';
}

export function getChestTierForPassTier(tier: number, isPremium: boolean): BattlePassChestTier {
  return isPremium ? premiumChestTier(tier) : freeChestTier(tier);
}

export function isBattlePassMilestoneTier(tier: number): boolean {
  return MILESTONE_TIERS.has(tier);
}

// --- Reward rolling -----------------------------------------------------------------------
//
// One chest, one of two shapes of payout:
//  - An ITEM (card back / Mystery avatar / emote) and nothing else. Every tier can roll one,
//    at a chance that climbs with rarity but never gets close to "coin flip" territory (see
//    ITEM_CHANCE below). *Which* specific item — and whether the player has anything left to
//    unlock in that category — needs a DB read, so that part happens in server/storage.ts;
//    this file only decides the item's *type*.
//  - Resources: coins/gems/swapTokens. Every tier pays out exactly ONE (coins common, gems
//    rarer, swap tokens rarest) -- never a resource alongside an item.
//
// Coin amounts are rounded to the nearest 10 so players never see an odd number like "88
// coins" -- gem/swap-token amounts are small enough already that they stay as rolled.

function pickWeighted<T extends { weight: number }>(options: T[]): T {
  const total = options.reduce((sum, o) => sum + o.weight, 0);
  let roll = Math.random() * total;
  for (const option of options) {
    roll -= option.weight;
    if (roll <= 0) return option;
  }
  return options[options.length - 1];
}

function roundToTen(n: number): number {
  return Math.round(n / 10) * 10;
}

export type ChestItemKind = 'cardBack' | 'avatar' | 'emote';

// Chance a chest rolls an item (card back/avatar/emote) instead of resources, per tier.
// Climbs with rarity but stays far from "aberrant" even at the very top (crown 25%, not 50%).
export const ITEM_CHANCE: Record<BattlePassChestTier, number> = {
  wood: 0.02,
  silver: 0.035,
  gold: 0.10,
  purple: 0.15,
  crown: 0.25,
};

// Which item type an item roll lands on. Card backs are the most common of the three; Mystery
// avatars the rarest (only 14 exist and they're the priciest single unlock in the shop).
const ITEM_TYPE_WEIGHTS: { kind: ChestItemKind; weight: number }[] = [
  { kind: 'cardBack', weight: 50 },
  { kind: 'emote', weight: 30 },
  { kind: 'avatar', weight: 20 },
];

// Which single resource a chest gives when it doesn't roll an item. Coins stay the common case,
// gems a rarer treat, swap tokens the rarest of the three -- same shape as the wheel of
// fortune's own weighting.
const SINGLE_REWARD_WEIGHTS: { kind: ChestResourceKind; weight: number }[] = [
  { kind: 'coins', weight: 70 },
  { kind: 'gems', weight: 25 },
  { kind: 'swapTokens', weight: 5 },
];

function rollResourceAmount(contents: BattlePassChestContents, kind: ChestResourceKind, multiplier: number): number {
  const range = contents[kind];
  const raw = range.min + Math.floor(Math.random() * (range.max - range.min + 1));
  const scaled = raw * multiplier;
  return kind === 'coins' ? roundToTen(scaled) : Math.round(scaled);
}

function rollResourcesOnly(
  chestTier: BattlePassChestTier,
  multiplier: number
): { kind: ChestResourceKind; amount: number }[] {
  const contents = BATTLE_PASS_CHEST_CONTENTS[chestTier];
  const kind = pickWeighted(SINGLE_REWARD_WEIGHTS).kind;
  return [{ kind, amount: rollResourceAmount(contents, kind, multiplier) }];
}

export interface BattlePassChestRoll {
  itemKind: ChestItemKind | null; // which *type* of item, if any -- server picks the specific one
  rewards: { kind: ChestResourceKind; amount: number }[]; // empty when itemKind is set
}

// multiplier defaults to 1 (a plain Shop purchase); the Battle Pass passes
// amountMultiplierForTier(tier) so milestone tiers pay out more.
export function rollChestReward(chestTier: BattlePassChestTier, multiplier: number = 1): BattlePassChestRoll {
  if (Math.random() < ITEM_CHANCE[chestTier]) {
    return { itemKind: pickWeighted(ITEM_TYPE_WEIGHTS).kind, rewards: [] };
  }
  return { itemKind: null, rewards: rollResourcesOnly(chestTier, multiplier) };
}

// Used when a chest rolled an item but the player has nothing left to unlock in any of the 3
// item categories -- falls back to the tier's normal resource shape instead of the
// purchase/claim resolving to nothing.
export function rollFallbackResourceReward(
  chestTier: BattlePassChestTier,
  multiplier: number = 1
): { kind: ChestResourceKind; amount: number }[] {
  return rollResourcesOnly(chestTier, multiplier);
}
