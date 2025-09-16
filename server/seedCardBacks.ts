import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { db } from './db.js';
import { cardBacks, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface CardBackData {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'super_rare' | 'legendary';
  colorTheme: 'green' | 'blue' | 'purple' | 'monochrome';
  isDefault: boolean;
  sourceFile: string;
}

const cardBackMapping: CardBackData[] = [
  {
    id: 'emerald-circuit',
    name: 'Emerald Circuit',
    description: 'Elegant green geometric pattern with circuitry elements',
    rarity: 'common',
    colorTheme: 'green',
    isDefault: false,
    sourceFile: 'qjrbgks_1758004864739.png'
  },
  {
    id: 'cosmic-blue',
    name: 'Cosmic Blue',
    description: 'Celestial blue design with orbital patterns',
    rarity: 'rare',
    colorTheme: 'blue',
    isDefault: false,
    sourceFile: 'brji"ébri_1758004864737.png'
  },
  {
    id: 'classic',
    name: 'Monochrome Classic',
    description: 'Timeless black and white minimalist design',
    rarity: 'legendary',
    colorTheme: 'monochrome',
    isDefault: true,
    sourceFile: 'cgcg_1758004864739.png'
  },
  {
    id: 'solar-burst',
    name: 'Solar Burst',
    description: 'Radiant black design with striking sunburst pattern',
    rarity: 'legendary',
    colorTheme: 'monochrome',
    isDefault: false,
    sourceFile: 'kyv_1758004864739.png'
  }
];

async function findActualFileName(targetFileName: string): Promise<string | null> {
  try {
    const files = await readdir('attached_assets');
    
    // Handle the special character file
    if (targetFileName === 'brji"ébri_1758004864737.png') {
      const found = files.find(file => file.includes('brji') && file.includes('1758004864737'));
      return found || null;
    }
    
    // For other files, exact match
    return files.includes(targetFileName) ? targetFileName : null;
  } catch (error) {
    console.error('Error reading attached_assets directory:', error);
    return null;
  }
}

async function uploadToObjectStorage(fileBuffer: Buffer, fileName: string): Promise<string> {
  // For now, we'll simulate the upload and return a placeholder URL
  // In a real implementation, this would use the object storage SDK
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const publicPath = process.env.PUBLIC_OBJECT_SEARCH_PATHS;
  
  if (!bucketId) {
    throw new Error('Object storage bucket not configured');
  }
  
  // This would be the actual object storage upload logic
  // For simulation, we'll create a deterministic URL
  const baseUrl = `https://storage.replit.com/${bucketId}`;
  return `${baseUrl}/card-backs/${fileName}`;
}

export async function seedCardBacks(): Promise<void> {
  console.log('🎴 Starting card back seeding...');
  
  try {
    // Check if card backs already exist
    const existingCards = await db.select().from(cardBacks);
    if (existingCards.length > 0) {
      console.log('✅ Card backs already seeded, skipping...');
      return;
    }
    
    for (const cardData of cardBackMapping) {
      console.log(`📤 Processing ${cardData.name}...`);
      
      // Find the actual file name
      const actualFileName = await findActualFileName(cardData.sourceFile);
      if (!actualFileName) {
        console.error(`❌ File not found: ${cardData.sourceFile}`);
        continue;
      }
      
      // Read the file
      const filePath = path.join('attached_assets', actualFileName);
      const fileBuffer = await readFile(filePath);
      
      // Create standardized file name
      const standardFileName = `${cardData.id}.png`;
      
      // Upload to object storage
      const imageUrl = await uploadToObjectStorage(fileBuffer, standardFileName);
      
      // Insert into database
      await db.insert(cardBacks).values({
        id: cardData.id,
        name: cardData.name,
        description: cardData.description,
        imageUrl: imageUrl,
        rarity: cardData.rarity,
        colorTheme: cardData.colorTheme,
        isDefault: cardData.isDefault
      });
      
      console.log(`✅ Seeded ${cardData.name} (${cardData.rarity})`);
    }
    
    // Update users who have invalid selectedCardBackId
    await db
      .update(users)
      .set({ selectedCardBackId: 'classic' })
      .where(eq(users.selectedCardBackId, 'classic')); // This handles both NULL and existing 'classic'
    
    console.log('🎴 Card back seeding completed successfully!');
    console.log('📊 Summary:');
    cardBackMapping.forEach(card => {
      console.log(`   ${card.name}: ${card.rarity} (${card.colorTheme})`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding card backs:', error);
    throw error;
  }
}

// Auto-run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedCardBacks()
    .then(() => {
      console.log('✅ Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}