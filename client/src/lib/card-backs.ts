// Gestion des dos de cartes disponibles

export interface CardBack {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  image?: string; // Backward compatibility
  rarity: "COMMON" | "RARE" | "SUPER_RARE" | "LEGENDARY";
  colorTheme: string;
  isDefault?: boolean;
  createdAt?: string;
  price?: number; // Backward compatibility
  available?: boolean; // Backward compatibility
}

export interface UserCardBack {
  id: string;
  userId: string;
  cardBackId: string;
  unlockedAt: string;
  cardBack: CardBack;
}

// Liste des dos de cartes pour compatibilité
export const cardBacks: CardBack[] = [
  {
    id: "classic",
    name: "Classic Blue",
    description: "The classic blue card back, timeless and elegant",
    imageUrl: "/api/placeholder/120/180",
    image: "/api/placeholder/120/180", // Backward compatibility
    rarity: "COMMON",
    colorTheme: "blue",
    isDefault: true,
    available: true,
  },
  {
    id: "emerald_dragon",
    name: "Emerald Dragon",
    description: "A mystical dragon design with emerald scales",
    imageUrl: "/api/placeholder/120/180",
    image: "/api/placeholder/120/180", // Backward compatibility
    rarity: "RARE",
    colorTheme: "green",
    price: 100,
    available: true,
  },
];

// Fonction pour obtenir une carte par ID
export function getCardBackById(id: string): CardBack | undefined {
  return cardBacks.find(card => card.id === id);
}

// Fonction pour obtenir la carte par défaut
export function getDefaultCardBack(): CardBack {
  return {
    id: "classic",
    name: "Classic Blue",
    description: "The classic blue card back, timeless and elegant",
    imageUrl: "/api/placeholder/120/180",
    rarity: "common",
    colorTheme: "blue",
    isDefault: true,
  };
}

// Fonction pour obtenir les cartes par rareté
export function getCardBacksByRarity(cardBacks: UserCardBack[], rarity: CardBack["rarity"]): UserCardBack[] {
  return cardBacks.filter(userCardBack => userCardBack.cardBack.rarity === rarity);
}

// Fonction pour trier les cartes par rareté
export function sortCardBacksByRarity(cardBacks: UserCardBack[]): UserCardBack[] {
  const rarityOrder = { COMMON: 1, RARE: 2, SUPER_RARE: 3, LEGENDARY: 4 };
  return cardBacks.sort((a, b) => {
    return rarityOrder[a.cardBack.rarity as keyof typeof rarityOrder] - 
           rarityOrder[b.cardBack.rarity as keyof typeof rarityOrder];
  });
}

// Fonction pour obtenir les couleurs selon la rareté
export function getRarityColor(rarity: CardBack["rarity"]): string {
  switch (rarity) {
    case "COMMON":
      return "text-green-600";
    case "RARE":
      return "text-blue-600";
    case "SUPER_RARE":
      return "text-purple-600";
    case "LEGENDARY":
      return "text-yellow-600";
    default:
      return "text-gray-600";
  }
}

// Fonction pour obtenir les styles de background selon la rareté
export function getRarityBackground(rarity: CardBack["rarity"]): string {
  switch (rarity) {
    case "COMMON":
      return "bg-green-100 border-green-500";
    case "RARE":
      return "bg-blue-100 border-blue-500";
    case "SUPER_RARE":
      return "bg-purple-100 border-purple-500";
    case "LEGENDARY":
      return "bg-yellow-100 border-yellow-500";
    default:
      return "bg-gray-100 border-gray-500";
  }
}

// Fonction pour obtenir le nom affiché de la rareté
export function getRarityDisplayName(rarity: CardBack["rarity"]): string {
  switch (rarity) {
    case "COMMON":
      return "Common";
    case "RARE":
      return "Rare";
    case "SUPER_RARE":
      return "Super Rare";
    case "LEGENDARY":
      return "Legendary";
    default:
      return "Unknown";
  }
}