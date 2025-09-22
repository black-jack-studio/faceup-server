import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTeddyCardBack() {
  const width = 512;
  const height = 742;
  
  // Define card background with rounded corners (SVG)
  const cardBackgroundSvg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- White rounded background -->
      <rect x="0" y="0" width="${width}" height="${height}" rx="30" ry="30" fill="white"/>
      
      <!-- Subtle border -->
      <rect x="2" y="2" width="${width-4}" height="${height-4}" rx="28" ry="28" fill="none" stroke="#e5e7eb" stroke-width="2"/>
    </svg>
  `;

  // Create base card background
  const cardBackground = Buffer.from(cardBackgroundSvg);
  
  // Read the teddy bear image
  const teddyBearPath = path.join(__dirname, 'attached_assets', 'teddy-bear_1758545889302.png');
  
  // Create the composite image
  const outputPath = path.join(__dirname, 'client', 'public', 'card-backs', 'teddy-bear-large-036.webp');
  
  // First resize the teddy bear image
  const resizedTeddyBear = await sharp(teddyBearPath)
    .resize(300, 300, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  
  await sharp(cardBackground)
    .composite([
      {
        input: resizedTeddyBear,
        left: Math.round((width - 300) / 2), // Center horizontally
        top: Math.round((height - 300) / 2)  // Center vertically
      }
    ])
    .webp({ quality: 90 })
    .toFile(outputPath);
  
  console.log(`✅ Created teddy bear card back: ${outputPath}`);
  
  // Get file stats for the JSON entry
  const stats = fs.statSync(outputPath);
  console.log(`📊 File size: ${stats.size} bytes`);
}

createTeddyCardBack().catch(console.error);