// New 3D avatars - boys with different skin tones
import boy3dDefaultImg from '@assets/boy_3d_default_1758414929373.png';
import boy3dMediumLightImg from '@assets/boy_3d_medium-light_1758414929373.png';
import boy3dLightImg from '@assets/boy_3d_light_1758414929374.png';
import boy3dMediumImg from '@assets/boy_3d_medium_1758414929374.png';
import boy3dMediumDarkImg from '@assets/boy_3d_medium-dark_1758414929374.png';
import boy3dDarkImg from '@assets/boy_3d_dark_1758414929374.png';

// New 3D avatars - girls with different skin tones
import girl3dDefaultImg from '@assets/girl_3d_default_1758415039190.png';
import girl3dMediumLightImg from '@assets/girl_3d_medium-light_1758415039209.png';
import girl3dLightImg from '@assets/girl_3d_light (1)_1758415039210.png';
import girl3dMediumImg from '@assets/girl_3d_medium_1758415039210.png';
import girl3dMediumDarkImg from '@assets/girl_3d_medium-dark_1758415039210.png';
import girl3dDarkImg from '@assets/girl_3d_dark_1758415039210.png';

// New 3D avatars - old men with different skin tones
import oldMan3dDefaultImg from '@assets/old_man_3d_default_1758415124386.png';
import oldMan3dLightImg from '@assets/old_man_3d_light_1758415124416.png';
import oldMan3dMediumImg from '@assets/old_man_3d_medium_1758415124416.png';
import oldMan3dMediumDarkImg from '@assets/old_man_3d_medium-dark_1758415124416.png';
import oldMan3dDarkImg from '@assets/old_man_3d_dark_1758415124416.png';

// New 3D avatars - old women with different skin tones
import oldWoman3dDefaultImg from '@assets/old_woman_3d_default_1758415143144.png';
import oldWoman3dLightImg from '@assets/old_woman_3d_light_1758415143144.png';
import oldWoman3dMediumImg from '@assets/old_woman_3d_medium_1758415143145.png';
import oldWoman3dMediumDarkImg from '@assets/old_woman_3d_medium-dark_1758415143145.png';
import oldWoman3dDarkImg from '@assets/old_woman_3d_dark_1758415143145.png';

import faceWithTearsOfJoyImg from '@assets/face-with-tears-of-joy_1757337732854.png';
import smirkingFaceImg from '@assets/smirking-face_1757337738167.png';
import expressionlessFaceImg from '@assets/expressionless-face_1757371562792.png';
import faceInCloudsImg from '@assets/face-in-clouds_1757371562801.png';
import smilingFaceWithSmilingEyesImg from '@assets/smiling-face-with-smiling-eyes_1757371562802.png';
import smilingFaceWithSunglassesImg from '@assets/smiling-face-with-sunglasses_1757371562802.png';
import smilingFaceWithHeartEyesImg from '@assets/smiling-face-with-heart-eyes_1757371562802.png';
import kissingFaceWithSmilingEyesImg from '@assets/kissing-face-with-smiling-eyes_1757372177946.png';
import relievedFaceImg from '@assets/relieved-face_1757372177954.png';
import newSmirkingFaceImg from '@assets/smirking-face_1757372177954.png';
import faceSavouringFoodImg from '@assets/face-savouring-food_1757372177954.png';
import newFaceWithTearsOfJoyImg from '@assets/face-with-tears-of-joy_1757372177955.png';
import happyFaceImg from '@assets/happy-face_1757372177955.png';
import wearyFaceImg from '@assets/weary-face_1757372177955.png';
import winkingFaceWithTongueImg from '@assets/winking-face-with-tongue_1757372177955.png';
import sleepyFaceImg from '@assets/sleepy-face_1757372177956.png';
import faceWithTongueImg from '@assets/face-with-tongue_1757372177956.png';
import disappointedFaceImg from '@assets/disappointed-face_1757372231237.png';
import tiredFaceImg from '@assets/tired-face_1757372231250.png';
import squintingFaceWithTongueImg from '@assets/squinting-face-with-tongue_1757372231251.png';
import faceScreamingInFearImg from '@assets/face-screaming-in-fear_1757372231253.png';
import anxiousFaceWithSweatImg from '@assets/anxious-face-with-sweat_1757372231253.png';
import faceBlowingAKissImg from '@assets/face-blowing-a-kiss_1757372231253.png';
import neutralFaceImg from '@assets/neutral-face_1757449086313.png';
import grinningFaceWithSmilingEyesImg from '@assets/grinning-face-with-smiling-eyes_1757449086319.png';
import grinningFaceWithSweatImg from '@assets/grinning-face-with-sweat_1757449086319.png';
import grinningSquintingFaceImg from '@assets/grinning-squinting-face_1757449086320.png';
import hushedFaceImg from '@assets/hushed-face_1757449086320.png';
import perseveringFaceImg from '@assets/persevering-face_1757449086321.png';
import smilingFaceWithHaloImg from '@assets/smiling-face-with-halo_1757449086321.png';
import poutingFaceImg from '@assets/pouting-face_1757449086321.png';
import astonishedFaceImg from '@assets/astonished-face_1757449086322.png';
import winkingFaceImg from '@assets/winking-face_1757449086322.png';

