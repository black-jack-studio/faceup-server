// Category + pricing for the avatar catalog. Kept separate from client/src/data/avatars.ts
// (which also carries the actual images via a Vite-only import.meta.glob) so this plain data
// can be imported from the server too, to price-check avatar purchases server-side instead of
// trusting whatever cost the client sends.

export type AvatarCategory = 'people' | 'animals' | 'fantasy';

// Gem cost per category. People are free; keyed here (not just "!== people") so adding a
// priced category later doesn't silently fall through to free.
export const AVATAR_CATEGORY_COST: Record<AvatarCategory, number> = {
  people: 0,
  animals: 25,
  fantasy: 50,
};

// Maps each avatar's purchase id (a tone avatar's baseId, or a static avatar's id) to its
// category. Must stay in sync with AVATAR_CATALOG in client/src/data/avatars.ts.
export const AVATAR_CATEGORY_BY_ID: Record<string, AvatarCategory> = {
  // People
  'boy-3d': 'people',
  'girl-3d': 'people',
  'man-bald-3d': 'people',
  'man-blonde-3d': 'people',
  'man-curly-3d': 'people',
  'man-red-3d': 'people',
  'old-man-3d': 'people',
  'woman-3d': 'people',
  'woman-blonde-3d': 'people',
  'woman-curly-3d': 'people',
  'woman-red-3d': 'people',
  'woman-white-3d': 'people',
  'person-beard-3d': 'people',
  'person-curly-3d': 'people',
  'person-turban-3d': 'people',
  'person-white-3d': 'people',

  // Animals
  'bear-3d': 'animals',
  'cow-3d': 'animals',
  'dog-3d': 'animals',
  'fox-3d': 'animals',
  'frog-3d': 'animals',
  'hamster-3d': 'animals',
  'hear-no-evil-monkey-3d': 'animals',
  'koala-3d': 'animals',
  'lion-3d': 'animals',
  'monkey-3d': 'animals',
  'mouse-3d': 'animals',
  'panda-3d': 'animals',
  'penguin-3d': 'animals',
  'pig-3d': 'animals',
  'polar-bear-3d': 'animals',
  'rabbit-3d': 'animals',
  'raccoon-3d': 'animals',
  'shark-3d': 'animals',
  'whale-3d': 'animals',
  't-rex-3d': 'animals',
  'tiger-3d': 'animals',
  'wolf-3d': 'animals',

  // Fantasy
  'mrs-claus-3d': 'fantasy',
  'mx-claus-3d': 'fantasy',
  'ghost-3d': 'fantasy',
  'man-zombie-3d': 'fantasy',
  'woman-zombie-3d': 'fantasy',
  'pile-of-poo-3d': 'fantasy',
  'robot-3d': 'fantasy',
  'troll-3d': 'fantasy',
};

export function avatarCostFor(purchaseId: string): number {
  const category = AVATAR_CATEGORY_BY_ID[purchaseId];
  if (!category) return AVATAR_CATEGORY_COST.fantasy; // unknown id — price it at the top tier rather than free
  return AVATAR_CATEGORY_COST[category];
}
