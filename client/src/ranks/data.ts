// Rank system data with 3D icons
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
    max: 999,   
    emoji: '🐷',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Pig-3d.1024_1758972517466.png'
  },
  { 
    key: 'cow',   
    name: 'Moo Rookie',     
    min: 1000, 
    max: 4999,  
    emoji: '🐄',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Cow-3d.1024_1758972517467.png'
  },
  { 
    key: 'fish',  
    name: 'Splashy',        
    min: 5000, 
    max: 14999,  
    emoji: '🐟',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Fish-3d.1024_1758972517467.png'
  },
  { 
    key: 'fox',   
    name: 'Trickster',      
    min: 15000, 
    max: 39999,  
    emoji: '🦊',
    imgSrc: '@assets/Fox-3d-icon_1758972517467.png'
  },
  { 
    key: 'eagle', 
    name: 'Sky Master',     
    min: 40000, 
    max: 99999,  
    emoji: '🦅',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Eagle-3d.1024_1758972517468.png'
  },
  { 
    key: 'tiger', 
    name: 'Stripe King',    
    min: 100000, 
    max: 249999, 
    emoji: '🐯',
    imgSrc: '@assets/tiger-face_1f42f_1758972517468.png'
  },
  { 
    key: 'camel', 
    name: 'Chip Carrier',   
    min: 250000, 
    max: 499999, 
    emoji: '🐪',
    imgSrc: '@assets/camel-3d-icon-png-download-6648586_1758972517468.webp'
  },
  { 
    key: 'whale', 
    name: 'High Roller',    
    min: 500000, 
    max: 999999, 
    emoji: '🐋',
    imgSrc: '@assets/whale-11948325-9757328_1758972517468.webp'
  },
  { 
    key: 'trex',  
    name: 'Table Predator', 
    min: 1000000, 
    max: Infinity, 
    emoji: '🦖',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-T-Rex-3d.1024_1758972517468.png'
  },
];