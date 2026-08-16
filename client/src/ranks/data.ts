// Rank system data with 3D icons. Thresholds/names/gem rewards come from
// shared/ranks.ts (the server validates claims against that same table), so this
// file only layers presentation-only fields (images, colors) on top.
import pigImage from '@assets/Microsoft-Fluentui-Emoji-3d-Pig-3d.1024_1759072300185.png';
import cowImage from '@assets/Microsoft-Fluentui-Emoji-3d-Cow-3d.1024_1759072637615.png';
import fishImage from '@assets/Microsoft-Fluentui-Emoji-3d-Fish-3d.1024_1759072693789.png';
import foxImage from '@assets/Fox-3d-icon_1759072776827.png';
import eagleImage from '@assets/Microsoft-Fluentui-Emoji-3d-Eagle-3d.1024_1759072900176.png';
import tigerImage from '@assets/tiger-face_1f42f_1759072969470.png';
import camelImage from '@assets/camel-3d-icon-png-download-6648586_1759073003230.webp';
import whaleImage from '@assets/image_1759073035849.png';
import trexImage from '@assets/Microsoft-Fluentui-Emoji-3d-T-Rex-3d.1024_1759073090652.png';
import { RANKS as RANK_DEFINITIONS } from '@shared/ranks';

export type Rank = {
  key: string;
  name: string;
  min: number;
  max: number; // Infinity pour le dernier
  emoji?: string;   // Fallback emoji
  imgSrc?: string;  // 3D image path
  progressColor: string; // Couleur de la barre de progression
  gemReward?: number; // Gems reward when reaching this rank
};

const PRESENTATION: Record<string, { imgSrc: string; progressColor: string }> = {
  pig: { imgSrc: pigImage, progressColor: '#ec4899' }, // Rose
  cow: { imgSrc: cowImage, progressColor: '#6b7280' }, // Gris
  fish: { imgSrc: fishImage, progressColor: '#007FFF' }, // Bleu électrique
  fox: { imgSrc: foxImage, progressColor: '#f97316' }, // Orange
  eagle: { imgSrc: eagleImage, progressColor: '#a3734a' }, // Marron
  tiger: { imgSrc: tigerImage, progressColor: 'linear-gradient(to right, #dc2626, #ea580c)' }, // Rouge -> orange
  camel: { imgSrc: camelImage, progressColor: '#d4af7a' }, // Beige
  whale: { imgSrc: whaleImage, progressColor: '#60a5fa' }, // Bleu clair
  trex: { imgSrc: trexImage, progressColor: '#22c55e' }, // Vert
};

export const RANKS: Rank[] = RANK_DEFINITIONS.map((rank) => ({
  ...rank,
  ...PRESENTATION[rank.key],
}));