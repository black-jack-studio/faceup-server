// Rank system data with 3D icons
import pigImage from '@assets/Microsoft-Fluentui-Emoji-3d-Pig-3d.1024_1759072300185.png';
import cowImage from '@assets/Microsoft-Fluentui-Emoji-3d-Cow-3d.1024_1759072637615.png';
import fishImage from '@assets/Microsoft-Fluentui-Emoji-3d-Fish-3d.1024_1759072693789.png';
import foxImage from '@assets/Fox-3d-icon_1759072776827.png';
import eagleImage from '@assets/Microsoft-Fluentui-Emoji-3d-Eagle-3d.1024_1759072900176.png';
import tigerImage from '@assets/tiger-face_1f42f_1759072969470.png';
import camelImage from '@assets/camel-3d-icon-png-download-6648586_1759073003230.webp';
import whaleImage from '@assets/image_1759073035849.png';
import trexImage from '@assets/Microsoft-Fluentui-Emoji-3d-T-Rex-3d.1024_1759073090652.png';

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

export const RANKS: Rank[] = [
  { 
    key: 'pig',   
    name: 'Oinkster',       
    min: 0, 
    max: 10,   
    imgSrc: pigImage,
    progressColor: '#ec4899' // Rose
  },
  { 
    key: 'cow',   
    name: 'Moo Rookie',     
    min: 11, 
    max: 25,  
    imgSrc: cowImage,
    progressColor: '#6b7280', // Gris
    gemReward: 5
  },
  { 
    key: 'fish',  
    name: 'Splashy',        
    min: 26, 
    max: 50,  
    imgSrc: fishImage,
    progressColor: '#007FFF', // Bleu électrique
    gemReward: 10
  },
  { 
    key: 'fox',   
    name: 'Trickster',      
    min: 51, 
    max: 75,  
    imgSrc: foxImage,
    progressColor: '#f97316', // Orange
    gemReward: 20
  },
  { 
    key: 'eagle', 
    name: 'Sky Master',     
    min: 76, 
    max: 100,  
    imgSrc: eagleImage,
    progressColor: '#a3734a', // Marron
    gemReward: 50
  },
  { 
    key: 'tiger', 
    name: 'Stripe King',    
    min: 101, 
    max: 150, 
    imgSrc: tigerImage,
    progressColor: 'linear-gradient(to right, #dc2626, #ea580c)', // Rouge qui déteint très légèrement sur orange
    gemReward: 100
  },
  { 
    key: 'camel', 
    name: 'Chip Carrier',   
    min: 151, 
    max: 200, 
    imgSrc: camelImage,
    progressColor: '#d4af7a', // Beige
    gemReward: 150
  },
  { 
    key: 'whale', 
    name: 'High Roller',    
    min: 201, 
    max: 300, 
    imgSrc: whaleImage,
    progressColor: '#60a5fa', // Bleu clair
    gemReward: 200
  },
  { 
    key: 'trex',  
    name: 'Table Predator', 
    min: 301, 
    max: Infinity, 
    imgSrc: trexImage,
    progressColor: '#22c55e', // Vert
    gemReward: 300
  },
];