// Card backs unlock via a Clash-Royale-style fragment system: a chest that rolls a card back
// item grants ONE shard toward a random not-yet-complete card back (see
// server/storage.ts's pickUnownedChestItem/applyChestItemGrant), rather than unlocking it
// outright. Flat across every rarity on purpose (2026-09-02, confirmed with Anatole) -- simpler
// than a per-rarity requirement, and matches how consistently "4" came up when the mechanic was
// speced out.
export const CARD_BACK_SHARDS_REQUIRED = 4;
