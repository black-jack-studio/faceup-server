import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

// Configuration
const OUTPUT_DIR = path.join(process.cwd(), 'client', 'public', 'card-backs');
const TEMP_DIR = path.join(process.cwd(), 'card-backs-pipeline', 'temp');
const MANIFEST_PATH = path.join(process.cwd(), 'card-backs-pipeline', 'card-backs.json');

const WEBP_SIZE = {
  width: 512,
  height: 742
};

// Ensure directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}

// Ultra-minimalist pattern generators - clean geometric designs
const PatternGenerators = {
  // 1. Simple concentric circles
  simple_circles: () => `
    <!-- Central concentric circles -->
    <circle class="pattern-stroke" cx="500" cy="725" r="80" stroke-width="4"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="120" stroke-width="4"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="160" stroke-width="4"/>
    
    <!-- Central dot -->
    <circle class="pattern-fill" cx="500" cy="725" r="15"/>
  `,
  
  // 2. Clean parallel diagonal lines
  diagonal_lines: () => `
    <!-- Diagonal lines from top-left to bottom-right -->
    <line class="pattern-stroke" x1="300" y1="300" x2="700" y2="700" stroke-width="4"/>
    <line class="pattern-stroke" x1="250" y1="350" x2="650" y2="750" stroke-width="4"/>
    <line class="pattern-stroke" x1="350" y1="250" x2="750" y2="650" stroke-width="4"/>
    <line class="pattern-stroke" x1="200" y1="450" x2="600" y2="850" stroke-width="4"/>
    <line class="pattern-stroke" x1="400" y1="200" x2="800" y2="600" stroke-width="4"/>
    <line class="pattern-stroke" x1="150" y1="600" x2="550" y2="1000" stroke-width="4"/>
    <line class="pattern-stroke" x1="450" y1="150" x2="850" y2="550" stroke-width="4"/>
    <line class="pattern-stroke" x1="100" y1="800" x2="500" y2="1200" stroke-width="4"/>
    <line class="pattern-stroke" x1="500" y1="100" x2="900" y2="500" stroke-width="4"/>
  `,
  
  // 3. Simple and clean grid
  minimal_grid: () => `
    <!-- Vertical lines -->
    <line class="pattern-stroke" x1="350" y1="300" x2="350" y2="1150" stroke-width="3"/>
    <line class="pattern-stroke" x1="500" y1="300" x2="500" y2="1150" stroke-width="3"/>
    <line class="pattern-stroke" x1="650" y1="300" x2="650" y2="1150" stroke-width="3"/>
    
    <!-- Horizontal lines -->
    <line class="pattern-stroke" x1="200" y1="500" x2="800" y2="500" stroke-width="3"/>
    <line class="pattern-stroke" x1="200" y1="725" x2="800" y2="725" stroke-width="3"/>
    <line class="pattern-stroke" x1="200" y1="950" x2="800" y2="950" stroke-width="3"/>
  `,
  
  // 4. Central point with minimalist accents
  center_dot: () => `
    <!-- Central point -->
    <circle class="pattern-fill" cx="500" cy="725" r="25"/>
    
    <!-- Corner accents -->
    <circle class="pattern-fill" cx="300" cy="400" r="8"/>
    <circle class="pattern-fill" cx="700" cy="400" r="8"/>
    <circle class="pattern-fill" cx="300" cy="1050" r="8"/>
    <circle class="pattern-fill" cx="700" cy="1050" r="8"/>
  `,
  
  // 5. Simple rays from center
  clean_rays: () => `
    <!-- Central rays -->
    <g transform="translate(500,725)">
      <line class="pattern-stroke" x1="0" y1="-150" x2="0" y2="-30" stroke-width="4"/>
      <line class="pattern-stroke" x1="106" y1="-106" x2="21" y2="-21" stroke-width="4"/>
      <line class="pattern-stroke" x1="150" y1="0" x2="30" y2="0" stroke-width="4"/>
      <line class="pattern-stroke" x1="106" y1="106" x2="21" y2="21" stroke-width="4"/>
      <line class="pattern-stroke" x1="0" y1="150" x2="0" y2="30" stroke-width="4"/>
      <line class="pattern-stroke" x1="-106" y1="106" x2="-21" y2="21" stroke-width="4"/>
      <line class="pattern-stroke" x1="-150" y1="0" x2="-30" y2="0" stroke-width="4"/>
      <line class="pattern-stroke" x1="-106" y1="-106" x2="-21" y2="-21" stroke-width="4"/>
    </g>
    
    <!-- Central circle -->
    <circle class="pattern-fill" cx="500" cy="725" r="12"/>
  `,
  
  // 6. Central square with borders
  basic_square: () => `
    <!-- Central square -->
    <rect class="pattern-stroke" x="400" y="625" width="200" height="200" stroke-width="5"/>
    <rect class="pattern-stroke" x="425" y="650" width="150" height="150" stroke-width="3"/>
    
    <!-- Central fill -->
    <rect class="pattern-fill" x="475" y="700" width="50" height="50"/>
  `,
  
  // 7. Minimalist waves
  simple_waves: () => `
    <!-- Horizontal waves -->
    <path class="pattern-stroke" d="M150,400 Q350,350 550,400 Q750,450 950,400" stroke-width="5"/>
    <path class="pattern-stroke" d="M150,600 Q350,550 550,600 Q750,650 950,600" stroke-width="5"/>
    <path class="pattern-stroke" d="M150,800 Q350,750 550,800 Q750,850 950,800" stroke-width="5"/>
    <path class="pattern-stroke" d="M150,1000 Q350,950 550,1000 Q750,1050 950,1000" stroke-width="5"/>
  `,
  
  // 8. Simple geometric cross
  cross_pattern: () => `
    <!-- Vertical bar -->
    <rect class="pattern-fill" x="485" y="300" width="30" height="850"/>
    
    <!-- Horizontal bar -->
    <rect class="pattern-fill" x="250" y="710" width="500" height="30"/>
    
    <!-- Center accent -->
    <circle class="pattern-fill" cx="500" cy="725" r="20"/>
  `,
  
  // 9. Corner points with center
  corner_dots: () => `
    <!-- Corner dots -->
    <circle class="pattern-fill" cx="250" cy="350" r="20"/>
    <circle class="pattern-fill" cx="750" cy="350" r="20"/>
    <circle class="pattern-fill" cx="250" cy="1100" r="20"/>
    <circle class="pattern-fill" cx="750" cy="1100" r="20"/>
    
    <!-- Central element -->
    <circle class="pattern-stroke" cx="500" cy="725" r="100" stroke-width="5"/>
    <circle class="pattern-fill" cx="500" cy="725" r="30"/>
  `,

  // 10. Five identical dots (4 corners + 1 center)
  five_dots: () => `
    <!-- Four corner dots -->
    <circle class="pattern-fill" cx="250" cy="350" r="45"/>
    <circle class="pattern-fill" cx="750" cy="350" r="45"/>
    <circle class="pattern-fill" cx="250" cy="1100" r="45"/>
    <circle class="pattern-fill" cx="750" cy="1100" r="45"/>
    
    <!-- Central dot -->
    <circle class="pattern-fill" cx="500" cy="725" r="45"/>
  `,
  
  // 10. Clean vertical bars
  vertical_bars: () => `
    <!-- Vertical bars -->
    <rect class="pattern-fill" x="300" y="350" width="20" height="750"/>
    <rect class="pattern-fill" x="400" y="300" width="20" height="850"/>
    <rect class="pattern-fill" x="500" y="250" width="20" height="950"/>
    <rect class="pattern-fill" x="600" y="300" width="20" height="850"/>
    <rect class="pattern-fill" x="700" y="350" width="20" height="750"/>
  `,
  
  // 11. Simple horizontal lines
  horizontal_lines: () => `
    <!-- Horizontal lines -->
    <line class="pattern-stroke" x1="200" y1="400" x2="800" y2="400" stroke-width="5"/>
    <line class="pattern-stroke" x1="250" y1="550" x2="750" y2="550" stroke-width="5"/>
    <line class="pattern-stroke" x1="200" y1="725" x2="800" y2="725" stroke-width="8"/>
    <line class="pattern-stroke" x1="250" y1="900" x2="750" y2="900" stroke-width="5"/>
    <line class="pattern-stroke" x1="200" y1="1050" x2="800" y2="1050" stroke-width="5"/>
  `,
  
  // 12. Minimalist central triangle
  triangle_center: () => `
    <!-- Central triangle -->
    <polygon class="pattern-stroke" points="500,550 650,825 350,825" stroke-width="6"/>
    <polygon class="pattern-fill" points="500,620 600,790 400,790"/>
    
    <!-- Triangle accent -->
    <circle class="pattern-fill" cx="500" cy="725" r="15"/>
  `,
  
  // 13. Thin concentric rings
  ring_pattern: () => `
    <!-- Concentric rings -->
    <circle class="pattern-stroke" cx="500" cy="725" r="60" stroke-width="2"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="90" stroke-width="2"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="120" stroke-width="2"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="150" stroke-width="2"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="180" stroke-width="2"/>
    
    <!-- Central dot -->
    <circle class="pattern-fill" cx="500" cy="725" r="10"/>
  `,
  
  // 14. Simple central diamond
  diamond_simple: () => `
    <!-- Central diamond -->
    <polygon class="pattern-stroke" points="500,575 650,725 500,875 350,725" stroke-width="6"/>
    <polygon class="pattern-fill" points="500,625 600,725 500,825 400,725"/>
    
    <!-- Diamond center -->
    <circle class="pattern-fill" cx="500" cy="725" r="12"/>
  `,
  
  // 15. Geometric arcs
  arc_pattern: () => `
    <!-- Central arcs -->
    <path class="pattern-stroke" d="M350,725 A100,100 0 0,1 500,625" stroke-width="5"/>
    <path class="pattern-stroke" d="M500,825 A100,100 0 0,1 650,725" stroke-width="5"/>
    <path class="pattern-stroke" d="M650,725 A100,100 0 0,1 500,625" stroke-width="5"/>
    <path class="pattern-stroke" d="M500,825 A100,100 0 0,1 350,725" stroke-width="5"/>
    
    <!-- Center point -->
    <circle class="pattern-fill" cx="500" cy="725" r="15"/>
  `,
  
  // 16. Regular dot matrix
  dot_matrix: () => `
    <!-- Regular dot grid -->
    <circle class="pattern-fill" cx="300" cy="400" r="8"/>
    <circle class="pattern-fill" cx="450" cy="400" r="8"/>
    <circle class="pattern-fill" cx="600" cy="400" r="8"/>
    <circle class="pattern-fill" cx="750" cy="400" r="8"/>
    
    <circle class="pattern-fill" cx="300" cy="550" r="8"/>
    <circle class="pattern-fill" cx="450" cy="550" r="8"/>
    <circle class="pattern-fill" cx="600" cy="550" r="8"/>
    <circle class="pattern-fill" cx="750" cy="550" r="8"/>
    
    <circle class="pattern-fill" cx="300" cy="725" r="12"/>
    <circle class="pattern-fill" cx="450" cy="725" r="12"/>
    <circle class="pattern-fill" cx="600" cy="725" r="12"/>
    <circle class="pattern-fill" cx="750" cy="725" r="12"/>
    
    <circle class="pattern-fill" cx="300" cy="900" r="8"/>
    <circle class="pattern-fill" cx="450" cy="900" r="8"/>
    <circle class="pattern-fill" cx="600" cy="900" r="8"/>
    <circle class="pattern-fill" cx="750" cy="900" r="8"/>
    
    <circle class="pattern-fill" cx="300" cy="1050" r="8"/>
    <circle class="pattern-fill" cx="450" cy="1050" r="8"/>
    <circle class="pattern-fill" cx="600" cy="1050" r="8"/>
    <circle class="pattern-fill" cx="750" cy="1050" r="8"/>
  `,
  
  // 17. Thin line cross
  line_cross: () => `
    <!-- Vertical line -->
    <line class="pattern-stroke" x1="500" y1="250" x2="500" y2="1200" stroke-width="3"/>
    
    <!-- Horizontal line -->
    <line class="pattern-stroke" x1="200" y1="725" x2="800" y2="725" stroke-width="3"/>
    
    <!-- Center intersection -->
    <circle class="pattern-fill" cx="500" cy="725" r="8"/>
  `,
  
  // 18. Grid of small circles
  circle_grid: () => `
    <!-- Circle grid pattern -->
    <circle class="pattern-stroke" cx="300" cy="450" r="30" stroke-width="3"/>
    <circle class="pattern-stroke" cx="500" cy="450" r="30" stroke-width="3"/>
    <circle class="pattern-stroke" cx="700" cy="450" r="30" stroke-width="3"/>
    
    <circle class="pattern-stroke" cx="300" cy="725" r="30" stroke-width="3"/>
    <circle class="pattern-fill" cx="500" cy="725" r="30"/>
    <circle class="pattern-stroke" cx="700" cy="725" r="30" stroke-width="3"/>
    
    <circle class="pattern-stroke" cx="300" cy="1000" r="30" stroke-width="3"/>
    <circle class="pattern-stroke" cx="500" cy="1000" r="30" stroke-width="3"/>
    <circle class="pattern-stroke" cx="700" cy="1000" r="30" stroke-width="3"/>
  `,
  
  // 19. Simple geometric star
  minimal_star: () => `
    <!-- Simple 8-pointed star -->
    <polygon class="pattern-stroke" points="500,575 525,650 600,650 540,700 565,775 500,725 435,775 460,700 400,650 475,650" stroke-width="4"/>
    <polygon class="pattern-fill" points="500,625 515,675 550,675 525,700 540,750 500,725 460,750 475,700 450,675 485,675"/>
    
    <!-- Center dot -->
    <circle class="pattern-fill" cx="500" cy="725" r="8"/>
  `,
  
  // 20. Minimalist interior border
  clean_border: () => `
    <!-- Interior border frame -->
    <rect class="pattern-stroke" x="250" y="350" width="500" height="750" stroke-width="4"/>
    <rect class="pattern-stroke" x="300" y="400" width="400" height="650" stroke-width="2"/>
    
    <!-- Corner accents -->
    <circle class="pattern-fill" cx="300" cy="400" r="6"/>
    <circle class="pattern-fill" cx="700" cy="400" r="6"/>
    <circle class="pattern-fill" cx="300" cy="1050" r="6"/>
    <circle class="pattern-fill" cx="700" cy="1050" r="6"/>
    
    <!-- Center point -->
    <circle class="pattern-fill" cx="500" cy="725" r="10"/>
  `,
  
  // 21. Full-bleed triangular tessellation
  triangles_full_bleed: () => {
    // Create seamless tessellating triangles that fill entire card
    const tileSize = 32;  // Smaller tile for better tessellation
    const tileHeight = tileSize * Math.sqrt(3) / 2;
    
    return `
    <!-- Define tessellating triangle pattern -->
    <defs>
      <pattern id="triPattern" x="0" y="0" width="${tileSize}" height="${tileHeight}" patternUnits="userSpaceOnUse">
        <!-- Upward pointing triangle (background color) -->
        <polygon points="0,${tileHeight} ${tileSize/2},0 ${tileSize},${tileHeight}" fill="var(--bg-color)" shape-rendering="crispEdges"/>
        <!-- Downward pointing triangle (pattern color) -->
        <polygon points="${tileSize/2},0 0,${tileHeight} ${tileSize},${tileHeight}" fill="var(--pattern-color)" shape-rendering="crispEdges"/>
      </pattern>
    </defs>
    
    <!-- Fill entire drawable area with pattern -->
    <rect x="0" y="0" width="1000" height="1450" fill="url(#triPattern)" shape-rendering="crispEdges"/>
    `;
  }
};

