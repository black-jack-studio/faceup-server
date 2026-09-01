// Full replacement of the avatar catalog (2026-08-20): every avatar now comes from the
// attached_assets/avatars3d/ folder. "People"-shaped avatars ship as 5 separate skin-tone
// PNGs (light / medium-light / medium / medium-dark / dark) — the Avatars page's tone swatch
// picks which one is shown/selected. Everything else (animals, ghosts, robots, ...) has a
// single fixed image and ignores the tone swatch entirely.

import { type AvatarCategory, avatarCostFor } from "@shared/avatarCatalog";

export type { AvatarCategory };

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
  // Strict 2-column grid: every "male" entry (Boy, Man (*), Person (*), Old Man) sits in the
  // left column, every "female" entry (Girl, Woman (*), Old Woman) in the right column, each
  // row pairing a matching trait (young / blonde / red / curly / bald / beard / white hair /
  // old). "Person (*)" is the de facto male slot for curly/beard/white-hair, matching the
  // "Woman (*)" naming on the right. Baby and the plain "Woman" (a trailing row with no
  // opposite-sex counterpart) were dropped from the end of this list.
  toneAvatar('boy-3d', 'Boy', 'people', 'boy_3d'),
  toneAvatar('girl-3d', 'Girl', 'people', 'girl_3d'),
  toneAvatar('man-blonde-3d', 'Man (Blonde)', 'people', 'man_blonde_hair_3d'),
  toneAvatar('woman-blonde-3d', 'Woman (Blonde)', 'people', 'woman_blonde_hair_3d'),
  toneAvatar('man-red-3d', 'Man (Red Hair)', 'people', 'man_red_hair_3d'),
  toneAvatar('woman-red-3d', 'Woman (Red Hair)', 'people', 'woman_red_hair_3d'),
  toneAvatar('person-curly-3d', 'Person (Curly Hair)', 'people', 'person_curly_hair_3d'),
  toneAvatar('woman-curly-3d', 'Woman (Curly Hair)', 'people', 'woman_curly_hair_3d'),
  toneAvatar('man-bald-3d', 'Man (Bald)', 'people', 'man_bald_3d'),
  toneAvatar('woman-bald-3d', 'Woman (Bald)', 'people', 'woman_bald_3d'),
  toneAvatar('person-beard-3d', 'Person (Beard)', 'people', 'person_beard_3d'),
  toneAvatar('woman-beard-3d', 'Woman (Beard)', 'people', 'woman_beard_3d'),
  toneAvatar('person-white-3d', 'Person (White Hair)', 'people', 'person_white_hair_3d'),
  toneAvatar('woman-white-3d', 'Woman (White Hair)', 'people', 'woman_white_hair_3d'),
  toneAvatar('old-man-3d', 'Old Man', 'people', 'old_man_3d'),
  toneAvatar('old-woman-3d', 'Old Woman', 'people', 'old_woman_3d'),

  // ---- Animals (single image, no tone variants) ----
  // All priced the same flat rate (see AVATAR_CATEGORY_COST in shared/avatarCatalog.ts).
  // Still ordered cuter/tamer first, fiercest last, purely for browsing.
  staticAvatar('fox-3d', 'Fox', 'animals', 'fox_3d.png'),
  staticAvatar('raccoon-3d', 'Raccoon', 'animals', 'raccoon_3d.png'),
  staticAvatar('monkey-3d', 'Monkey', 'animals', 'monkey_face_3d.png'),
  staticAvatar('hear-no-evil-monkey-3d', 'Hear-No-Evil Monkey', 'animals', 'hear-no-evil_monkey_3d.png'),
  staticAvatar('koala-3d', 'Koala', 'animals', 'koala_3d.png'),
  staticAvatar('panda-3d', 'Panda', 'animals', 'panda_3d.png'),
  staticAvatar('rabbit-3d', 'Rabbit', 'animals', 'rabbit_face_3d.png'),
  staticAvatar('hamster-3d', 'Hamster', 'animals', 'hamster_3d.png'),
  staticAvatar('mouse-3d', 'Mouse', 'animals', 'mouse_face_3d.png'),
  staticAvatar('horse-3d', 'Horse', 'animals', 'horse_face_3d.png'),
  staticAvatar('cow-3d', 'Cow', 'animals', 'cow_face_3d.png'),
  staticAvatar('pig-3d', 'Pig', 'animals', 'pig_face_3d.png'),
  staticAvatar('dog-3d', 'Dog', 'animals', 'dog_face_3d.png'),
  staticAvatar('frog-3d', 'Frog', 'animals', 'frog_3d.png'),
  staticAvatar('penguin-3d', 'Penguin', 'animals', 'penguin_3d.png'),
  staticAvatar('whale-3d', 'Whale', 'animals', 'spouting_whale_3d.png'),
  staticAvatar('moose-3d', 'Moose', 'animals', 'moose_3d.png'),
  staticAvatar('bear-3d', 'Bear', 'animals', 'bear_3d.png'),
  staticAvatar('polar-bear-3d', 'Polar Bear', 'animals', 'polar_bear_3d.png'),
  staticAvatar('wolf-3d', 'Wolf', 'animals', 'wolf_3d.png'),
  staticAvatar('tiger-3d', 'Tiger', 'animals', 'tiger_face_3d.png'),
  staticAvatar('lion-3d', 'Lion', 'animals', 'lion_3d.png'),
  staticAvatar('shark-3d', 'Shark', 'animals', 'shark_3d.png'),
  staticAvatar('t-rex-3d', 'T-Rex', 'animals', 't-rex_3d.png'),

  // ---- Fantasy ----
  // Grouped thematically: winter (Claus pair + Snowman), Halloween/spooky (ghost, zombies,
  // pumpkin, poo), classic mythical creatures (unicorn, troll), sci-fi (robot, alien), and
  // finally a mysterious-objects pairing (eye, moai). Ghost and Zombie Man were swapped from
  // their original spots so Zombie Man lands next to Zombie Woman in the same grid row,
  // instead of one row apart from her.
  toneAvatar('mrs-claus-3d', 'Mrs Claus', 'fantasy', 'mrs_claus_3d'),
  toneAvatar('mx-claus-3d', 'Mx Claus', 'fantasy', 'mx_claus_3d'),
  staticAvatar('snowman-3d', 'Snowman', 'fantasy', 'snowman_without_snow_3d.png'),
  staticAvatar('ghost-3d', 'Ghost', 'fantasy', 'ghost_3d.png'),
  staticAvatar('woman-zombie-3d', 'Zombie Woman', 'fantasy', 'woman_zombie_3d.png'),
  staticAvatar('man-zombie-3d', 'Zombie Man', 'fantasy', 'man_zombie_3d.png'),
  staticAvatar('jack-o-lantern-3d', 'Jack-o-Lantern', 'fantasy', 'jack-o-lantern_3d.png'),
  staticAvatar('pile-of-poo-3d', 'Pile of Poo', 'fantasy', 'pile_of_poo_3d.png'),
  staticAvatar('troll-3d', 'Troll', 'fantasy', 'troll_3d.png'),

  // Added 2026-09-01, same Man/Woman(/Person) pairing convention as People above. Elf only
  // ships a Man and a Person variant (no Woman art provided); Genie is a single fixed image
  // per gender rather than 5 skin tones, like Snowman/Ghost/etc. above.
  toneAvatar('man-elf-3d', 'Man (Elf)', 'fantasy', 'man_elf_3d'),
  toneAvatar('person-elf-3d', 'Person (Elf)', 'fantasy', 'person_elf_3d'),
  toneAvatar('man-mage-3d', 'Man (Mage)', 'fantasy', 'man_mage_3d'),
  toneAvatar('woman-mage-3d', 'Woman (Mage)', 'fantasy', 'woman_mage_3d'),
  toneAvatar('man-superhero-3d', 'Man (Superhero)', 'fantasy', 'man_superhero_3d'),
  toneAvatar('woman-superhero-3d', 'Woman (Superhero)', 'fantasy', 'woman_superhero_3d'),
  toneAvatar('man-vampire-3d', 'Man (Vampire)', 'fantasy', 'man_vampire_3d'),
  toneAvatar('woman-vampire-3d', 'Woman (Vampire)', 'fantasy', 'woman_vampire_3d'),
  staticAvatar('man-genie-3d', 'Man (Genie)', 'fantasy', 'man_genie_3d.png'),
  staticAvatar('woman-genie-3d', 'Woman (Genie)', 'fantasy', 'woman_genie_3d.png'),

  // ---- Legendary (2026-09-01) ----
  // Split off from Fantasy's mythical/sci-fi/mysterious-objects avatars as the new top price
  // tier. The rest of Fantasy stays put for now -- more may move over later.
  staticAvatar('unicorn-3d', 'Unicorn', 'legendary', 'unicorn_3d.png'),
  staticAvatar('robot-3d', 'Robot', 'legendary', 'robot_3d.png'),
  staticAvatar('alien-3d', 'Alien', 'legendary', 'alien_3d.png'),
  staticAvatar('eye-3d', 'Eye', 'legendary', 'eye_3d.png'),
  staticAvatar('moai-3d', 'Moai', 'legendary', 'moai_3d.png'),

  // ---- Mystery ----
  // No avatars yet -- pending the reveal mechanic (browsable catalog vs. blind gacha draw) and
  // real art assets, see FaceUp.md's 2026-09-01 note.
];

