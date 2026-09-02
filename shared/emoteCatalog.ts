// Emote catalog data (id + name + source filename), importable from both client and server.
// Kept separate from client/src/data/emotes.ts (which resolves the actual image via a
// Vite-only import.meta.glob over attached_assets/emotes3d/) the same way avatarCatalog.ts is
// kept separate from client/src/data/avatars.ts -- this plain list is the single source of
// truth for ids/names, so the server can pick an unowned emote as a chest reward without
// pulling in any Vite-specific machinery.

export interface EmoteCatalogEntry {
  id: string;
  name: string;
  file: string; // filename under attached_assets/emotes3d/, resolved to an actual image client-side
}

export const EMOTE_CATALOG: EmoteCatalogEntry[] = [
  // ---- Hands & arms ----
  { id: 'waving-hand', name: 'Waving Hand', file: 'waving_hand_animated_default.png' },
  { id: 'crossed-fingers', name: 'Crossed Fingers', file: 'crossed_fingers_animated_default.png' },
  { id: 'clapping-hands', name: 'Clapping Hands', file: 'clapping_hands_animated_default.png' },
  { id: 'flexed-biceps', name: 'Flexed Biceps', file: 'flexed_biceps_animated_default.png' },
  { id: 'hand-index-thumb-crossed', name: 'Crossed Fingers Hand', file: 'hand_with_index_finger_and_thumb_crossed_animated_default.png' },
  { id: 'vulcan-salute', name: 'Vulcan Salute', file: 'vulcan_salute_animated_default.png' },
  { id: 'index-pointing-at-viewer', name: 'Pointing At You', file: 'index_pointing_at_the_viewer_animated_default.png' },
  { id: 'middle-finger', name: 'Middle Finger', file: 'middle_finger_animated_default.png' },
  { id: 'thumbs-up', name: 'Thumbs Up', file: 'thumbs_up_animated_default.png' },
  { id: 'pinched-fingers', name: 'Pinched Fingers', file: 'pinched_fingers_animated_default.png' },

  // ---- Faces ----
  { id: 'person-facepalming', name: 'Facepalm', file: 'person_facepalming_animated_default.png' },
  { id: 'woman-facepalming', name: 'Facepalm (Woman)', file: 'woman_facepalming_animated_default.png' },
  { id: 'face-tears-of-joy', name: 'Tears of Joy', file: 'face_with_tears_of_joy_animated.png' },
  { id: 'face-hand-over-mouth', name: 'Hand Over Mouth', file: 'face_with_open_eyes_and_hand_over_mouth_animated.png' },
  { id: 'zany-face', name: 'Zany Face', file: 'zany_face_animated.png' },
  { id: 'money-mouth-face', name: 'Money Mouth', file: 'money-mouth_face_animated.png' },
  { id: 'exploding-head', name: 'Exploding Head', file: 'exploding_head_animated.png' },
  { id: 'partying-face', name: 'Partying Face', file: 'partying_face_animated.png' },
  { id: 'disguised-face', name: 'Disguised Face', file: 'disguised_face_animated.png' },
  { id: 'nerd-face', name: 'Nerd Face', file: 'nerd_face_animated.png' },
  { id: 'sleeping-face', name: 'Sleeping Face', file: 'sleeping_face_animated.png' },
  { id: 'smiling-face-sunglasses', name: 'Smiling Face with Sunglasses', file: 'smiling_face_with_sunglasses_animated.png' },
  { id: 'face-steam-from-nose', name: 'Face with Steam From Nose', file: 'face_with_steam_from_nose_animated.png' },
  { id: 'face-blowing-a-kiss', name: 'Face Blowing a Kiss', file: 'face_blowing_a_kiss_animated.png' },
  { id: 'pile-of-poo', name: 'Pile of Poo', file: 'pile_of_poo_animated.png' },
  { id: 'ogre', name: 'Ogre', file: 'ogre_animated.png' },
];

export const EMOTE_IDS: string[] = EMOTE_CATALOG.map((e) => e.id);

export function emoteNameFor(id: string): string | undefined {
  return EMOTE_CATALOG.find((e) => e.id === id)?.name;
}
