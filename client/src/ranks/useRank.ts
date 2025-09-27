import { RANKS, Rank } from './data';

export function getRankForChips(chips: number): Rank {
  for (const r of RANKS) {
    if (chips >= r.min && chips <= (Number.isFinite(r.max) ? r.max : chips)) return r;
  }
  return RANKS[0];
}

export function getProgressInRank(chips: number, rank: Rank): number {
  if (!Number.isFinite(rank.max)) return 1;
  const span = rank.max - rank.min;
  const v = (chips - rank.min) / Math.max(1, span);
  return Math.max(0, Math.min(1, v));
}