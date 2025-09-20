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

// New 3D avatars - Priority order
import newBoyDefaultImg from '@assets/boy_3d_default_1758405553921.png';
import newBoyMediumLightImg from '@assets/boy_3d_medium-light_1758405553921.png';
import newBoyLightImg from '@assets/boy_3d_light_1758405553922.png';
import newBoyMediumImg from '@assets/boy_3d_medium_1758405553922.png';
import newBoyMediumDarkImg from '@assets/boy_3d_medium-dark_1758405553922.png';
import newBoyDarkImg from '@assets/boy_3d_dark_1758405553922.png';

// Old 3D avatars
import boyDefaultImg from '@assets/boy_3d_default_1758405170965.png';
import boyMediumLightImg from '@assets/boy_3d_medium-light_1758405170965.png';
import boyLightImg from '@assets/boy_3d_light_1758405170966.png';
import boyMediumImg from '@assets/boy_3d_medium_1758405170966.png';
import boyMediumDarkImg from '@assets/boy_3d_medium-dark_1758405170967.png';
import boyDarkImg from '@assets/boy_3d_dark_1758405170967.png';
import catWithTearsOfJoyImg from '@assets/cat-with-tears-of-joy_1758405170967.png';
import grinningCatWithSmilingEyesImg from '@assets/grinning-cat-with-smiling-eyes_1758405170967.png';
import ghost3dImg from '@assets/ghost_3d_1758405170967.png';
import tRex3dImg from '@assets/t-rex_3d_1758405170968.png';

// Additional avatars
import teddyBearImg from '@assets/teddy-bear_1758405267781.png';
import volleyballImg from '@assets/volleyball_1758405267782.png';
import nazarAmuletImg from '@assets/nazar-amulet_1758405267782.png';
import sparklesImg from '@assets/sparkles_1758405267782.png';
import framedPictureImg from '@assets/framed-picture_1758405267783.png';
import firstPlaceMedalImg from '@assets/1st-place-medal_1758405267783.png';
import secondPlaceMedalImg from '@assets/2nd-place-medal_1758405267783.png';
import thirdPlaceMedalImg from '@assets/3rd-place-medal_1758405267783.png';

// Sports and object avatars
import baseballImg from '@assets/baseball_1758405295736.png';
import lacrosseImg from '@assets/lacrosse_1758405295736.png';
import soccerBallImg from '@assets/soccer-ball_1758405295737.png';
import softballImg from '@assets/softball_1758405295737.png';
import crystalBallImg from '@assets/crystal-ball_1758405310592.png';
import divingMaskImg from '@assets/diving-mask_1758405310621.png';
import flagInHoleImg from '@assets/flag-in-hole_1758405310621.png';
import japaneseDollsImg from '@assets/japanese-dolls_1758405310621.png';
import magicWandImg from '@assets/magic-wand_1758405310621.png';
import martialArtsUniformImg from '@assets/martial-arts-uniform_1758405310621.png';

export interface Avatar {
  id: string;
  name: string;
  image: string;
  category: 'happy' | 'smug' | 'cool' | 'angry' | 'neutral' | 'objects' | '3d' | 'animals';
}

