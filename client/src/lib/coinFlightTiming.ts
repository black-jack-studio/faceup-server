// Shared timing constants between CoinBurst (the flying coin particles) and CountingBalance's
// "impact" mode (the header number that bumps up each time a coin actually lands on it) — the
// two need to agree on exactly when each coin arrives without passing a live schedule between
// them, so this is the single source of truth both read from. Change one, both stay in sync.

// Per-coin flight duration, in seconds (must match the `duration` on CoinBurst's motion.div).
export const COIN_FLIGHT_DURATION = 1.1;

// Delay added per coin index — the Nth coin in a burst starts N * COIN_STAGGER after the first.
export const COIN_STAGGER = 0.07;

// Fraction of COIN_FLIGHT_DURATION at which a coin actually reaches TARGET (must match the
// index-2 entry in CoinBurst's `times` keyframe array) — CountingBalance uses this to fire its
// bump right as the coin visually lands, not before or after.
export const COIN_ARRIVAL_FRACTION = 0.82;

// Seconds from a coin's own start until it visually lands on the target.
export function getCoinArrivalTime(coinIndex: number): number {
  return coinIndex * COIN_STAGGER + COIN_FLIGHT_DURATION * COIN_ARRIVAL_FRACTION;
}

export function getCoinImpactTimes(count: number): number[] {
  return Array.from({ length: count }, (_, i) => getCoinArrivalTime(i));
}
