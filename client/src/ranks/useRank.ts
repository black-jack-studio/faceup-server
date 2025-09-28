import { RANKS, Rank } from './data';

export function getRankForWins(wins: number): Rank {
  for (const r of RANKS) {
    if (wins >= r.min && wins <= (Number.isFinite(r.max) ? r.max : wins)) return r;
  }
  return RANKS[0];
}

// Deprecated: Use getRankForWins instead
export function getRankForChips(chips: number): Rank {
  return getRankForWins(chips);
}

export function getProgressInRank(wins: number, rank: Rank): number {
  if (!Number.isFinite(rank.max)) return 1;
  const span = rank.max - rank.min;
  const v = (wins - rank.min) / Math.max(1, span);
  return Math.max(0, Math.min(1, v));
}