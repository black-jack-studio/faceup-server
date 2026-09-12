// How big a win's celebration (confetti, flying coins, balance count-up, sound) should feel,
// scaled to the CURRENT table's own bet range rather than to a flat coin amount — a table with
// maxBet 500 and one with maxBet 10000 are different economies, so "winning 500" should read as
// huge on the first and barely register on the second. See the "1-500 vs 500-10000" brief this
// came from.

export type WinTier = "small" | "medium" | "large" | "huge";

interface TierSpec {
  tier: WinTier;
  confettiCount: number;
  coinCount: number;
  countDuration: number;
  soundPlaybackRate: number;
  soundVolumeBoost: number;
}

// Ordered low to high — getWinIntensity picks the last one whose threshold the ratio clears.
// confettiCount bumped across the board, twice now (Anatole, 2026-09-12, second pass: "vraiment
// que ça explose... qu'il y en ait plus" — the burst's own distance was dialed back down at the
// same time, see ConfettiBurst's own comment, so more pieces reads as denser/punchier rather
// than more scattered). coinCount/countDuration/sound untouched, this was specifically about the
// burst itself feeling bigger, not the whole celebration.
const TIERS: (TierSpec & { minRatio: number })[] = [
  { tier: "small", minRatio: 0, confettiCount: 22, coinCount: 3, countDuration: 0.6, soundPlaybackRate: 1, soundVolumeBoost: 0 },
  { tier: "medium", minRatio: 0.2, confettiCount: 34, coinCount: 6, countDuration: 1.0, soundPlaybackRate: 1, soundVolumeBoost: 0 },
  { tier: "large", minRatio: 0.5, confettiCount: 48, coinCount: 10, countDuration: 1.4, soundPlaybackRate: 1.05, soundVolumeBoost: 0.1 },
  { tier: "huge", minRatio: 1, confettiCount: 75, coinCount: 16, countDuration: 1.8, soundPlaybackRate: 1.15, soundVolumeBoost: 0.2 },
];

// Capped at 1: betting near/at the table's max already maxes out the celebration (winning
// bet*2 with bet = maxBet/2 already hits ratio 1), no need to distinguish further above that.
export function getWinRatio(amount: number, maxBet: number): number {
  if (!maxBet || maxBet <= 0) return 0;
  return Math.max(0, Math.min(1, amount / maxBet));
}

export function getWinIntensity(amount: number, maxBet: number): TierSpec {
  const ratio = getWinRatio(amount, maxBet);
  let picked = TIERS[0];
  for (const spec of TIERS) {
    if (ratio >= spec.minRatio) picked = spec;
  }
  const { minRatio, ...spec } = picked;
  return spec;
}
