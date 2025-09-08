import faceWithTearsOfJoyImg from '@assets/face-with-tears-of-joy_1757337732854.png';
import smirkingFaceImg from '@assets/smirking-face_1757337738167.png';

export interface Avatar {
  id: string;
  name: string;
  image: string;
  category: 'happy' | 'smug' | 'cool' | 'angry' | 'neutral';
}

export const AVAILABLE_AVATARS: Avatar[] = [
  {
    id: 'face-with-tears-of-joy',
    name: 'Face avec larmes de joie',
    image: faceWithTearsOfJoyImg,
    category: 'happy'
  },
  {
    id: 'smirking-face', 
    name: 'Visage narquois',
    image: smirkingFaceImg,
    category: 'smug'
  }
];

export const DEFAULT_AVATAR_ID = 'face-with-tears-of-joy';

export const getAvatarById = (id: string): Avatar | undefined => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === id);
};

export const getDefaultAvatar = (): Avatar => {
  return AVAILABLE_AVATARS.find(avatar => avatar.id === DEFAULT_AVATAR_ID) || AVAILABLE_AVATARS[0];
};