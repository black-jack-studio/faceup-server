// Card Back Types
export interface CardBack {
  id: string;
  name: string;
  slug: string;
  rarity: 'COMMON' | 'RARE' | 'SUPER_RARE' | 'LEGENDARY';
  imageUrl: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

export interface UserCardBack {
  id: string;
  userId: string;
  cardBackId: string;
  source: string;
  acquiredAt: string;
  cardBack: CardBack;
}

// Card backs data - Classic (default), Dot, Heart, and Spade
export const cardBacksData = {
  "version": "2.0.0",
  "cards": [
    {
      "id": "dot-classic-022",
      "name": "Dot",
      "slug": "dot-classic",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/dot-classic-022.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "heart-large-024",
      "name": "Heart",
      "slug": "heart-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/heart-large-024.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "spade-large-025",
      "name": "Spade",
      "slug": "spade-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/spade-large-025.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "diamond-large-026",
      "name": "Diamond",
      "slug": "diamond-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/diamond-large-026.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "club-large-027",
      "name": "Club",
      "slug": "club-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/club-large-027.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "bear-large-028",
      "name": "Bear",
      "slug": "bear-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/bear-large-028.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "trex-large-029",
      "name": "T-rex",
      "slug": "trex-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/trex-large-029.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "ninja-large-030",
      "name": "Ninja",
      "slug": "ninja-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/ninja-large-030.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "alien-large-031",
      "name": "Alien",
      "slug": "alien-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/alien-large-031.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "artist-large-032",
      "name": "Artist",
      "slug": "artist-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/artist-large-032.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "baby-angel-large-033",
      "name": "Baby angel",
      "slug": "baby-angel-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/baby-angel-large-033.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "candy-large-034",
      "name": "Candy",
      "slug": "candy-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/candy-large-034.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "dragon-custom-037",
      "name": "Dragon",
      "slug": "dragon-custom",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/dragon-custom-037.png",
      "width": 128,
      "height": 128,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "dino-large-038",
      "name": "Dino",
      "slug": "dino-large",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/dino-large-038.png",
      "width": 512,
      "height": 512,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "lys-design-039",
      "name": "Lys design",
      "slug": "lys-design",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/lys-design-039.png",
      "width": 512,
      "height": 512,
      "bytes": 0,
      "sha256": ""
    }
  ]
};

// Utility functions
export const sortCardBacksByRarity = (cardBacks: UserCardBack[]): UserCardBack[] => {
  const rarityOrder = { 'COMMON': 0, 'RARE': 1, 'SUPER_RARE': 2, 'LEGENDARY': 3 };
  return [...cardBacks].sort((a, b) => {
    const rarityA = rarityOrder[a.cardBack.rarity as keyof typeof rarityOrder] ?? 0;
    const rarityB = rarityOrder[b.cardBack.rarity as keyof typeof rarityOrder] ?? 0;
    return rarityA - rarityB;
  });
};

export const getCardBackById = (id: string): CardBack | undefined => {
  return cardBacksData.cards.find(card => card.id === id) as CardBack | undefined;
};

export const getCardBacksByRarity = (rarity: CardBack['rarity']): CardBack[] => {
  return cardBacksData.cards.filter(card => card.rarity === rarity) as CardBack[];
};

export const getAllCardBacks = (): CardBack[] => {
  return cardBacksData.cards as CardBack[];
};

export const getDefaultCardBack = (): CardBack => {
  // Default card back is the classic one, return null since it's handled by backend
  return {
    id: 'default',
    name: 'Classic',
    slug: 'classic',
    rarity: 'COMMON',
    imageUrl: '/card-backs/classic.webp',
    width: 512,
    height: 742,
    bytes: 0,
    sha256: ''
  };
};

export const getRarityColor = (rarity: CardBack['rarity']): string => {
  const colors = {
    'COMMON': '#9CA3AF',    // gray-400
    'RARE': '#3B82F6',      // blue-500  
    'SUPER_RARE': '#8B5CF6', // violet-500
    'LEGENDARY': '#F59E0B'   // amber-500
  };
  return colors[rarity] || colors.COMMON;
};

export const getRarityDisplayName = (rarity: CardBack['rarity']): string => {
  const names = {
    'COMMON': 'Common',
    'RARE': 'Rare',
    'SUPER_RARE': 'Super Rare',
    'LEGENDARY': 'Legendary'
  };
  return names[rarity] || names.COMMON;
};