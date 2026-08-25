// Emote catalog (2026-08-25): animated 3D emojis (APNG, render natively in any <img>) from
// attached_assets/emotes3d/. No unlock/cost system yet — every emote here is available to
// everyone. Where emotes actually get used (profile only vs sendable in-game) is still an open
// question from Anatole; this just powers the browsing grid.

export interface EmoteEntry {
  id: string;
  name: string;
  image: string;
}

const images = import.meta.glob('../../../attached_assets/emotes3d/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

function imageFor(filename: string): string {
  const entry = Object.entries(images).find(([path]) => path.endsWith(`/${filename}`));
  if (!entry) {
    throw new Error(`Missing emote asset: ${filename}`);
  }
  return entry[1];
}

export const EMOTE_CATALOG: EmoteEntry[] = [
  // ---- Hands & arms — no face drawn at all, just the gesture ----
  { id: 'waving-hand', name: 'Waving Hand', image: imageFor('waving_hand_animated_default.png') },
  { id: 'crossed-fingers', name: 'Crossed Fingers', image: imageFor('crossed_fingers_animated_default.png') },
  { id: 'clapping-hands', name: 'Clapping Hands', image: imageFor('clapping_hands_animated_default.png') },
  { id: 'flexed-biceps', name: 'Flexed Biceps', image: imageFor('flexed_biceps_animated_default.png') },
  { id: 'hand-index-thumb-crossed', name: 'Crossed Fingers Hand', image: imageFor('hand_with_index_finger_and_thumb_crossed_animated_default.png') },
  { id: 'vulcan-salute', name: 'Vulcan Salute', image: imageFor('vulcan_salute_animated_default.png') },
  { id: 'index-pointing-at-viewer', name: 'Pointing At You', image: imageFor('index_pointing_at_the_viewer_animated_default.png') },
  { id: 'middle-finger', name: 'Middle Finger', image: imageFor('middle_finger_animated_default.png') },
  { id: 'thumbs-up', name: 'Thumbs Up', image: imageFor('thumbs_up_animated_default.png') },
  { id: 'pinched-fingers', name: 'Pinched Fingers', image: imageFor('pinched_fingers_animated_default.png') },

  // ---- Faces — a face is the main subject, even where a hand appears alongside it
  // (facepalm, hand-over-mouth), matching how Unicode itself groups those as
  // Smileys & Emotion / People & Body's face-* subgroups rather than as hand gestures ----
  { id: 'person-facepalming', name: 'Facepalm', image: imageFor('person_facepalming_animated_default.png') },
  { id: 'woman-facepalming', name: 'Facepalm (Woman)', image: imageFor('woman_facepalming_animated_default.png') },
  { id: 'face-tears-of-joy', name: 'Tears of Joy', image: imageFor('face_with_tears_of_joy_animated.png') },
  { id: 'face-hand-over-mouth', name: 'Hand Over Mouth', image: imageFor('face_with_open_eyes_and_hand_over_mouth_animated.png') },
  { id: 'zany-face', name: 'Zany Face', image: imageFor('zany_face_animated.png') },
  { id: 'money-mouth-face', name: 'Money Mouth', image: imageFor('money-mouth_face_animated.png') },
  { id: 'exploding-head', name: 'Exploding Head', image: imageFor('exploding_head_animated.png') },
  { id: 'partying-face', name: 'Partying Face', image: imageFor('partying_face_animated.png') },
  { id: 'disguised-face', name: 'Disguised Face', image: imageFor('disguised_face_animated.png') },
  { id: 'sleeping-face', name: 'Sleeping Face', image: imageFor('sleeping_face_animated.png') },
  { id: 'pile-of-poo', name: 'Pile of Poo', image: imageFor('pile_of_poo_animated.png') },
  { id: 'smiling-face-sunglasses', name: 'Smiling Face with Sunglasses', image: imageFor('smiling_face_with_sunglasses_animated.png') },
  { id: 'face-steam-from-nose', name: 'Face with Steam From Nose', image: imageFor('face_with_steam_from_nose_animated.png') },
  { id: 'face-blowing-a-kiss', name: 'Face Blowing a Kiss', image: imageFor('face_blowing_a_kiss_animated.png') },
];
