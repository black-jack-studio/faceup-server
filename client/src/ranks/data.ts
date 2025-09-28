// Rank system data with 3D icons
import pigImage from '@assets/Microsoft-Fluentui-Emoji-3d-Pig-3d.1024_1759072300185.png';

export type Rank = {
  key: string;
  name: string;
  min: number;
  max: number; // Infinity pour le dernier
  emoji?: string;   // Fallback emoji
  imgSrc?: string;  // 3D image path
};

export const RANKS: Rank[] = [
  { 
    key: 'pig',   
    name: 'Oinkster',       
    min: 0, 
    max: 10000,   
    imgSrc: pigImage
  },
  { 
    key: 'cow',   
    name: 'Moo Rookie',     
    min: 10001, 
    max: 50000,  
    emoji: '🐄'
  },
  { 
    key: 'fish',  
    name: 'Splashy',        
    min: 50001, 
    max: 200000,  
    emoji: '🐟'
  },
  { 
    key: 'fox',   
    name: 'Trickster',      
    min: 200001, 
    max: 500000,  
    emoji: '🦊'
  },
  { 
    key: 'eagle', 
    name: 'Sky Master',     
    min: 500001, 
    max: 1000000,  
    emoji: '🦅'
  },
  { 
    key: 'tiger', 
    name: 'Stripe King',    
    min: 1000001, 
    max: 5000000, 
    emoji: '🐯'
  },
  { 
    key: 'camel', 
    name: 'Chip Carrier',   
    min: 5000001, 
    max: 10000000, 
    emoji: '🐪'
  },
  { 
    key: 'whale', 
    name: 'High Roller',    
    min: 10000001, 
    max: 50000000, 
    emoji: '🐋'
  },
  { 
    key: 'trex',  
    name: 'Table Predator', 
    min: 50000001, 
    max: Infinity, 
    emoji: '🦖'
  },
];