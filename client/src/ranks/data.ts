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
    max: 10000,   
    emoji: '🐷',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Pig-3d.1024_1758972517466.png'
  },
  { 
    key: 'cow',   
    name: 'Moo Rookie',     
    min: 10001, 
    max: 50000,  
    emoji: '🐄',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Cow-3d.1024_1758972517467.png'
  },
  { 
    key: 'fish',  
    name: 'Splashy',        
    min: 50001, 
    max: 200000,  
    emoji: '🐟',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Fish-3d.1024_1758972517467.png'
  },
  { 
    key: 'fox',   
    name: 'Trickster',      
    min: 200001, 
    max: 500000,  
    emoji: '🦊',
    imgSrc: '@assets/Fox-3d-icon_1758972517467.png'
  },
  { 
    key: 'eagle', 
    name: 'Sky Master',     
    min: 500001, 
    max: 1000000,  
    emoji: '🦅',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-Eagle-3d.1024_1758972517468.png'
  },
  { 
    key: 'tiger', 
    name: 'Stripe King',    
    min: 1000001, 
    max: 5000000, 
    emoji: '🐯',
    imgSrc: '@assets/tiger-face_1f42f_1758972517468.png'
  },
  { 
    key: 'camel', 
    name: 'Chip Carrier',   
    min: 5000001, 
    max: 10000000, 
    emoji: '🐪',
    imgSrc: '@assets/camel-3d-icon-png-download-6648586_1758972517468.webp'
  },
  { 
    key: 'whale', 
    name: 'High Roller',    
    min: 10000001, 
    max: 50000000, 
    emoji: '🐋',
    imgSrc: '@assets/whale-11948325-9757328_1758972517468.webp'
  },
  { 
    key: 'trex',  
    name: 'Table Predator', 
    min: 50000001, 
    max: Infinity, 
    emoji: '🦖',
    imgSrc: '@assets/Microsoft-Fluentui-Emoji-3d-T-Rex-3d.1024_1758972517468.png'
  },
];