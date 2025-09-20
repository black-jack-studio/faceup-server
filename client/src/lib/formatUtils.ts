/**
 * Format number to compact notation (K, M, B)
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000000) {
    return `${Math.floor(num / 1000000000)}B`;
  }
  if (num >= 1000000) {
    return `${Math.floor(num / 1000000)}M`;
  }
  if (num >= 1000) {
    return `${Math.floor(num / 1000)}K`;
  }
  return num.toString();
}

/**
 * Format number with French locale (spaces as thousand separators)
 */
export function formatFullNumber(num: number): string {
  return num.toLocaleString('fr-FR', { 
    maximumFractionDigits: 0,
    notation: 'standard' 
  });
}