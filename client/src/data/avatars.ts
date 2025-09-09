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

export interface Avatar {
  id: string;
  name: string;
  image: string;
  category: 'happy' | 'smug' | 'cool' | 'angry' | 'neutral';
}

export const AVAILABLE_AVATARS: Avatar[] = [
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
  }
];

export const DEFAULT_AVATAR_ID = 'face-with-tears-of-joy';

export const getAvatarById = (id: string): Avatar | undefined => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === id);
};

export const getDefaultAvatar = (): Avatar => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === DEFAULT_AVATAR_ID) || AVAILABLE_AVATARS[0];
};