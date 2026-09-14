// How big a win's celebration (confetti, flying coins, balance count-up, sound) should feel,
// scaled to the CURRENT table's own bet range rather than to a flat coin amount — a table with
// maxBet 500 and one with maxBet 10000 are different economies, so "winning 500" should read as
// huge on the first and barely register on the second. See the "1-500 vs 500-10000" brief this
// came from.

export type WinTier = "small" | "medium" | "large" | "huge";

interface TierSpec {
  tier: WinTier;
  // Piece count for the full-screen WinCelebration rain (client/src/components/game/play/
  // WinCelebration.tsx) — the only confetti a win triggers now (the old local burst right at the
  // win text, ConfettiBurst, was removed: layering both read as one cluttered collision instead
  // of one clean sweep, see WinCelebration's own comment). Every win gets this full-screen layer,
  // not just big ones (Stanislas, 2026-09-14: "à fond" every time) — this still scales it with
  // the win's own size so a huge win reads as bigger than a min-bet one, it just never drops to
  // zero/skips it.
  rainCount: number;
  coinCount: number;
  countDuration: number;
  soundPlaybackRate: number;
  soundVolumeBoost: number;
}

// Ordered low to high — getWinIntensity picks the last one whose threshold the ratio clears.
const TIERS: (TierSpec & { minRatio: number })[] = [
  { tier: "small", minRatio: 0, rainCount: 55, coinCount: 3, countDuration: 0.6, soundPlaybackRate: 1, soundVolumeBoost: 0 },
  { tier: "medium", minRatio: 0.2, rainCount: 80, coinCount: 6, countDuration: 1.0, soundPlaybackRate: 1, soundVolumeBoost: 0 },
  { tier: "large", minRatio: 0.5, rainCount: 110, coinCount: 10, countDuration: 1.4, soundPlaybackRate: 1.05, soundVolumeBoost: 0.1 },
  { tier: "huge", minRatio: 1, rainCount: 150, coinCount: 16, countDuration: 1.8, soundPlaybackRate: 1.15, soundVolumeBoost: 0.2 },
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
