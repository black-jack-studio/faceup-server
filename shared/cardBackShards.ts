// Card backs unlock via a Clash-Royale-style fragment system: a chest that rolls a card back
// item grants ONE shard toward a random not-yet-complete card back (see
// server/storage.ts's pickUnownedChestItem/applyChestItemGrant), rather than unlocking it
// outright. Flat across every rarity on purpose -- simpler than a per-rarity requirement.
export const CARD_BACK_SHARDS_REQUIRED = 2;
