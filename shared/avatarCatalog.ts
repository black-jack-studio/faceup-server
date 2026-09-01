// Category + pricing for the avatar catalog. Kept separate from client/src/data/avatars.ts
// (which also carries the actual images via a Vite-only import.meta.glob) so this plain data
// can be imported from the server too, to price-check avatar purchases server-side instead of
// trusting whatever cost the client sends.

export type AvatarCategory = 'people' | 'animals' | 'fantasy' | 'legendary' | 'mystery';

// Default gem cost per category. People are free; keyed here (not just "!== people") so adding
// a priced category later doesn't silently fall through to free. Flat price per category
// (2026-08-31, bumped from 50/150) -- anchored to the "popular" gem pack (300 gems / $2.99,
// ~100 gems = $1): Animals ~$1.50, Fantasy ~$4, always pricier than the priciest Animal.
// Legendary (2026-09-01) sits one more step up, ~$6. Mystery has no avatars yet -- its price is
// a placeholder until the reveal mechanic (browsable catalog vs. blind gacha draw) is decided.
export const AVATAR_CATEGORY_COST: Record<AvatarCategory, number> = {
  people: 0,
  animals: 150,
  fantasy: 400,
  legendary: 600,
  mystery: 600,
};

// No per-avatar overrides for now -- every avatar in a category costs the same flat price
// (see AVATAR_CATEGORY_COST above).
export const AVATAR_PRICE_OVERRIDES: Record<string, number> = {};

// Maps each avatar's purchase id (a tone avatar's baseId, or a static avatar's id) to its
// category. Must stay in sync with AVATAR_CATALOG in client/src/data/avatars.ts.
export const AVATAR_CATEGORY_BY_ID: Record<string, AvatarCategory> = {
  // People
  'boy-3d': 'people',
  'girl-3d': 'people',
  'man-bald-3d': 'people',
  'man-blonde-3d': 'people',
  'man-red-3d': 'people',
  'old-man-3d': 'people',
  'old-woman-3d': 'people',
  'woman-bald-3d': 'people',
  'woman-beard-3d': 'people',
  'woman-blonde-3d': 'people',
  'woman-curly-3d': 'people',
  'woman-red-3d': 'people',
  'woman-white-3d': 'people',
  'person-beard-3d': 'people',
  'person-curly-3d': 'people',
  'person-white-3d': 'people',

  // Animals
  'bear-3d': 'animals',
  'cow-3d': 'animals',
  'dog-3d': 'animals',
  'fox-3d': 'animals',
  'frog-3d': 'animals',
  'hamster-3d': 'animals',
  'hear-no-evil-monkey-3d': 'animals',
  'horse-3d': 'animals',
  'koala-3d': 'animals',
  'lion-3d': 'animals',
  'monkey-3d': 'animals',
  'moose-3d': 'animals',
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
  'man-zombie-3d': 'fantasy',
  'woman-zombie-3d': 'fantasy',
  'troll-3d': 'fantasy',
  'ninja-3d': 'fantasy',
  'man-elf-3d': 'fantasy',
  'person-elf-3d': 'fantasy',
  'man-mage-3d': 'fantasy',
  'woman-mage-3d': 'fantasy',
  'man-superhero-3d': 'fantasy',
  'woman-superhero-3d': 'fantasy',
  'man-vampire-3d': 'fantasy',
  'woman-vampire-3d': 'fantasy',
  'man-genie-3d': 'fantasy',
  'woman-genie-3d': 'fantasy',

  // Legendary
  'unicorn-3d': 'legendary',
  'robot-3d': 'legendary',
  'alien-3d': 'legendary',
  'eye-3d': 'legendary',
  'moai-3d': 'legendary',
  'flying-saucer-3d': 'legendary',
  'skull-3d': 'legendary',
  'teddy-bear-3d': 'legendary',

  // Mystery
  'snowman-3d': 'mystery',
  'ghost-3d': 'mystery',
  'jack-o-lantern-3d': 'mystery',
  'pile-of-poo-3d': 'mystery',
};

export function avatarCostFor(purchaseId: string): number {
  const override = AVATAR_PRICE_OVERRIDES[purchaseId];
  if (override !== undefined) return override;
  const category = AVATAR_CATEGORY_BY_ID[purchaseId];
  if (!category) return AVATAR_CATEGORY_COST.fantasy; // unknown id — price it at the top tier rather than free
  return AVATAR_CATEGORY_COST[category];
}