export const AVAILABLE_AVATARS: Avatar[] = [
  // Priority 3D avatars - new versions
  {
    id: 'new-boy-3d-default',
    name: 'Boy 3D Default (New)',
    image: newBoyDefaultImg,
    category: '3d'
  },
  {
    id: 'new-boy-3d-medium-light',
    name: 'Boy 3D Medium Light (New)',
    image: newBoyMediumLightImg,
    category: '3d'
  },
  {
    id: 'new-boy-3d-light',
    name: 'Boy 3D Light (New)',
    image: newBoyLightImg,
    category: '3d'
  },
  {
    id: 'new-boy-3d-medium',
    name: 'Boy 3D Medium (New)',
    image: newBoyMediumImg,
    category: '3d'
  },
  {
    id: 'new-boy-3d-medium-dark',
    name: 'Boy 3D Medium Dark (New)',
    image: newBoyMediumDarkImg,
    category: '3d'
  },
  {
    id: 'new-boy-3d-dark',
    name: 'Boy 3D Dark (New)',
    image: newBoyDarkImg,
    category: '3d'
  },
  
  // Original avatars
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
  // New 3D and character avatars
  {
    id: 'boy-3d-default',
    name: 'Boy 3D Default',
    image: boyDefaultImg,
    category: '3d'
  },
  {
    id: 'boy-3d-light',
    name: 'Boy 3D Light',
    image: boyLightImg,
    category: '3d'
  },
  {
    id: 'boy-3d-medium-light',
    name: 'Boy 3D Medium Light',
    image: boyMediumLightImg,
    category: '3d'
  },
  {
    id: 'boy-3d-medium',
    name: 'Boy 3D Medium',
    image: boyMediumImg,
    category: '3d'
  },
  {
    id: 'boy-3d-medium-dark',
    name: 'Boy 3D Medium Dark',
    image: boyMediumDarkImg,
    category: '3d'
  },
  {
    id: 'boy-3d-dark',
    name: 'Boy 3D Dark',
    image: boyDarkImg,
    category: '3d'
  },
  {
    id: 'cat-with-tears-of-joy-3d',
    name: 'Cat with Tears of Joy',
    image: catWithTearsOfJoyImg,
    category: 'animals'
  },
  {
    id: 'grinning-cat-with-smiling-eyes-3d',
    name: 'Grinning Cat with Smiling Eyes',
    image: grinningCatWithSmilingEyesImg,
    category: 'animals'
  },
  {
    id: 'ghost-3d',
    name: 'Ghost 3D',
    image: ghost3dImg,
    category: 'objects'
  },
  {
    id: 't-rex-3d',
    name: 'T-Rex 3D',
    image: tRex3dImg,
    category: 'animals'
  },
  // Additional avatars
  {
    id: 'teddy-bear',
    name: 'Teddy Bear',
    image: teddyBearImg,
    category: 'animals'
  },
  {
    id: 'volleyball',
    name: 'Volleyball',
    image: volleyballImg,
    category: 'objects'
  },
  {
    id: 'nazar-amulet',
    name: 'Nazar Amulet',
    image: nazarAmuletImg,
    category: 'objects'
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    image: sparklesImg,
    category: 'objects'
  },
  {
    id: 'framed-picture',
    name: 'Framed Picture',
    image: framedPictureImg,
    category: 'objects'
  },
  {
    id: '1st-place-medal',
    name: '1st Place Medal',
    image: firstPlaceMedalImg,
    category: 'objects'
  },
  {
    id: '2nd-place-medal',
    name: '2nd Place Medal',
    image: secondPlaceMedalImg,
    category: 'objects'
  },
  {
    id: '3rd-place-medal',
    name: '3rd Place Medal',
    image: thirdPlaceMedalImg,
    category: 'objects'
  },
  // Sports equipment avatars
  {
    id: 'baseball',
    name: 'Baseball',
    image: baseballImg,
    category: 'objects'
  },
  {
    id: 'lacrosse',
    name: 'Lacrosse',
    image: lacrosseImg,
    category: 'objects'
  },
  {
    id: 'soccer-ball',
    name: 'Soccer Ball',
    image: soccerBallImg,
    category: 'objects'
  },
  {
    id: 'softball',
    name: 'Softball',
    image: softballImg,
    category: 'objects'
  },
  {
    id: 'crystal-ball',
    name: 'Crystal Ball',
    image: crystalBallImg,
    category: 'objects'
  },
  {
    id: 'diving-mask',
    name: 'Diving Mask',
    image: divingMaskImg,
    category: 'objects'
  },
  {
    id: 'flag-in-hole',
    name: 'Golf Flag',
    image: flagInHoleImg,
    category: 'objects'
  },
  {
    id: 'japanese-dolls',
    name: 'Japanese Dolls',
    image: japaneseDollsImg,
    category: 'objects'
  },
  {
    id: 'magic-wand',
    name: 'Magic Wand',
    image: magicWandImg,
    category: 'objects'
  },
  {
    id: 'martial-arts-uniform',
    name: 'Martial Arts Uniform',
    image: martialArtsUniformImg,
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