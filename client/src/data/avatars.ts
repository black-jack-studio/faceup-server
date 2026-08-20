// Full replacement of the avatar catalog (2026-08-20): every avatar now comes from the
// attached_assets/avatars3d/ folder. "People"-shaped avatars ship as 5 separate skin-tone
// PNGs (light / medium-light / medium / medium-dark / dark) — the Avatars page's tone swatch
// picks which one is shown/selected. Everything else (animals, ghosts, robots, ...) has a
// single fixed image and ignores the tone swatch entirely.

export type SkinTone = 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark';

export const SKIN_TONES: SkinTone[] = ['light', 'medium-light', 'medium', 'medium-dark', 'dark'];

// Representative swatch colors for the tone-picker chip (approximate Fitzpatrick scale).
export const SKIN_TONE_COLORS: Record<SkinTone, string> = {
  light: '#F7DECE',
  'medium-light': '#F0C8A0',
  medium: '#D9A66C',
  'medium-dark': '#A9744F',
  dark: '#6E4A34',
};

export type AvatarCategory = 'people' | 'animals' | 'fantasy';

export interface ToneAvatar {
  kind: 'tone';
  baseId: string;
  name: string;
  category: AvatarCategory;
  images: Record<SkinTone, string>;
}

export interface StaticAvatar {
  kind: 'static';
  id: string;
  name: string;
  category: AvatarCategory;
  image: string;
}

export type AvatarEntry = ToneAvatar | StaticAvatar;

// Resolved avatar handed back to callers that just want to render {name, image}.
export interface ResolvedAvatar {
  id: string;
  name: string;
  image: string;
  category: AvatarCategory;
}

// The separator between a tone avatar's baseId and its tone in a stored/selected avatar id,
// e.g. "boy-3d::medium". Kept distinct from "-" since baseId and tone names both contain dashes.
const TONE_ID_SEPARATOR = '::';

const images = import.meta.glob('../../../attached_assets/avatars3d/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function imageFor(filename: string): string {
  const entry = Object.entries(images).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`Missing avatar asset: ${filename}`);
  }
  return entry[1];
}

function toneAvatar(baseId: string, name: string, category: AvatarCategory, filePrefix: string): ToneAvatar {
  return {
    kind: 'tone',
    baseId,
    name,
    category,
    images: {
      light: imageFor(`${filePrefix}_light.png`),
      'medium-light': imageFor(`${filePrefix}_medium-light.png`),
      medium: imageFor(`${filePrefix}_medium.png`),
      'medium-dark': imageFor(`${filePrefix}_medium-dark.png`),
      dark: imageFor(`${filePrefix}_dark.png`),
    },
  };
}

function staticAvatar(id: string, name: string, category: AvatarCategory, filename: string): StaticAvatar {
  return {
    kind: 'static',
    id,
    name,
    category,
    image: imageFor(filename),
  };
}

