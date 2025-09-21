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

// Card backs data - Only Classic (default) and Dot
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