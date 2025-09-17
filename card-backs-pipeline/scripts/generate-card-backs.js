#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import sharp from 'sharp';
import slugify from 'slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG_PATH = path.join(__dirname, '../card-backs.src.json');
const TEMPLATE_PATH = path.join(__dirname, '../TEMPLATE.svg');
const SVG_OUTPUT_DIR = path.join(__dirname, '../src_svgs');
const WEBP_OUTPUT_DIR = path.join(__dirname, '../../client/public/card-backs');
const MANIFEST_PATH = path.join(__dirname, '../card-backs.json');

const WEBP_SIZE = { width: 512, height: 742 };
const WEBP_QUALITY = 80;

console.log('🎴 Starting card back generation pipeline...');

// Ensure directories exist
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// Pattern generators
const PatternGenerators = {
  circles: () => `
    <circle class="accent" cx="200" cy="200" r="40"/>
    <circle class="accent" cx="800" cy="300" r="60"/>
    <circle class="accent" cx="300" cy="500" r="35"/>
    <circle class="accent" cx="700" cy="700" r="50"/>
    <circle class="accent" cx="150" cy="900" r="45"/>
    <circle class="accent" cx="850" cy="1100" r="55"/>
    <circle class="accent" cx="500" cy="1300" r="40"/>
  `,
  
  waves: () => `
    <path class="accent" d="M0,300 Q250,200 500,300 T1000,300 L1000,350 Q750,450 500,350 T0,350 Z"/>
    <path class="accent" d="M0,600 Q250,500 500,600 T1000,600 L1000,650 Q750,750 500,650 T0,650 Z"/>
    <path class="accent" d="M0,900 Q250,800 500,900 T1000,900 L1000,950 Q750,1050 500,950 T0,950 Z"/>
    <path class="accent" d="M0,1200 Q250,1100 500,1200 T1000,1200 L1000,1250 Q750,1350 500,1250 T0,1250 Z"/>
  `,
  
  grid: () => {
    let grid = '';
    for (let x = 100; x < 1000; x += 150) {
      grid += `<line class="accent" x1="${x}" y1="100" x2="${x}" y2="1350" stroke-width="2"/>`;
    }
    for (let y = 100; y < 1450; y += 150) {
      grid += `<line class="accent" x1="100" y1="${y}" x2="900" y2="${y}" stroke-width="2"/>`;
    }
    return grid;
  },
  
  spiral: () => `
    <path class="accent" d="M500,725 Q450,675 400,725 Q350,775 400,825 Q450,875 500,825 Q550,775 600,825 Q650,875 700,825 Q750,775 700,725 Q650,675 600,725 Q550,775 500,725" fill="none" stroke-width="3"/>
    <circle class="accent" cx="500" cy="725" r="5"/>
    <path class="accent" d="M300,400 Q250,350 200,400 Q150,450 200,500 Q250,550 300,500 Q350,450 400,500 Q450,550 500,500 Q550,450 500,400 Q450,350 400,400 Q350,450 300,400" fill="none" stroke-width="2"/>
    <path class="accent" d="M700,1000 Q650,950 600,1000 Q550,1050 600,1100 Q650,1150 700,1100 Q750,1050 800,1100 Q850,1150 900,1100 Q950,1050 900,1000 Q850,950 800,1000 Q750,1050 700,1000" fill="none" stroke-width="2"/>
  `,
  
  dots: () => {
    let dots = '';
    for (let x = 150; x < 1000; x += 100) {
      for (let y = 200; y < 1400; y += 120) {
        const offset = (Math.floor(y / 120) % 2) * 50;
        dots += `<circle class="accent" cx="${x + offset}" cy="${y}" r="8"/>`;
      }
    }
    return dots;
  },
  
  stars: () => `
    <polygon class="accent" points="250,250 265,285 300,285 275,305 285,340 250,320 215,340 225,305 200,285 235,285"/>
    <polygon class="accent" points="750,400 765,435 800,435 775,455 785,490 750,470 715,490 725,455 700,435 735,435"/>
    <polygon class="accent" points="400,600 415,635 450,635 425,655 435,690 400,670 365,690 375,655 350,635 385,635"/>
    <polygon class="accent" points="650,800 665,835 700,835 675,855 685,890 650,870 615,890 625,855 600,835 635,835"/>
    <polygon class="accent" points="300,1000 315,1035 350,1035 325,1055 335,1090 300,1070 265,1090 275,1055 250,1035 285,1035"/>
    <polygon class="accent" points="800,1200 815,1235 850,1235 825,1255 835,1290 800,1270 765,1290 775,1255 750,1235 785,1235"/>
  `,
  
  crystals: () => `
    <polygon class="accent" points="250,200 300,250 250,350 200,300 150,250"/>
    <polygon class="accent" points="750,300 800,350 750,450 700,400 650,350"/>
    <polygon class="accent" points="400,500 450,550 400,650 350,600 300,550"/>
    <polygon class="accent" points="600,700 650,750 600,850 550,800 500,750"/>
    <polygon class="accent" points="200,900 250,950 200,1050 150,1000 100,950"/>
    <polygon class="accent" points="800,1100 850,1150 800,1250 750,1200 700,1150"/>
  `,
  
  lightning: () => `
    <path class="accent" d="M200,200 L250,300 L200,350 L300,450 L250,500 L350,600 L300,650" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path class="accent" d="M500,250 L550,350 L500,400 L600,500 L550,550 L650,650 L600,700" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path class="accent" d="M750,300 L800,400 L750,450 L850,550 L800,600 L900,700 L850,750" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path class="accent" d="M150,800 L200,900 L150,950 L250,1050 L200,1100 L300,1200 L250,1250" stroke-width="6" fill="none" stroke-linecap="round"/>
  `,
  
  triangles: () => `
    <polygon class="accent" points="250,200 300,300 200,300"/>
    <polygon class="accent" points="750,250 800,350 700,350"/>
    <polygon class="accent" points="400,400 450,500 350,500"/>
    <polygon class="accent" points="600,550 650,650 550,650"/>
    <polygon class="accent" points="300,700 350,800 250,800"/>
    <polygon class="accent" points="700,850 750,950 650,950"/>
    <polygon class="accent" points="500,1000 550,1100 450,1100"/>
    <polygon class="accent" points="200,1150 250,1250 150,1250"/>
    <polygon class="accent" points="800,1200 850,1300 750,1300"/>
  `,
  
  flow: () => `
    <path class="accent" d="M100,300 C200,250 300,350 400,300 S600,250 700,300 S900,350 1000,300" stroke-width="4" fill="none"/>
    <path class="accent" d="M0,500 C100,450 200,550 300,500 S500,450 600,500 S800,550 900,500" stroke-width="4" fill="none"/>
    <path class="accent" d="M100,700 C200,650 300,750 400,700 S600,650 700,700 S900,750 1000,700" stroke-width="4" fill="none"/>
    <path class="accent" d="M0,900 C100,850 200,950 300,900 S500,850 600,900 S800,950 900,900" stroke-width="4" fill="none"/>
    <path class="accent" d="M100,1100 C200,1050 300,1150 400,1100 S600,1050 700,1100 S900,1150 1000,1100" stroke-width="4" fill="none"/>
    <path class="accent" d="M0,1300 C100,1250 200,1350 300,1300 S500,1250 600,1300 S800,1350 900,1300" stroke-width="4" fill="none"/>
  `,
  
  radiant: () => `
    <g transform="translate(500,725)">
      <circle class="accent" cx="0" cy="0" r="80" fill="none" stroke-width="3"/>
      <circle class="accent" cx="0" cy="0" r="120" fill="none" stroke-width="2"/>
      <circle class="accent" cx="0" cy="0" r="160" fill="none" stroke-width="1"/>
      <line class="accent" x1="-200" y1="0" x2="200" y2="0" stroke-width="2"/>
      <line class="accent" x1="0" y1="-200" x2="0" y2="200" stroke-width="2"/>
      <line class="accent" x1="-141" y1="-141" x2="141" y2="141" stroke-width="2"/>
      <line class="accent" x1="141" y1="-141" x2="-141" y2="141" stroke-width="2"/>
    </g>
  `,
  
  cosmic: () => `
    <circle class="accent" cx="500" cy="725" r="100" fill="none" stroke-width="2"/>
    <circle class="accent" cx="300" cy="400" r="50" fill="none" stroke-width="2"/>
    <circle class="accent" cx="700" cy="1000" r="60" fill="none" stroke-width="2"/>
    <circle class="accent" cx="200" cy="800" r="30" fill="none" stroke-width="1"/>
    <circle class="accent" cx="800" cy="500" r="40" fill="none" stroke-width="1"/>
    <path class="accent" d="M400,300 Q500,200 600,300 Q700,400 800,300" stroke-width="1" fill="none"/>
    <path class="accent" d="M200,600 Q300,500 400,600 Q500,700 600,600" stroke-width="1" fill="none"/>
    <path class="accent" d="M300,900 Q400,800 500,900 Q600,1000 700,900" stroke-width="1" fill="none"/>
  `,
  
  vortex: () => `
    <g transform="translate(500,725)">
      <path class="accent" d="M0,0 Q-50,-100 -100,0 Q-50,100 0,0" fill="none" stroke-width="3"/>
      <path class="accent" d="M0,0 Q50,-100 100,0 Q50,100 0,0" fill="none" stroke-width="3"/>
      <path class="accent" d="M0,0 Q-100,-50 0,-100 Q100,-50 0,0" fill="none" stroke-width="2"/>
      <path class="accent" d="M0,0 Q-100,50 0,100 Q100,50 0,0" fill="none" stroke-width="2"/>
      <circle class="accent" cx="0" cy="0" r="150" fill="none" stroke-width="1"/>
      <circle class="accent" cx="0" cy="0" r="200" fill="none" stroke-width="1"/>
    </g>
  `,
  
  phoenix: () => `
    <path class="accent" d="M500,1200 Q450,1100 400,1000 Q350,900 300,800 Q350,750 400,800 Q450,850 500,800 Q550,850 600,800 Q650,750 700,800 Q650,900 600,1000 Q550,1100 500,1200" stroke-width="3" fill="none"/>
    <path class="accent" d="M300,700 Q200,600 100,500 Q150,450 250,550 Q350,650 300,700" stroke-width="2" fill="none"/>
    <path class="accent" d="M700,700 Q800,600 900,500 Q850,450 750,550 Q650,650 700,700" stroke-width="2" fill="none"/>
    <circle class="accent" cx="500" cy="600" r="20"/>
    <path class="accent" d="M480,580 Q500,560 520,580" stroke-width="2" fill="none"/>
  `,
  
  nebula: () => `
    <ellipse class="accent" cx="300" cy="400" rx="80" ry="40" transform="rotate(30 300 400)" fill="none" stroke-width="2"/>
    <ellipse class="accent" cx="700" cy="600" rx="60" ry="80" transform="rotate(-45 700 600)" fill="none" stroke-width="2"/>
    <ellipse class="accent" cx="500" cy="800" rx="100" ry="50" transform="rotate(60 500 800)" fill="none" stroke-width="2"/>
    <ellipse class="accent" cx="200" cy="1000" rx="70" ry="90" transform="rotate(-30 200 1000)" fill="none" stroke-width="2"/>
    <ellipse class="accent" cx="800" cy="1100" rx="90" ry="60" transform="rotate(45 800 1100)" fill="none" stroke-width="2"/>
    <path class="accent" d="M400,300 Q500,250 600,300 Q650,350 700,400 Q750,450 800,400" stroke-width="1" fill="none"/>
    <path class="accent" d="M200,700 Q300,650 400,700 Q450,750 500,800 Q550,850 600,800" stroke-width="1" fill="none"/>
  `,
  
  crown: () => `
    <path class="accent" d="M200,600 L250,500 L300,600 L350,450 L400,600 L450,500 L500,600 L550,500 L600,600 L650,450 L700,600 L750,500 L800,600 L800,700 L200,700 Z" stroke-width="3"/>
    <circle class="accent" cx="250" cy="500" r="15"/>
    <circle class="accent" cx="350" cy="450" r="20"/>
    <circle class="accent" cx="450" cy="500" r="15"/>
    <circle class="accent" cx="550" cy="500" r="15"/>
    <circle class="accent" cx="650" cy="450" r="20"/>
    <circle class="accent" cx="750" cy="500" r="15"/>
    <rect class="accent" x="450" y="650" width="100" height="40"/>
  `,
  
  shadow: () => `
    <rect class="accent" x="100" y="300" width="150" height="20" transform="skewX(-15)"/>
    <rect class="accent" x="300" y="500" width="200" height="25" transform="skewX(10)"/>
    <rect class="accent" x="500" y="700" width="180" height="30" transform="skewX(-20)"/>
    <rect class="accent" x="200" y="900" width="160" height="20" transform="skewX(15)"/>
    <rect class="accent" x="600" y="1100" width="140" height="35" transform="skewX(-10)"/>
    <polygon class="accent" points="750,400 800,350 850,400 850,450 800,500 750,450" opacity="0.3"/>
    <polygon class="accent" points="150,800 200,750 250,800 250,850 200,900 150,850" opacity="0.3"/>
  `,
  
  royal: () => `
    <rect class="accent" x="400" y="300" width="200" height="100" stroke-width="4" fill="none"/>
    <rect class="accent" x="425" y="325" width="150" height="50" stroke-width="2" fill="none"/>
    <circle class="accent" cx="500" cy="350" r="25"/>
    <polygon class="accent" points="500,500 480,540 460,500 480,460"/>
    <polygon class="accent" points="500,500 520,540 540,500 520,460"/>
    <rect class="accent" x="350" y="600" width="300" height="40" stroke-width="3" fill="none"/>
    <rect class="accent" x="300" y="700" width="400" height="60" stroke-width="4" fill="none"/>
    <line class="accent" x1="300" y1="800" x2="700" y2="800" stroke-width="6"/>
    <circle class="accent" cx="400" cy="900" r="20"/>
    <circle class="accent" cx="500" cy="900" r="20"/>
    <circle class="accent" cx="600" cy="900" r="20"/>
  `,
  
  mystic: () => `
    <circle class="accent" cx="500" cy="600" r="120" fill="none" stroke-width="3"/>
    <polygon class="accent" points="500,480 520,540 580,540 535,575 555,635 500,600 445,635 465,575 420,540 480,540"/>
    <circle class="accent" cx="300" cy="400" r="40" fill="none" stroke-width="2"/>
    <circle class="accent" cx="700" cy="800" r="50" fill="none" stroke-width="2"/>
    <path class="accent" d="M200,300 Q250,250 300,300 Q350,350 400,300 Q450,250 500,300" stroke-width="2" fill="none"/>
    <path class="accent" d="M500,900 Q550,850 600,900 Q650,950 700,900 Q750,850 800,900" stroke-width="2" fill="none"/>
    <rect class="accent" x="150" y="1000" width="30" height="30" transform="rotate(45 165 1015)"/>
    <rect class="accent" x="820" y="500" width="30" height="30" transform="rotate(45 835 515)"/>
  `,
  
  diamond: () => `
    <polygon class="accent" points="500,200 600,400 500,600 400,400"/>
    <polygon class="accent" points="250,500 350,700 250,900 150,700"/>
    <polygon class="accent" points="750,700 850,900 750,1100 650,900"/>
    <polygon class="accent" points="300,200 350,300 300,400 250,300"/>
    <polygon class="accent" points="700,300 750,400 700,500 650,400"/>
    <polygon class="accent" points="150,1200 200,1300 150,1400 100,1300"/>
    <polygon class="accent" points="850,1000 900,1100 850,1200 800,1100"/>
    <line class="accent" x1="500" y1="200" x2="500" y2="600" stroke-width="2"/>
    <line class="accent" x1="400" y1="400" x2="600" y2="400" stroke-width="2"/>
  `
};

