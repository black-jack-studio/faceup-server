// Gestion des dos de cartes disponibles

export interface CardBack {
  id: string;
  name: string;
  image: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  price?: number; // Prix en jetons pour l'achat dans le shop, undefined si gratuit
  available: boolean; // Si disponible pour l'achat/utilisation
}

// Liste des dos de cartes disponibles
export const cardBacks: CardBack[] = [
  {
    id: "classic",
    name: "Classic Blue",
    image: "/api/placeholder/120/180", // Placeholder pour l'instant
    description: "The classic blue card back, timeless and elegant",
    rarity: "common",
    available: true,
  },
  {
    id: "red-diamond",
    name: "Red Diamond",
    image: "/api/placeholder/120/180",
    description: "Luxurious red diamond pattern",
    rarity: "common",
    price: 500,
    available: true,
  },
  {
    id: "green-emerald",
    name: "Green Emerald",
    image: "/api/placeholder/120/180",
    description: "Sophisticated emerald green design",
    rarity: "rare",
    price: 1000,
    available: true,
  },
  {
    id: "gold-royal",
    name: "Royal Gold",
    image: "/api/placeholder/120/180",
    description: "Majestic gold pattern for VIP players",
    rarity: "epic",
    price: 2500,
    available: true,
  },
  {
    id: "dragon-fire",
    name: "Dragon Fire",
    image: "/api/placeholder/120/180",
    description: "Mystical dragon pattern with fire effects",
    rarity: "legendary",
    price: 5000,
    available: true,
  },
  {
    id: "neon-cyber",
    name: "Neon Cyber",
    image: "/api/placeholder/120/180",
    description: "Futuristic neon design",
    rarity: "epic",
    price: 3000,
    available: true,
  },
];

// Fonction pour obtenir une carte par ID
export function getCardBackById(id: string): CardBack | undefined {
  return cardBacks.find(card => card.id === id);
}

// Fonction pour obtenir la carte par défaut
export function getDefaultCardBack(): CardBack {
  return cardBacks[0]; // Classic Blue
}

// Fonction pour obtenir les cartes par rareté
export function getCardBacksByRarity(rarity: CardBack["rarity"]): CardBack[] {
  return cardBacks.filter(card => card.rarity === rarity);
}

// Fonction pour obtenir les couleurs selon la rareté
export function getRarityColor(rarity: CardBack["rarity"]): string {
  switch (rarity) {
    case "common":
      return "text-gray-400";
    case "rare":
      return "text-blue-400";
    case "epic":
      return "text-purple-400";
    case "legendary":
      return "text-yellow-400";
    default:
      return "text-gray-400";
  }
}