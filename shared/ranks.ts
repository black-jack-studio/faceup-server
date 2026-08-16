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

export const RANKS: RankDefinition[] = [
  { key: 'pig', name: 'Oinkster', min: 0, max: 10 },
  { key: 'cow', name: 'Moo Rookie', min: 11, max: 25, gemReward: 5 },
  { key: 'fish', name: 'Splashy', min: 26, max: 50, gemReward: 10 },
  { key: 'fox', name: 'Trickster', min: 51, max: 75, gemReward: 20 },
  { key: 'eagle', name: 'Sky Master', min: 76, max: 100, gemReward: 50 },
  { key: 'tiger', name: 'Stripe King', min: 101, max: 150, gemReward: 100 },
  { key: 'camel', name: 'Chip Carrier', min: 151, max: 200, gemReward: 150 },
  { key: 'whale', name: 'High Roller', min: 201, max: 300, gemReward: 200 },
  { key: 'trex', name: 'Table Predator', min: 301, max: Infinity, gemReward: 300 },
];

export function getRankDefinition(key: string): RankDefinition | undefined {
  return RANKS.find((rank) => rank.key === key);
}
