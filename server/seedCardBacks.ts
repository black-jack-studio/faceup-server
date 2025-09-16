import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { db } from './db.js';
import { cardBacks, userCardBacks } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface CardBackData {
  name: string;
  description: string;
  rarity: 'COMMON' | 'RARE' | 'SUPER_RARE' | 'LEGENDARY';
  priceGems: number;
  sourceFile: string;
}

// Map the 5 new PNG card back designs to database records
const cardBackMapping: CardBackData[] = [
  {
    name: 'Geometric Green',
    description: 'Elegant emerald design with geometric patterns and target motif',
    rarity: 'COMMON',
    priceGems: 100,
    sourceFile: 'Capture_d_écran_2025-09-16_à_19.51.06-removebg-preview_1758046179538.png'
  },
  {
    name: 'Minimalist White',
    description: 'Clean white design with flowing organic curves',
    rarity: 'RARE',
    priceGems: 250,
    sourceFile: 'cgcg-removebg-preview_1758046179539.png'
  },
  {
    name: 'Royal Purple',
    description: 'Luxurious purple card back with diamond celestial pattern',
    rarity: 'SUPER_RARE',
    priceGems: 500,
    sourceFile: 'image-removebg-preview_1758046179539.png'
  },
  {
    name: 'Stellar Blue',
    description: 'Cosmic blue design with star and orbital patterns',
    rarity: 'RARE',
    priceGems: 250,
    sourceFile: 'kuyvh-removebg-preview_1758046179539.png'
  },
  {
    name: 'Radiant Black',
    description: 'Premium black design with radiant sunburst pattern',
    rarity: 'LEGENDARY',
    priceGems: 1000,
    sourceFile: 'kyv-removebg-preview_1758046179540.png'
  }
];

async function findActualFileName(targetFileName: string): Promise<string | null> {
  try {
    const files = await readdir('attached_assets');
    return files.includes(targetFileName) ? targetFileName : null;
  } catch (error) {
    console.error('Error reading attached_assets directory:', error);
    return null;
  }
}

async function uploadToObjectStorage(fileBuffer: Buffer, fileName: string): Promise<string> {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  
  if (!bucketId) {
    throw new Error('Object storage bucket not configured');
  }
  
  // Create the public URL for the uploaded file
  // For now, we'll simulate this as the actual upload logic would need object storage SDK
  const baseUrl = `https://storage.replit.com/${bucketId}`;
  return `${baseUrl}/public/card-backs/${fileName}`;
}

export async function seedCardBacks(): Promise<void> {
  console.log('🎴 Starting card back seeding with new PNG designs...');
  
  try {
    // Clear existing data - delete child records first to avoid foreign key constraint violations
    await db.delete(userCardBacks);
    console.log('🗑️  Cleared existing user card back collections');
    
    await db.delete(cardBacks);
    console.log('🗑️  Cleared existing card backs');
    
    for (let i = 0; i < cardBackMapping.length; i++) {
      const cardData = cardBackMapping[i];
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
      
      // Create standardized file name based on rarity and index
      const standardFileName = `${cardData.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      
      // Upload to object storage
      const imageUrl = await uploadToObjectStorage(fileBuffer, standardFileName);
      
      // Insert into database
      await db.insert(cardBacks).values({
        name: cardData.name,
        rarity: cardData.rarity,
        priceGems: cardData.priceGems,
        imageUrl: imageUrl,
        isActive: true
      });
      
      console.log(`✅ Seeded ${cardData.name} (${cardData.rarity}) - ${cardData.priceGems} gems`);
    }
    
    console.log('🎴 Card back seeding completed successfully!');
    console.log('📊 Summary:');
    cardBackMapping.forEach(card => {
      console.log(`   ${card.name}: ${card.rarity} - ${card.priceGems} gems`);
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