// The id used for purchase/ownership tracking (server's user.ownedAvatars array).
export function avatarPurchaseId(entry: AvatarEntry): string {
  return entry.kind === 'tone' ? entry.baseId : entry.id;
}

// People are free; Animals and Fantasy cost gems (see shared/avatarCatalog.ts — the server
// re-derives this same cost from the purchase id rather than trusting the client). Ownership
// for a tone avatar is keyed by its baseId — buy it once, wear it in any of the 5 tones.
export function avatarCost(entry: AvatarEntry): number {
  return avatarCostFor(avatarPurchaseId(entry));
}

export function isAvatarFree(entry: AvatarEntry): boolean {
  return avatarCost(entry) === 0;
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
    if (entry) {
      const image = entry.images[tone] ?? entry.images.medium;
      return { id, name: entry.name, image, category: entry.category };
    }
  } else {
    const entry = AVATAR_CATALOG.find((a): a is StaticAvatar => a.kind === 'static' && a.id === id);
    if (entry) {
      return { id, name: entry.name, image: entry.image, category: entry.category };
    }
  }

  // Unknown id — most likely a leftover selection from before the avatar catalog was
  // replaced (2026-08-20). Falling back to the default here means every screen that shows
  // avatars (leaderboard, friends list, game seats, profile, ...) stays in sync automatically
  // instead of each one needing its own broken-image handling.
  return getDefaultAvatar();
}

export function getDefaultAvatar(): ResolvedAvatar {
  return getAvatarById(DEFAULT_AVATAR_ID)!;
}
