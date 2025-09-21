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

// Card backs data
export const cardBacksData = 
{
  "version": "2.0.0",
  "cards": [
    {
      "id": "common-orbit-001",
      "name": "Common Orbit",
      "slug": "common-orbit",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/common-orbit-001.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "common-wave-002",
      "name": "Common Wave",
      "slug": "common-wave",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/common-wave-002.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "common-grid-003",
      "name": "Common Grid",
      "slug": "common-grid",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/common-grid-003.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "common-spiral-004",
      "name": "Common Spiral",
      "slug": "common-spiral",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/common-spiral-004.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "common-dots-005",
      "name": "Common Dots",
      "slug": "common-dots",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/common-dots-005.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "rare-nova-006",
      "name": "Rare Nova",
      "slug": "rare-nova",
      "rarity": "RARE",
      "imageUrl": "/card-backs/rare-nova-006.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "rare-crystal-007",
      "name": "Rare Crystal",
      "slug": "rare-crystal",
      "rarity": "RARE",
      "imageUrl": "/card-backs/rare-crystal-007.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "rare-storm-008",
      "name": "Rare Storm",
      "slug": "rare-storm",
      "rarity": "RARE",
      "imageUrl": "/card-backs/rare-storm-008.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "rare-prism-009",
      "name": "Rare Prism",
      "slug": "rare-prism",
      "rarity": "RARE",
      "imageUrl": "/card-backs/rare-prism-009.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "rare-flow-010",
      "name": "Rare Flow",
      "slug": "rare-flow",
      "rarity": "RARE",
      "imageUrl": "/card-backs/rare-flow-010.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "super-radiant-011",
      "name": "Super Radiant",
      "slug": "super-radiant",
      "rarity": "SUPER_RARE",
      "imageUrl": "/card-backs/super-radiant-011.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "super-cosmic-012",
      "name": "Super Cosmic",
      "slug": "super-cosmic",
      "rarity": "SUPER_RARE",
      "imageUrl": "/card-backs/super-cosmic-012.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "super-vortex-013",
      "name": "Super Vortex",
      "slug": "super-vortex",
      "rarity": "SUPER_RARE",
      "imageUrl": "/card-backs/super-vortex-013.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "super-phoenix-014",
      "name": "Super Phoenix",
      "slug": "super-phoenix",
      "rarity": "SUPER_RARE",
      "imageUrl": "/card-backs/super-phoenix-014.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "super-nebula-015",
      "name": "Super Nebula",
      "slug": "super-nebula",
      "rarity": "SUPER_RARE",
      "imageUrl": "/card-backs/super-nebula-015.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "royal-legend-016",
      "name": "Royal Legend",
      "slug": "royal-legend",
      "rarity": "LEGENDARY",
      "imageUrl": "/card-backs/royal-legend-016.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "shadow-elite-017",
      "name": "Shadow Elite",
      "slug": "shadow-elite",
      "rarity": "LEGENDARY",
      "imageUrl": "/card-backs/shadow-elite-017.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "golden-crown-018",
      "name": "Golden Crown",
      "slug": "golden-crown",
      "rarity": "LEGENDARY",
      "imageUrl": "/card-backs/golden-crown-018.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "mystic-emperor-019",
      "name": "Mystic Emperor",
      "slug": "mystic-emperor",
      "rarity": "LEGENDARY",
      "imageUrl": "/card-backs/mystic-emperor-019.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "diamond-elite-020",
      "name": "Diamond Elite",
      "slug": "diamond-elite",
      "rarity": "LEGENDARY",
      "imageUrl": "/card-backs/diamond-elite-020.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
    {
      "id": "minimal-blue-021",
      "name": "Minimal Blue",
      "slug": "minimal-blue",
      "rarity": "RARE",
      "imageUrl": "/card-backs/minimal-blue-021.webp",
      "width": 512,
      "height": 742,
      "bytes": 0,
      "sha256": ""
    },
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
      "id": "triangle-geometric-023",
      "name": "Triangle",
      "slug": "triangle-geometric",
      "rarity": "COMMON",
      "imageUrl": "/card-backs/triangle-geometric-023.webp",
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
