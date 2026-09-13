// Canonical animal-rank thresholds and gem rewards, driven by lifetime hands won.
// Single source of truth for both client display (client/src/ranks/data.ts layers
// images/colors on top of this) and server-side reward validation
// (server/routes.ts POST /api/ranks/claim-reward) — the server must never trust a
// client-supplied reward amount, so it looks the amount up here from the user's own
// real hands-won total instead.
export type RankDefinition = {
  key: string;
  name: string;
  min: number;
  max: number; // Infinity for the last rank
  gemReward?: number; // undefined = no claimable reward at this rank
};

// Gem rewards cut roughly to a third (2026-09-13, Anatole: gems are meant to be a rare,
// premium currency and the old ladder handed out 835 gems/season — more than 20x a top-tier
// Battle Pass chest's own gem payout — for reaching every rank in a single month, since these
// are claimable again each season alongside seasonHandsWon's own reset. Kept as round
// multiples of 5 rather than the raw /3 math (2, 4, 7, 15, 35...) per Anatole's ask.
export const RANKS: RankDefinition[] = [
  { key: 'pig', name: 'Oinkster', min: 0, max: 10 },
  { key: 'cow', name: 'Moo Rookie', min: 11, max: 25, gemReward: 5 },
  { key: 'fish', name: 'Splashy', min: 26, max: 50, gemReward: 10 },
  { key: 'fox', name: 'Trickster', min: 51, max: 75, gemReward: 15 },
  { key: 'eagle', name: 'Sky Master', min: 76, max: 100, gemReward: 25 },
  { key: 'tiger', name: 'Stripe King', min: 101, max: 150, gemReward: 35 },
  { key: 'camel', name: 'Chip Carrier', min: 151, max: 200, gemReward: 50 },
  { key: 'whale', name: 'High Roller', min: 201, max: 300, gemReward: 65 },
  { key: 'trex', name: 'Table Predator', min: 301, max: Infinity, gemReward: 100 },
];

export function getRankDefinition(key: string): RankDefinition | undefined {
  return RANKS.find((rank) => rank.key === key);
}