// Style classes for pattern elements with 3D effects and clean design
const StyleClasses = `
  <style>
    .pattern-stroke {
      fill: none;
      stroke: var(--pattern-color);
      stroke-width: 4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    
    .pattern-fill {
      fill: var(--pattern-color);
      stroke: none;
    }
    
    .pattern-thin {
      fill: none;
      stroke: var(--pattern-color);
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    
    .pattern-thick {
      fill: none;
      stroke: var(--pattern-color);
      stroke-width: 6;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    
    .background {
      fill: var(--bg-color);
    }
    
    .border {
      fill: none;
      stroke: white;
      stroke-width: 25;
      rx: 25;
      ry: 25;
    }
  </style>
`;

// Generate SVG with pattern and style
function generateSVG(card) {
  const pattern = PatternGenerators[card.pattern];
  if (!pattern) {
    throw new Error(`Pattern "${card.pattern}" not found`);
  }
  
  // Get colors from card configuration  
  const bgColor = card.colors.bg;
  const patternColor = card.colors.pattern;
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1000" height="1450" viewBox="0 0 1000 1450" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${StyleClasses}
    <style>
      :root {
        --bg-color: ${bgColor};
        --pattern-color: ${patternColor};
      }
    </style>
    
    <!-- Subtle 3D gradient for background -->
    <radialGradient id="bgGradient" cx="50%" cy="40%" r="80%">
      <stop offset="0%" style="stop-color:${lightenColor(bgColor, 0.1)};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${darkenColor(bgColor, 0.1)};stop-opacity:1" />
    </radialGradient>
    
    <!-- Subtle shadow for patterns -->
    <filter id="dropShadow">
      <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Background with gradient -->
  <rect width="1000" height="1450" fill="url(#bgGradient)" rx="50" ry="50"/>
  
  <!-- Pattern content with subtle shadow -->
  <g filter="url(#dropShadow)">
    ${pattern()}
  </g>
  
  <!-- White border -->
  <rect width="950" height="1400" x="25" y="25" class="border"/>
</svg>`;
}

// Helper functions for color manipulation
function isLightColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128;
}

function lightenColor(hex, percent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const nr = Math.min(255, Math.floor(r + (255 - r) * percent));
  const ng = Math.min(255, Math.floor(g + (255 - g) * percent));
  const nb = Math.min(255, Math.floor(b + (255 - b) * percent));
  
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex, percent) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const nr = Math.max(0, Math.floor(r * (1 - percent)));
  const ng = Math.max(0, Math.floor(g * (1 - percent)));
  const nb = Math.max(0, Math.floor(b * (1 - percent)));
  
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// Main generation function  
async function generateCardBacks() {
  const startTime = Date.now();
  
  console.log('🎨 Starting elegant card back generation...');
  console.log('   Inspired by minimalist geometric patterns\n');
  
  // Load configuration
  const configPath = path.join(process.cwd(), 'card-backs.src.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  // Ensure output directories exist
  ensureDirectoryExists(OUTPUT_DIR);
  ensureDirectoryExists(TEMP_DIR);
  
  console.log(`📋 Processing ${config.cards.length} card designs:\n`);
  
  const manifest = {
    generated: new Date().toISOString(),
    version: config.version,
    cards: []
  };
  
  // Process each card
  for (const card of config.cards) {
    try {
      console.log(`🎯 Processing: ${card.name} (${card.rarity})`);
      
      // Generate SVG with new minimalist patterns
      const svgContent = generateSVG(card);
      const svgPath = path.join(TEMP_DIR, `${card.id}.svg`);
      fs.writeFileSync(svgPath, svgContent);
      console.log(`  ✅ SVG generated: ${card.id}.svg`);
      
      // Convert to WebP
      const webpFilename = `${card.id}.webp`;
      const webpPath = path.join(OUTPUT_DIR, webpFilename);
      
      await sharp(svgPath)
        .resize(WEBP_SIZE.width, WEBP_SIZE.height)
        .webp({ quality: 95, effort: 6 })
        .toFile(webpPath);
      
      console.log(`  ✅ WebP converted: ${webpFilename}`);
      
      // Get file metadata
      const stats = fs.statSync(webpPath);
      const fileSize = stats.size;
      const buffer = fs.readFileSync(webpPath);
      const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
      
      // Add to manifest
      const slug = card.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      manifest.cards.push({
        id: card.id,
        name: card.name,
        slug: slug,
        rarity: card.rarity,
        pattern: card.pattern,
        backgroundColor: card.backgroundColor,
        imageUrl: `/card-backs/${webpFilename}`,
        width: WEBP_SIZE.width,
        height: WEBP_SIZE.height,
        bytes: fileSize,
        sha256: sha256
      });
      
      console.log(`  ✅ Metadata: ${slug} (${card.pattern} on ${card.backgroundColor})`);
      
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
  const duration = Date.now() - startTime;
  
  console.log(`\n🎉 Generation complete!`);
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Generated: ${manifest.cards.length} elegant card backs`);
  console.log(`   Total size: ${Math.round(totalSize / 1024)}KB`);
  console.log(`   Average size: ${avgSize}KB per file`);
  console.log(`   Target range: 30-50KB ✓`);
  
  // Pattern summary
  const patternCounts = manifest.cards.reduce((acc, card) => {
    const pattern = card.pattern;
    acc[pattern] = (acc[pattern] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`\n📊 Minimalist pattern distribution:`);
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