// Nouveaux avatars - objets (utilisation d'URLs directes)
// Note: Utilisation de chemins directs pour éviter les problèmes d'import

export interface Avatar {
  id: string;
  name: string;
  image: string;
  category: 'happy' | 'smug' | 'cool' | 'angry' | 'neutral' | 'objects' | '3d';
}

export const AVAILABLE_AVATARS: Avatar[] = [
  // 3D Avatars - Different skin tones
  {
    id: 'boy-3d-default',
    name: '3D Boy - Default',
    image: boy3dDefaultImg,
    category: '3d'
  },
  {
    id: 'boy-3d-medium-light',
    name: '3D Boy - Medium Light',
    image: boy3dMediumLightImg,
    category: '3d'
  },
  {
    id: 'boy-3d-light',
    name: '3D Boy - Light',
    image: boy3dLightImg,
    category: '3d'
  },
  {
    id: 'boy-3d-medium',
    name: '3D Boy - Medium',
    image: boy3dMediumImg,
    category: '3d'
  },
  {
    id: 'boy-3d-medium-dark',
    name: '3D Boy - Medium Dark',
    image: boy3dMediumDarkImg,
    category: '3d'
  },
  {
    id: 'boy-3d-dark',
    name: '3D Boy - Dark',
    image: boy3dDarkImg,
    category: '3d'
  },
  
  // 3D Avatars - Girls with different skin tones
  {
    id: 'girl-3d-default',
    name: '3D Girl - Default',
    image: girl3dDefaultImg,
    category: '3d'
  },
  {
    id: 'girl-3d-medium-light',
    name: '3D Girl - Medium Light',
    image: girl3dMediumLightImg,
    category: '3d'
  },
  {
    id: 'girl-3d-light',
    name: '3D Girl - Light',
    image: girl3dLightImg,
    category: '3d'
  },
  {
    id: 'girl-3d-medium',
    name: '3D Girl - Medium',
    image: girl3dMediumImg,
    category: '3d'
  },
  {
    id: 'girl-3d-medium-dark',
    name: '3D Girl - Medium Dark',
    image: girl3dMediumDarkImg,
    category: '3d'
  },
  {
    id: 'girl-3d-dark',
    name: '3D Girl - Dark',
    image: girl3dDarkImg,
    category: '3d'
  },
  
  // 3D Avatars - Old men with different skin tones
  {
    id: 'old-man-3d-default',
    name: '3D Old Man - Default',
    image: oldMan3dDefaultImg,
    category: '3d'
  },
  {
    id: 'old-man-3d-light',
    name: '3D Old Man - Light',
    image: oldMan3dLightImg,
    category: '3d'
  },
  {
    id: 'old-man-3d-medium',
    name: '3D Old Man - Medium',
    image: oldMan3dMediumImg,
    category: '3d'
  },
  {
    id: 'old-man-3d-medium-dark',
    name: '3D Old Man - Medium Dark',
    image: oldMan3dMediumDarkImg,
    category: '3d'
  },
  {
    id: 'old-man-3d-dark',
    name: '3D Old Man - Dark',
    image: oldMan3dDarkImg,
    category: '3d'
  },
  
  // 3D Avatars - Old women with different skin tones
  {
    id: 'old-woman-3d-default',
    name: '3D Old Woman - Default',
    image: oldWoman3dDefaultImg,
    category: '3d'
  },
  {
    id: 'old-woman-3d-light',
    name: '3D Old Woman - Light',
    image: oldWoman3dLightImg,
    category: '3d'
  },
  {
    id: 'old-woman-3d-medium',
    name: '3D Old Woman - Medium',
    image: oldWoman3dMediumImg,
    category: '3d'
  },
  {
    id: 'old-woman-3d-medium-dark',
    name: '3D Old Woman - Medium Dark',
    image: oldWoman3dMediumDarkImg,
    category: '3d'
  },
  {
    id: 'old-woman-3d-dark',
    name: '3D Old Woman - Dark',
    image: oldWoman3dDarkImg,
    category: '3d'
  },
  
  // Original Avatars
  {
    id: 'face-with-tears-of-joy',
    name: 'Face with tears of joy',
    image: faceWithTearsOfJoyImg,
    category: 'happy'
  },
  {
    id: 'smirking-face', 
    name: 'Smirking face',
    image: smirkingFaceImg,
    category: 'smug'
  },
  {
    id: 'smiling-face-with-smiling-eyes',
    name: 'Smiling face with smiling eyes',
    image: smilingFaceWithSmilingEyesImg,
    category: 'happy'
  },
  {
    id: 'smiling-face-with-heart-eyes',
    name: 'Smiling face with heart eyes',
    image: smilingFaceWithHeartEyesImg,
    category: 'happy'
  },
  {
    id: 'smiling-face-with-sunglasses',
    name: 'Smiling face with sunglasses',
    image: smilingFaceWithSunglassesImg,
    category: 'cool'
  },
  {
    id: 'expressionless-face',
    name: 'Expressionless face',
    image: expressionlessFaceImg,
    category: 'neutral'
  },
  {
    id: 'face-in-clouds',
    name: 'Face in clouds',
    image: faceInCloudsImg,
    category: 'neutral'
  },
  {
    id: 'kissing-face-with-smiling-eyes',
    name: 'Kissing face with smiling eyes',
    image: kissingFaceWithSmilingEyesImg,
    category: 'happy'
  },
  {
    id: 'relieved-face',
    name: 'Relieved face',
    image: relievedFaceImg,
    category: 'neutral'
  },
  {
    id: 'new-smirking-face',
    name: 'Smirking face (new)',
    image: newSmirkingFaceImg,
    category: 'smug'
  },
  {
    id: 'face-savouring-food',
    name: 'Face savoring food',
    image: faceSavouringFoodImg,
    category: 'happy'
  },
  {
    id: 'new-face-with-tears-of-joy',
    name: 'Face with tears of joy (new)',
    image: newFaceWithTearsOfJoyImg,
    category: 'happy'
  },
  {
    id: 'happy-face',
    name: 'Happy face',
    image: happyFaceImg,
    category: 'happy'
  },
  {
    id: 'weary-face',
    name: 'Weary face',
    image: wearyFaceImg,
    category: 'neutral'
  },
  {
    id: 'winking-face-with-tongue',
    name: 'Winking face with tongue',
    image: winkingFaceWithTongueImg,
    category: 'happy'
  },
  {
    id: 'sleepy-face',
    name: 'Sleepy face',
    image: sleepyFaceImg,
    category: 'neutral'
  },
  {
    id: 'face-with-tongue',
    name: 'Face with tongue out',
    image: faceWithTongueImg,
    category: 'happy'
  },
  {
    id: 'disappointed-face',
    name: 'Disappointed face',
    image: disappointedFaceImg,
    category: 'neutral'
  },
  {
    id: 'tired-face',
    name: 'Tired face',
    image: tiredFaceImg,
    category: 'neutral'
  },
  {
    id: 'squinting-face-with-tongue',
    name: 'Squinting face with tongue',
    image: squintingFaceWithTongueImg,
    category: 'happy'
  },
  {
    id: 'face-screaming-in-fear',
    name: 'Face screaming in fear',
    image: faceScreamingInFearImg,
    category: 'angry'
  },
  {
    id: 'anxious-face-with-sweat',
    name: 'Anxious face with sweat',
    image: anxiousFaceWithSweatImg,
    category: 'neutral'
  },
  {
    id: 'face-blowing-a-kiss',
    name: 'Face blowing a kiss',
    image: faceBlowingAKissImg,
    category: 'happy'
  },
  {
    id: 'neutral-face',
    name: 'Neutral face',
    image: neutralFaceImg,
    category: 'neutral'
  },
  {
    id: 'grinning-face-with-smiling-eyes',
    name: 'Grinning face with smiling eyes',
    image: grinningFaceWithSmilingEyesImg,
    category: 'happy'
  },
  {
    id: 'grinning-face-with-sweat',
    name: 'Grinning face with sweat',
    image: grinningFaceWithSweatImg,
    category: 'happy'
  },
  {
    id: 'grinning-squinting-face',
    name: 'Grinning squinting face',
    image: grinningSquintingFaceImg,
    category: 'happy'
  },
  {
    id: 'hushed-face',
    name: 'Hushed face',
    image: hushedFaceImg,
    category: 'neutral'
  },
  {
    id: 'persevering-face',
    name: 'Persevering face',
    image: perseveringFaceImg,
    category: 'angry'
  },
  {
    id: 'smiling-face-with-halo',
    name: 'Smiling face with halo',
    image: smilingFaceWithHaloImg,
    category: 'happy'
  },
  {
    id: 'pouting-face',
    name: 'Pouting face',
    image: poutingFaceImg,
    category: 'angry'
  },
  {
    id: 'astonished-face',
    name: 'Astonished face',
    image: astonishedFaceImg,
    category: 'neutral'
  },
  {
    id: 'winking-face',
    name: 'Winking face',
    image: winkingFaceImg,
    category: 'happy'
  },
  {
    id: 'pinata',
    name: 'Piñata',
    image: '/src/assets/pinata_1758142051442.png',
    category: 'objects'
  },
  {
    id: 'large-orange-diamond',
    name: 'Orange Diamond',
    image: '/src/assets/large-orange-diamond_1758142051446.png',
    category: 'objects'
  },
  {
    id: 'christmas-tree',
    name: 'Christmas Tree',
    image: '/src/assets/christmas-tree_1758142051447.png',
    category: 'objects'
  },
  {
    id: 'halloween-pumpkin',
    name: 'Halloween Pumpkin',
    image: '/src/assets/halloween_1758142051447.png',
    category: 'objects'
  },
  {
    id: 'ribbon',
    name: 'Ribbon',
    image: '/src/assets/ribbon_1758142051448.png',
    category: 'objects'
  },
  {
    id: 'chess-pawn',
    name: 'Chess Pawn',
    image: '/src/assets/chess-pawn_1758142051448.png',
    category: 'objects'
  },
  {
    id: 'ice-skate',
    name: 'Ice Skate',
    image: '/src/assets/ice-skate_1758142051448.png',
    category: 'objects'
  },
  {
    id: 'grinning-cat-with-smiling-eyes',
    name: 'Chat souriant',
    image: '@assets/grinning-cat-with-smiling-eyes_1758416155364.png',
    category: 'objects'
  },
  {
    id: 'cat-with-tears-of-joy',
    name: 'Chat de joie',
    image: '@assets/cat-with-tears-of-joy_1758416155392.png',
    category: 'objects'
  },
  {
    id: '1st-place-medal',
    name: 'Médaille d\'or',
    image: '@assets/1st-place-medal_1758416155392.png',
    category: 'objects'
  },
  {
    id: '2nd-place-medal',
    name: 'Médaille d\'argent',
    image: '@assets/2nd-place-medal_1758416155392.png',
    category: 'objects'
  },
  {
    id: '3rd-place-medal',
    name: 'Médaille de bronze',
    image: '@assets/3rd-place-medal_1758416155392.png',
    category: 'objects'
  },
  {
    id: 'ghost-3d',
    name: 'Fantôme 3D',
    image: '@assets/ghost_3d_1758416155392.png',
    category: 'objects'
  },
  {
    id: 't-rex-3d',
    name: 'T-Rex 3D',
    image: '@assets/t-rex_3d_1758416155392.png',
    category: 'objects'
  },
  {
    id: 'teddy-bear',
    name: 'Ours en peluche',
    image: '@assets/teddy-bear_1758416155392.png',
    category: 'objects'
  },
  {
    id: 'sparkles',
    name: 'Étoiles brillantes',
    image: '@assets/sparkles_1758416155392.png',
    category: 'objects'
  },
  {
    id: 'nazar-amulet',
    name: 'Œil porte-bonheur',
    image: '@assets/nazar-amulet_1758416155393.png',
    category: 'objects'
  }
];

export const DEFAULT_AVATAR_ID = 'face-with-tears-of-joy';

export const getAvatarById = (id: string): Avatar | undefined => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === id);
};

export const getDefaultAvatar = (): Avatar => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === DEFAULT_AVATAR_ID) || AVAILABLE_AVATARS[0];
};