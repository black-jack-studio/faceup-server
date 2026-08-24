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

// Card backs data - vidé lors du nettoyage du shop ; seul le dos par défaut (géré côté
// code dans PlayingCard.tsx, pas via cette liste) reste actif pour l'instant.
export const cardBacksData = {
  "version": "2.0.0",
  "cards": [] as CardBack[]
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

export const getAllCardBacks = (): CardBack[] => {
  return cardBacksData.cards as CardBack[];
};