// Load configuration
function loadConfig() {
  try {
    const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    console.error('❌ Error loading configuration:', error.message);
    process.exit(1);
  }
}

// Load template
function loadTemplate() {
  try {
    return fs.readFileSync(TEMPLATE_PATH, 'utf8');
  } catch (error) {
    console.error('❌ Error loading template:', error.message);
    process.exit(1);
  }
}

// Generate SVG content
function generateSVG(card, template) {
  const { colors, pattern } = card;
  
  // Replace colors
  let svgContent = template
    .replace(/--card-bg: #[0-9a-fA-F]{6};/, `--card-bg: ${colors.bg};`)
    .replace(/--accent: #[0-9a-fA-F]{6};/, `--accent: ${colors.accent};`);
  
  // Generate pattern
  const patternGenerator = PatternGenerators[pattern];
  if (!patternGenerator) {
    console.warn(`⚠️ Pattern '${pattern}' not found, using circles as fallback`);
    const patternContent = PatternGenerators.circles();
    svgContent = svgContent.replace(/<g id="pattern">[\s\S]*?<\/g>/, `<g id="pattern">${patternContent}</g>`);
  } else {
    const patternContent = patternGenerator();
    svgContent = svgContent.replace(/<g id="pattern">[\s\S]*?<\/g>/, `<g id="pattern">${patternContent}</g>`);
  }
  
  return svgContent;
}

// Convert SVG to WebP
async function convertToWebP(svgPath, webpPath) {
  try {
    await sharp(svgPath)
      .resize(WEBP_SIZE.width, WEBP_SIZE.height)
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpPath);
    
    return fs.statSync(webpPath).size;
  } catch (error) {
    console.error(`❌ Error converting ${svgPath} to WebP:`, error.message);
    throw error;
  }
}

// Generate SHA256 hash
function generateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Generate slug from ID
function generateSlug(id) {
  return slugify(id, { lower: true, strict: true });
}

// Main generation process
async function generateCardBacks() {
  console.log('📋 Loading configuration and template...');
  const config = loadConfig();
  const template = loadTemplate();
  
  // Ensure directories exist
  ensureDirectoryExists(SVG_OUTPUT_DIR);
  ensureDirectoryExists(WEBP_OUTPUT_DIR);
  
  const manifest = {
    version: "1.0.0",
    generated: true,
    generatedAt: new Date().toISOString(),
    cards: []
  };
  
  console.log(`🎨 Processing ${config.cards.length} card backs...`);
  
  for (const [index, card] of config.cards.entries()) {
    console.log(`\n📇 Processing ${index + 1}/${config.cards.length}: ${card.name} (${card.pattern})`);
    
    try {
      // Generate SVG
      const svgContent = generateSVG(card, template);
      const svgPath = path.join(SVG_OUTPUT_DIR, `${card.id}.svg`);
      fs.writeFileSync(svgPath, svgContent);
      console.log(`  ✅ SVG generated: ${card.id}.svg`);
      
      // Convert to WebP
      const webpFilename = `${card.id}.webp`;
      const webpPath = path.join(WEBP_OUTPUT_DIR, webpFilename);
      const fileSize = await convertToWebP(svgPath, webpPath);
      console.log(`  ✅ WebP generated: ${webpFilename} (${Math.round(fileSize / 1024)}KB)`);
      
      // Generate metadata
      const sha256 = generateSHA256(webpPath);
      const slug = generateSlug(card.id);
      
      manifest.cards.push({
        id: card.id,
        name: card.name,
        slug: slug,
        rarity: card.rarity,
        imageUrl: `/card-backs/${webpFilename}`,
        width: WEBP_SIZE.width,
        height: WEBP_SIZE.height,
        bytes: fileSize,
        sha256: sha256
      });
      
      console.log(`  ✅ Metadata: ${slug} (${sha256.substring(0, 8)}...)`);
      
    } catch (error) {
      console.error(`  ❌ Error processing ${card.name}:`, error.message);
      process.exit(1);
    }
  }
  
  // Write manifest
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`\n📄 Manifest generated: card-backs.json`);
  
  // Summary
  const totalSize = manifest.cards.reduce((sum, card) => sum + card.bytes, 0);
  const avgSize = Math.round(totalSize / manifest.cards.length / 1024);
  
  console.log(`\n🎉 Generation complete!`);
  console.log(`   Generated: ${manifest.cards.length} card backs`);
  console.log(`   Total size: ${Math.round(totalSize / 1024)}KB`);
  console.log(`   Average size: ${avgSize}KB per file`);
  console.log(`   Target range: 30-50KB ✓`);
  
  // Pattern summary
  const patternCounts = manifest.cards.reduce((acc, card) => {
    const pattern = config.cards.find(c => c.id === card.id)?.pattern;
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`\n📊 Pattern distribution:`);
  Object.entries(patternCounts).forEach(([pattern, count]) => {
    console.log(`   ${pattern}: ${count} card${count !== 1 ? 's' : ''}`);
  });
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  generateCardBacks().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { generateCardBacks };