export const AVATAR_CATALOG: AvatarEntry[] = [
  // ---- People (5 skin-tone variants each) ----
  toneAvatar('boy-3d', 'Boy', 'people', 'boy_3d'),
  toneAvatar('girl-3d', 'Girl', 'people', 'girl_3d'),
  toneAvatar('man-bald-3d', 'Man (Bald)', 'people', 'man_bald_3d'),
  toneAvatar('man-blonde-3d', 'Man (Blonde)', 'people', 'man_blonde_hair_3d'),
  toneAvatar('man-curly-3d', 'Man (Curly Hair)', 'people', 'man_curly_hair_3d'),
  toneAvatar('man-red-3d', 'Man (Red Hair)', 'people', 'man_red_hair_3d'),
  toneAvatar('old-man-3d', 'Old Man', 'people', 'old_man_3d'),
  toneAvatar('woman-3d', 'Woman', 'people', 'woman_3d'),
  toneAvatar('woman-blonde-3d', 'Woman (Blonde)', 'people', 'woman_blonde_hair_3d'),
  toneAvatar('woman-curly-3d', 'Woman (Curly Hair)', 'people', 'woman_curly_hair_3d'),
  toneAvatar('woman-red-3d', 'Woman (Red Hair)', 'people', 'woman_red_hair_3d'),
  toneAvatar('woman-white-3d', 'Woman (White Hair)', 'people', 'woman_white_hair_3d'),
  toneAvatar('person-beard-3d', 'Person (Beard)', 'people', 'person_beard_3d'),
  toneAvatar('person-curly-3d', 'Person (Curly Hair)', 'people', 'person_curly_hair_3d'),
  toneAvatar('person-turban-3d', 'Person (Turban)', 'people', 'person_wearing_turban_3d'),
  toneAvatar('person-white-3d', 'Person (White Hair)', 'people', 'person_white_hair_3d'),

  // ---- Animals (single image, no tone variants) ----
  staticAvatar('bear-3d', 'Bear', 'animals', 'bear_3d.png'),
  staticAvatar('cow-3d', 'Cow', 'animals', 'cow_face_3d.png'),
  staticAvatar('dog-3d', 'Dog', 'animals', 'dog_face_3d.png'),
  staticAvatar('fox-3d', 'Fox', 'animals', 'fox_3d.png'),
  staticAvatar('frog-3d', 'Frog', 'animals', 'frog_3d.png'),
  staticAvatar('hamster-3d', 'Hamster', 'animals', 'hamster_3d.png'),
  staticAvatar('hear-no-evil-monkey-3d', 'Hear-No-Evil Monkey', 'animals', 'hear-no-evil_monkey_3d.png'),
  staticAvatar('koala-3d', 'Koala', 'animals', 'koala_3d.png'),
  staticAvatar('lion-3d', 'Lion', 'animals', 'lion_3d.png'),
  staticAvatar('monkey-3d', 'Monkey', 'animals', 'monkey_face_3d.png'),
  staticAvatar('mouse-3d', 'Mouse', 'animals', 'mouse_face_3d.png'),
  staticAvatar('panda-3d', 'Panda', 'animals', 'panda_3d.png'),
  staticAvatar('penguin-3d', 'Penguin', 'animals', 'penguin_3d.png'),
  staticAvatar('pig-3d', 'Pig', 'animals', 'pig_face_3d.png'),
  staticAvatar('polar-bear-3d', 'Polar Bear', 'animals', 'polar_bear_3d.png'),
  staticAvatar('rabbit-3d', 'Rabbit', 'animals', 'rabbit_face_3d.png'),
  staticAvatar('raccoon-3d', 'Raccoon', 'animals', 'raccoon_3d.png'),
  staticAvatar('shark-3d', 'Shark', 'animals', 'shark_3d.png'),
  staticAvatar('whale-3d', 'Whale', 'animals', 'spouting_whale_3d.png'),
  staticAvatar('t-rex-3d', 'T-Rex', 'animals', 't-rex_3d.png'),
  staticAvatar('tiger-3d', 'Tiger', 'animals', 'tiger_face_3d.png'),
  staticAvatar('wolf-3d', 'Wolf', 'animals', 'wolf_3d.png'),

  // ---- Fantasy ----
  toneAvatar('mrs-claus-3d', 'Mrs Claus', 'fantasy', 'mrs_claus_3d'),
  toneAvatar('mx-claus-3d', 'Mx Claus', 'fantasy', 'mx_claus_3d'),
  staticAvatar('ghost-3d', 'Ghost', 'fantasy', 'ghost_3d.png'),
  staticAvatar('man-zombie-3d', 'Zombie Man', 'fantasy', 'man_zombie_3d.png'),
  staticAvatar('woman-zombie-3d', 'Zombie Woman', 'fantasy', 'woman_zombie_3d.png'),
  staticAvatar('pile-of-poo-3d', 'Pile of Poo', 'fantasy', 'pile_of_poo_3d.png'),
  staticAvatar('robot-3d', 'Robot', 'fantasy', 'robot_3d.png'),
  staticAvatar('troll-3d', 'Troll', 'fantasy', 'troll_3d.png'),
];

// People and Animals are free for everyone; Fantasy avatars cost gems (see AVATAR_COST in
// the Avatars page / server route). Ownership for a tone avatar is keyed by its baseId — buy
// it once, wear it in any of the 5 tones.
export function isAvatarFree(entry: AvatarEntry): boolean {
  return entry.category !== 'fantasy';
}

// The id used for purchase/ownership tracking (server's user.ownedAvatars array).
export function avatarPurchaseId(entry: AvatarEntry): string {
  return entry.kind === 'tone' ? entry.baseId : entry.id;
}

export function buildSelectedAvatarId(entry: AvatarEntry, tone: SkinTone): string {
  return entry.kind === 'tone' ? `${entry.baseId}${TONE_ID_SEPARATOR}${tone}` : entry.id;
}

export const DEFAULT_AVATAR_ID = buildSelectedAvatarId(AVATAR_CATALOG[0] as ToneAvatar, 'medium');

export function getAvatarById(id: string | undefined | null): ResolvedAvatar | undefined {
  if (!id) return undefined;

  if (id.includes(TONE_ID_SEPARATOR)) {
    const [baseId, tone] = id.split(TONE_ID_SEPARATOR) as [string, SkinTone];
    const entry = AVATAR_CATALOG.find((a): a is ToneAvatar => a.kind === 'tone' && a.baseId === baseId);
    if (!entry) return undefined;
    const image = entry.images[tone] ?? entry.images.medium;
    return { id, name: entry.name, image, category: entry.category };
  }

  const entry = AVATAR_CATALOG.find((a): a is StaticAvatar => a.kind === 'static' && a.id === id);
  if (!entry) return undefined;
  return { id, name: entry.name, image: entry.image, category: entry.category };
}

export function getDefaultAvatar(): ResolvedAvatar {
  return getAvatarById(DEFAULT_AVATAR_ID)!;
}
