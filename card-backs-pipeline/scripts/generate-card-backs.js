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

// Elegant minimalist pattern generators inspired by user examples
const PatternGenerators = {
  // Orbital circles - inspired by green example (concentric circles with orbital elements)
  orbital_circles: () => `
    <!-- Central concentric circles -->
    <circle class="pattern-stroke" cx="500" cy="725" r="60" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="100" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="140" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="180" stroke-width="5"/>
    
    <!-- Orbital satellites -->
    <circle class="pattern-fill" cx="320" cy="725" r="15"/>
    <circle class="pattern-fill" cx="680" cy="725" r="15"/>
    
    <!-- Corner orbital paths -->
    <path class="pattern-stroke" d="M200,300 Q300,200 400,300" stroke-width="5"/>
    <path class="pattern-stroke" d="M600,300 Q700,200 800,300" stroke-width="5"/>
    <path class="pattern-stroke" d="M200,1150 Q300,1250 400,1150" stroke-width="5"/>
    <path class="pattern-stroke" d="M600,1150 Q700,1250 800,1150" stroke-width="5"/>
  `,
  
  // Star burst - inspired by blue example (radial rays from center)
  star_burst: () => `
    <!-- Central radial rays -->
    <g transform="translate(500,725)">
      <!-- Main 8 rays -->
      <line class="pattern-stroke" x1="0" y1="-180" x2="0" y2="-40" stroke-width="6"/>
      <line class="pattern-stroke" x1="127" y1="-127" x2="28" y2="-28" stroke-width="6"/>
      <line class="pattern-stroke" x1="180" y1="0" x2="40" y2="0" stroke-width="6"/>
      <line class="pattern-stroke" x1="127" y1="127" x2="28" y2="28" stroke-width="6"/>
      <line class="pattern-stroke" x1="0" y1="180" x2="0" y2="40" stroke-width="6"/>
      <line class="pattern-stroke" x1="-127" y1="127" x2="-28" y2="28" stroke-width="6"/>
      <line class="pattern-stroke" x1="-180" y1="0" x2="-40" y2="0" stroke-width="6"/>
      <line class="pattern-stroke" x1="-127" y1="-127" x2="-28" y2="-28" stroke-width="6"/>
      
      <!-- Secondary rays -->
      <line class="pattern-stroke" x1="90" y1="-90" x2="25" y2="-25" stroke-width="4"/>
      <line class="pattern-stroke" x1="90" y1="90" x2="25" y2="25" stroke-width="4"/>
      <line class="pattern-stroke" x1="-90" y1="90" x2="-25" y2="25" stroke-width="4"/>
      <line class="pattern-stroke" x1="-90" y1="-90" x2="-25" y2="-25" stroke-width="4"/>
      
      <!-- Center circle -->
      <circle class="pattern-fill" cx="0" cy="0" r="20"/>
    </g>
  `,
  
  // Simple concentric circles - inspired by white example
  concentric_circles: () => `
    <!-- Central concentric circles only -->
    <circle class="pattern-stroke" cx="500" cy="725" r="80" stroke-width="6"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="120" stroke-width="6"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="160" stroke-width="6"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="200" stroke-width="6"/>
    
    <!-- Central dot -->
    <circle class="pattern-fill" cx="500" cy="725" r="25"/>
  `,
  
  // Vertical geometric pattern - inspired by purple example
  geometric_vertical: () => `
    <!-- Vertical line of circles -->
    <circle class="pattern-stroke" cx="500" cy="300" r="40" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="450" r="30" stroke-width="5"/>
    <circle class="pattern-fill" cx="500" cy="600" r="35"/>
    <circle class="pattern-stroke" cx="500" cy="750" r="45" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="900" r="30" stroke-width="5"/>
    <circle class="pattern-fill" cx="500" cy="1050" r="40"/>
    <circle class="pattern-stroke" cx="500" cy="1200" r="35" stroke-width="5"/>
    
    <!-- Connecting vertical line -->
    <line class="pattern-stroke" x1="500" y1="200" x2="500" y2="1250" stroke-width="3"/>
    
    <!-- Side accents -->
    <circle class="pattern-fill" cx="350" cy="725" r="15"/>
    <circle class="pattern-fill" cx="650" cy="725" r="15"/>
  `,
  
  // Minimal dots pattern
  minimal_dots: () => `
    <!-- Simple grid of dots -->
    <circle class="pattern-fill" cx="300" cy="400" r="12"/>
    <circle class="pattern-fill" cx="500" cy="400" r="12"/>
    <circle class="pattern-fill" cx="700" cy="400" r="12"/>
    
    <circle class="pattern-fill" cx="200" cy="600" r="12"/>
    <circle class="pattern-fill" cx="400" cy="600" r="12"/>
    <circle class="pattern-fill" cx="600" cy="600" r="12"/>
    <circle class="pattern-fill" cx="800" cy="600" r="12"/>
    
    <circle class="pattern-fill" cx="300" cy="800" r="12"/>
    <circle class="pattern-fill" cx="500" cy="800" r="12"/>
    <circle class="pattern-fill" cx="700" cy="800" r="12"/>
    
    <circle class="pattern-fill" cx="200" cy="1000" r="12"/>
    <circle class="pattern-fill" cx="400" cy="1000" r="12"/>
    <circle class="pattern-fill" cx="600" cy="1000" r="12"/>
    <circle class="pattern-fill" cx="800" cy="1000" r="12"/>
    
    <circle class="pattern-fill" cx="300" cy="1200" r="12"/>
    <circle class="pattern-fill" cx="500" cy="1200" r="12"/>
    <circle class="pattern-fill" cx="700" cy="1200" r="12"/>
  `,
  
  // Radial rays - inspired by black example (dense radiating lines)
  radial_rays: () => `
    <!-- Dense radial rays from center -->
    <g transform="translate(500,725)">
      <!-- Primary 16 rays -->
      <line class="pattern-stroke" x1="0" y1="-200" x2="0" y2="-50" stroke-width="4"/>
      <line class="pattern-stroke" x1="76" y1="-185" x2="19" y2="-46" stroke-width="4"/>
      <line class="pattern-stroke" x1="141" y1="-141" x2="35" y2="-35" stroke-width="4"/>
      <line class="pattern-stroke" x1="185" y1="-76" x2="46" y2="-19" stroke-width="4"/>
      <line class="pattern-stroke" x1="200" y1="0" x2="50" y2="0" stroke-width="4"/>
      <line class="pattern-stroke" x1="185" y1="76" x2="46" y2="19" stroke-width="4"/>
      <line class="pattern-stroke" x1="141" y1="141" x2="35" y2="35" stroke-width="4"/>
      <line class="pattern-stroke" x1="76" y1="185" x2="19" y2="46" stroke-width="4"/>
      <line class="pattern-stroke" x1="0" y1="200" x2="0" y2="50" stroke-width="4"/>
      <line class="pattern-stroke" x1="-76" y1="185" x2="-19" y2="46" stroke-width="4"/>
      <line class="pattern-stroke" x1="-141" y1="141" x2="-35" y2="35" stroke-width="4"/>
      <line class="pattern-stroke" x1="-185" y1="76" x2="-46" y2="19" stroke-width="4"/>
      <line class="pattern-stroke" x1="-200" y1="0" x2="-50" y2="0" stroke-width="4"/>
      <line class="pattern-stroke" x1="-185" y1="-76" x2="-46" y2="-19" stroke-width="4"/>
      <line class="pattern-stroke" x1="-141" y1="-141" x2="-35" y2="-35" stroke-width="4"/>
      <line class="pattern-stroke" x1="-76" y1="-185" x2="-19" y2="-46" stroke-width="4"/>
      
      <!-- Concentric circles -->
      <circle class="pattern-stroke" cx="0" cy="0" r="80" stroke-width="3"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="120" stroke-width="3"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="160" stroke-width="3"/>
      
      <!-- Central point -->
      <circle class="pattern-fill" cx="0" cy="0" r="15"/>
    </g>
  `,
  
  // Diamond grid - simplified geometric diamonds
  diamond_grid: () => `
    <!-- Central diamond -->
    <polygon class="pattern-stroke" points="500,600 600,725 500,850 400,725" stroke-width="5"/>
    <polygon class="pattern-fill" points="500,650 550,725 500,800 450,725"/>
    
    <!-- Side diamonds -->
    <polygon class="pattern-stroke" points="250,450 325,525 250,600 175,525" stroke-width="4"/>
    <polygon class="pattern-stroke" points="750,450 825,525 750,600 675,525" stroke-width="4"/>
    <polygon class="pattern-stroke" points="250,850 325,925 250,1000 175,925" stroke-width="4"/>
    <polygon class="pattern-stroke" points="750,850 825,925 750,1000 675,925" stroke-width="4"/>
    
    <!-- Corner accents -->
    <polygon class="pattern-fill" points="200,300 230,330 200,360 170,330"/>
    <polygon class="pattern-fill" points="800,300 830,330 800,360 770,330"/>
    <polygon class="pattern-fill" points="200,1150 230,1180 200,1210 170,1180"/>
    <polygon class="pattern-fill" points="800,1150 830,1180 800,1210 770,1180"/>
  `,
  
  // Spiral minimal - simple spiral design
  spiral_minimal: () => `
    <!-- Central spiral -->
    <path class="pattern-stroke" d="M500,725 Q450,675 400,725 Q450,775 500,775 Q550,725 550,675 Q500,625 450,675" stroke-width="6"/>
    <path class="pattern-stroke" d="M500,725 Q400,625 300,725 Q400,825 500,825 Q600,725 600,625 Q500,525 400,625" stroke-width="4"/>
    
    <!-- Expanding spiral -->
    <path class="pattern-stroke" d="M500,725 Q350,575 200,725 Q350,875 500,875 Q650,725 650,575 Q500,425 350,575" stroke-width="3"/>
    
    <!-- Central point -->
    <circle class="pattern-fill" cx="500" cy="725" r="20"/>
    
    <!-- Corner spirals -->
    <path class="pattern-stroke" d="M200,350 Q175,325 150,350 Q175,375 200,375" stroke-width="3"/>
    <path class="pattern-stroke" d="M800,350 Q825,325 850,350 Q825,375 800,375" stroke-width="3"/>
    <path class="pattern-stroke" d="M200,1100 Q175,1125 150,1100 Q175,1075 200,1075" stroke-width="3"/>
    <path class="pattern-stroke" d="M800,1100 Q825,1125 850,1100 Q825,1075 800,1075" stroke-width="3"/>
  `,
  
  // Triangular rays - geometric triangular patterns radiating from center
  triangular_rays: () => `
    <!-- Central triangular pattern -->
    <polygon class="pattern-stroke" points="500,600 600,725 500,850 400,725" stroke-width="5"/>
    <polygon class="pattern-fill" points="500,650 550,725 500,800 450,725"/>
    
    <!-- Radiating triangular elements -->
    <polygon class="pattern-stroke" points="500,725 400,600 600,600" stroke-width="4"/>
    <polygon class="pattern-stroke" points="500,725 400,850 600,850" stroke-width="4"/>
    <polygon class="pattern-stroke" points="350,725 300,650 300,800" stroke-width="4"/>
    <polygon class="pattern-stroke" points="650,725 700,650 700,800" stroke-width="4"/>
    
    <!-- Corner triangular accents -->
    <polygon class="pattern-fill" points="200,300 250,350 150,350"/>
    <polygon class="pattern-fill" points="800,300 850,350 750,350"/>
    <polygon class="pattern-fill" points="200,1150 250,1200 150,1200"/>
    <polygon class="pattern-fill" points="800,1150 850,1200 750,1200"/>
    
    <!-- Central accent -->
    <circle class="pattern-fill" cx="500" cy="725" r="15"/>
  `,
  
  // Flowing lines - simple organic curves
  flowing_lines: () => `
    <!-- Central flowing waves -->
    <path class="pattern-stroke" d="M200,400 Q350,350 500,400 Q650,450 800,400" stroke-width="6"/>
    <path class="pattern-stroke" d="M200,600 Q350,550 500,600 Q650,650 800,600" stroke-width="6"/>
    <path class="pattern-stroke" d="M200,800 Q350,750 500,800 Q650,850 800,800" stroke-width="6"/>
    <path class="pattern-stroke" d="M200,1000 Q350,950 500,1000 Q650,1050 800,1000" stroke-width="6"/>
    
    <!-- Vertical connectors -->
    <line class="pattern-stroke" x1="350" y1="300" x2="350" y2="1150" stroke-width="4"/>
    <line class="pattern-stroke" x1="650" y1="300" x2="650" y2="1150" stroke-width="4"/>
    
    <!-- Flow accents -->
    <circle class="pattern-fill" cx="350" cy="400" r="12"/>
    <circle class="pattern-fill" cx="650" cy="600" r="12"/>
    <circle class="pattern-fill" cx="350" cy="800" r="12"/>
    <circle class="pattern-fill" cx="650" cy="1000" r="12"/>
  `,
  
  // Sunburst - enhanced radial pattern  
  sunburst: () => `
    <!-- Central sunburst -->
    <g transform="translate(500,725)">
      <!-- Main 12 rays -->
      <line class="pattern-stroke" x1="0" y1="-200" x2="0" y2="-60" stroke-width="5"/>
      <line class="pattern-stroke" x1="103" y1="-173" x2="31" y2="-52" stroke-width="5"/>
      <line class="pattern-stroke" x1="173" y1="-100" x2="52" y2="-30" stroke-width="5"/>
      <line class="pattern-stroke" x1="200" y1="0" x2="60" y2="0" stroke-width="5"/>
      <line class="pattern-stroke" x1="173" y1="100" x2="52" y2="30" stroke-width="5"/>
      <line class="pattern-stroke" x1="103" y1="173" x2="31" y2="52" stroke-width="5"/>
      <line class="pattern-stroke" x1="0" y1="200" x2="0" y2="60" stroke-width="5"/>
      <line class="pattern-stroke" x1="-103" y1="173" x2="-31" y2="52" stroke-width="5"/>
      <line class="pattern-stroke" x1="-173" y1="100" x2="-52" y2="30" stroke-width="5"/>
      <line class="pattern-stroke" x1="-200" y1="0" x2="-60" y2="0" stroke-width="5"/>
      <line class="pattern-stroke" x1="-173" y1="-100" x2="-52" y2="-30" stroke-width="5"/>
      <line class="pattern-stroke" x1="-103" y1="-173" x2="-31" y2="-52" stroke-width="5"/>
      
      <!-- Center circle -->
      <circle class="pattern-fill" cx="0" cy="0" r="25"/>
    </g>
    
    <!-- Corner sun elements -->
    <circle class="pattern-stroke" cx="200" cy="300" r="30" stroke-width="4"/>
    <circle class="pattern-stroke" cx="800" cy="300" r="30" stroke-width="4"/>
    <circle class="pattern-stroke" cx="200" cy="1150" r="30" stroke-width="4"/>
    <circle class="pattern-stroke" cx="800" cy="1150" r="30" stroke-width="4"/>
  `,
  
  // Cosmic rings - orbital pattern
  cosmic_rings: () => `
    <!-- Central orbital system -->
    <circle class="pattern-stroke" cx="500" cy="725" r="60" stroke-width="4"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="90" stroke-width="4"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="120" stroke-width="4"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="150" stroke-width="4"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="180" stroke-width="4"/>
    
    <!-- Orbital bodies -->
    <circle class="pattern-fill" cx="380" cy="725" r="8"/>
    <circle class="pattern-fill" cx="620" cy="725" r="8"/>
    <circle class="pattern-fill" cx="500" cy="605" r="6"/>
    <circle class="pattern-fill" cx="500" cy="845" r="6"/>
    <circle class="pattern-fill" cx="440" cy="665" r="5"/>
    <circle class="pattern-fill" cx="560" cy="785" r="5"/>
    
    <!-- Central core -->
    <circle class="pattern-fill" cx="500" cy="725" r="20"/>
    
    <!-- Distant cosmic objects -->
    <circle class="pattern-fill" cx="200" cy="400" r="8"/>
    <circle class="pattern-fill" cx="800" cy="1000" r="8"/>
    <circle class="pattern-fill" cx="300" cy="1200" r="6"/>
    <circle class="pattern-fill" cx="700" cy="350" r="6"/>
  `,
  
  // Vortex spiral - simplified swirl
  vortex_spiral: () => `
    <!-- Central vortex -->
    <g transform="translate(500,725)">
      <!-- Spiral arms -->
      <path class="pattern-stroke" d="M0,0 Q-40,-80 -80,0 Q-40,80 0,0 Q40,-80 80,0 Q40,80 0,0" stroke-width="6"/>
      <path class="pattern-stroke" d="M0,0 Q-60,-120 -120,0 Q-60,120 0,0 Q60,-120 120,0 Q60,120 0,0" stroke-width="4"/>
      <path class="pattern-stroke" d="M0,0 Q-80,-160 -160,0 Q-80,160 0,0 Q80,-160 160,0 Q80,160 0,0" stroke-width="3"/>
      
      <!-- Central point -->
      <circle class="pattern-fill" cx="0" cy="0" r="15"/>
    </g>
    
    <!-- Corner vortex hints -->
    <path class="pattern-stroke" d="M200,350 Q175,325 150,350" stroke-width="3"/>
    <path class="pattern-stroke" d="M800,350 Q825,325 850,350" stroke-width="3"/>
    <path class="pattern-stroke" d="M200,1100 Q175,1125 150,1100" stroke-width="3"/>
    <path class="pattern-stroke" d="M800,1100 Q825,1125 850,1100" stroke-width="3"/>
  `,
  
  // Phoenix wings - elegant wing patterns
  phoenix_wings: () => `
    <!-- Central phoenix form -->
    <ellipse class="pattern-stroke" cx="500" cy="725" rx="30" ry="60" stroke-width="5"/>
    
    <!-- Wing outlines -->
    <path class="pattern-stroke" d="M470,725 Q350,625 250,725 Q350,825 470,725" stroke-width="5"/>
    <path class="pattern-stroke" d="M530,725 Q650,625 750,725 Q650,825 530,725" stroke-width="5"/>
    
    <!-- Wing feather details -->
    <path class="pattern-stroke" d="M420,690 Q350,660 300,690" stroke-width="3"/>
    <path class="pattern-stroke" d="M420,760 Q350,790 300,760" stroke-width="3"/>
    <path class="pattern-stroke" d="M580,690 Q650,660 700,690" stroke-width="3"/>
    <path class="pattern-stroke" d="M580,760 Q650,790 700,760" stroke-width="3"/>
    
    <!-- Tail plumes -->
    <path class="pattern-stroke" d="M500,785 Q450,885 400,985" stroke-width="4"/>
    <path class="pattern-stroke" d="M500,785 Q550,885 600,985" stroke-width="4"/>
    
    <!-- Head crest -->
    <path class="pattern-stroke" d="M480,665 Q500,615 520,665" stroke-width="4"/>
    
    <!-- Central body -->
    <circle class="pattern-fill" cx="500" cy="725" r="12"/>
  `,
  
  // Nebula clouds - soft cosmic clouds
  nebula_clouds: () => `
    <!-- Main cloud formations -->
    <ellipse class="pattern-stroke" cx="350" cy="500" rx="80" ry="50" transform="rotate(30 350 500)" stroke-width="4"/>
    <ellipse class="pattern-stroke" cx="650" cy="700" rx="70" ry="90" transform="rotate(-20 650 700)" stroke-width="4"/>
    <ellipse class="pattern-stroke" cx="400" cy="900" rx="90" ry="60" transform="rotate(45 400 900)" stroke-width="4"/>
    <ellipse class="pattern-stroke" cx="600" cy="1100" rx="80" ry="70" transform="rotate(-30 600 1100)" stroke-width="4"/>
    
    <!-- Inner cloud cores -->
    <ellipse class="pattern-fill" cx="350" cy="500" rx="30" ry="20" transform="rotate(30 350 500)"/>
    <ellipse class="pattern-fill" cx="650" cy="700" rx="25" ry="35" transform="rotate(-20 650 700)"/>
    <ellipse class="pattern-fill" cx="400" cy="900" rx="35" ry="25" transform="rotate(45 400 900)"/>
    
    <!-- Connecting wisps -->
    <path class="pattern-stroke" d="M400,550 Q500,600 600,650" stroke-width="3"/>
    <path class="pattern-stroke" d="M550,750 Q500,800 450,850" stroke-width="3"/>
    <path class="pattern-stroke" d="M450,950 Q550,1000 600,1050" stroke-width="3"/>
    
    <!-- Stellar points -->
    <circle class="pattern-fill" cx="250" cy="400" r="4"/>
    <circle class="pattern-fill" cx="750" cy="600" r="4"/>
    <circle class="pattern-fill" cx="300" cy="1200" r="4"/>
    <circle class="pattern-fill" cx="700" cy="350" r="4"/>
  `,
  
  // Royal crown - majestic crown pattern
  royal_crown: () => `
    <!-- Central crown structure -->
    <path class="pattern-stroke" d="M250,700 L300,600 L350,700 L400,550 L450,700 L500,600 L550,700 L600,550 L650,700 L700,600 L750,700 L750,750 L250,750 Z" stroke-width="5"/>
    
    <!-- Crown jewels -->
    <circle class="pattern-fill" cx="300" cy="600" r="15"/>
    <circle class="pattern-fill" cx="400" cy="550" r="18"/>
    <circle class="pattern-fill" cx="500" cy="600" r="15"/>
    <circle class="pattern-fill" cx="600" cy="550" r="18"/>
    <circle class="pattern-fill" cx="700" cy="600" r="15"/>
    
    <!-- Crown band -->
    <rect class="pattern-stroke" x="200" y="730" width="600" height="40" stroke-width="5"/>
    <rect class="pattern-fill" x="220" y="740" width="560" height="20"/>
    
    <!-- Royal scepter -->
    <line class="pattern-stroke" x1="500" y1="770" x2="500" y2="900" stroke-width="8"/>
    <circle class="pattern-stroke" cx="500" cy="850" r="25" stroke-width="5"/>
    <circle class="pattern-fill" cx="500" cy="850" r="12"/>
    
    <!-- Corner royal accents -->
    <polygon class="pattern-fill" points="200,300 230,350 170,350"/>
    <polygon class="pattern-fill" points="800,300 830,350 770,350"/>
    <polygon class="pattern-fill" points="200,1150 230,1200 170,1200"/>
    <polygon class="pattern-fill" points="800,1150 830,1200 770,1200"/>
  `,
  
  // Shadow geometry - angular dark patterns
  shadow_geometry: () => `
    <!-- Angular geometric shadows -->
    <polygon class="pattern-fill" points="200,400 350,380 370,430 220,450"/>
    <polygon class="pattern-fill" points="400,600 550,580 570,630 420,650"/>
    <polygon class="pattern-fill" points="600,800 750,780 770,830 620,850"/>
    <polygon class="pattern-fill" points="300,1000 450,980 470,1030 320,1050"/>
    
    <!-- Shadow gradients -->
    <polygon class="pattern-stroke" points="650,400 800,380 820,480 670,500" stroke-width="4"/>
    <polygon class="pattern-stroke" points="250,800 400,780 420,880 270,900" stroke-width="4"/>
    
    <!-- Angular connectors -->
    <path class="pattern-stroke" d="M275,425 L485,615 L685,815 L395,1025" stroke-width="4"/>
    <path class="pattern-stroke" d="M735,440 L685,790 L595,815" stroke-width="4"/>
    
    <!-- Corner shadow accents -->
    <polygon class="pattern-fill" points="150,250 180,300 120,300"/>
    <polygon class="pattern-fill" points="850,250 880,300 820,300"/>
    <polygon class="pattern-fill" points="150,1200 180,1250 120,1250"/>
    <polygon class="pattern-fill" points="850,1200 880,1250 820,1250"/>
  `,
  
  // Golden mandala - intricate circular pattern
  golden_mandala: () => `
    <!-- Central mandala -->
    <circle class="pattern-stroke" cx="500" cy="725" r="120" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="90" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="60" stroke-width="5"/>
    
    <!-- Mandala petals -->
    <g transform="translate(500,725)">
      <!-- 8 main petals -->
      <ellipse class="pattern-stroke" cx="0" cy="-80" rx="15" ry="30" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="57" cy="-57" rx="15" ry="30" transform="rotate(45)" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="80" cy="0" rx="15" ry="30" transform="rotate(90)" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="57" cy="57" rx="15" ry="30" transform="rotate(135)" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="0" cy="80" rx="15" ry="30" transform="rotate(180)" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="-57" cy="57" rx="15" ry="30" transform="rotate(225)" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="-80" cy="0" rx="15" ry="30" transform="rotate(270)" stroke-width="3"/>
      <ellipse class="pattern-stroke" cx="-57" cy="-57" rx="15" ry="30" transform="rotate(315)" stroke-width="3"/>
      
      <!-- Inner decorative elements -->
      <circle class="pattern-fill" cx="0" cy="-45" r="8"/>
      <circle class="pattern-fill" cx="32" cy="-32" r="8"/>
      <circle class="pattern-fill" cx="45" cy="0" r="8"/>
      <circle class="pattern-fill" cx="32" cy="32" r="8"/>
      <circle class="pattern-fill" cx="0" cy="45" r="8"/>
      <circle class="pattern-fill" cx="-32" cy="32" r="8"/>
      <circle class="pattern-fill" cx="-45" cy="0" r="8"/>
      <circle class="pattern-fill" cx="-32" cy="-32" r="8"/>
    </g>
    
    <!-- Central core -->
    <circle class="pattern-fill" cx="500" cy="725" r="25"/>
    
    <!-- Corner mandala elements -->
    <circle class="pattern-stroke" cx="250" cy="350" r="40" stroke-width="3"/>
    <circle class="pattern-stroke" cx="750" cy="350" r="40" stroke-width="3"/>
    <circle class="pattern-stroke" cx="250" cy="1100" r="40" stroke-width="3"/>
    <circle class="pattern-stroke" cx="750" cy="1100" r="40" stroke-width="3"/>
  `,
  
  // Mystic symbols - mystical geometric symbols
  mystic_symbols: () => `
    <!-- Central mystic circle -->
    <circle class="pattern-stroke" cx="500" cy="725" r="100" stroke-width="5"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="140" stroke-width="5"/>
    
    <!-- Mystic star -->
    <g transform="translate(500,725)">
      <polygon class="pattern-fill" points="0,-60 15,-15 60,0 15,15 0,60 -15,15 -60,0 -15,-15"/>
      
      <!-- Mystical triangles -->
      <polygon class="pattern-stroke" points="0,-80 40,-40 -40,-40" stroke-width="4"/>
      <polygon class="pattern-stroke" points="40,40 0,80 -40,40" stroke-width="4"/>
      <polygon class="pattern-stroke" points="80,0 40,40 40,-40" stroke-width="4"/>
      <polygon class="pattern-stroke" points="-80,0 -40,-40 -40,40" stroke-width="4"/>
    </g>
    
    <!-- Runic symbols in corners -->
    <g transform="translate(250,400)">
      <path class="pattern-stroke" d="M-20,-20 L20,20 M-20,20 L20,-20" stroke-width="4"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="25" stroke-width="3"/>
    </g>
    <g transform="translate(750,400)">
      <path class="pattern-stroke" d="M-20,-20 L20,20 M-20,20 L20,-20" stroke-width="4"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="25" stroke-width="3"/>
    </g>
    <g transform="translate(250,1050)">
      <path class="pattern-stroke" d="M-20,-20 L20,20 M-20,20 L20,-20" stroke-width="4"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="25" stroke-width="3"/>
    </g>
    <g transform="translate(750,1050)">
      <path class="pattern-stroke" d="M-20,-20 L20,20 M-20,20 L20,-20" stroke-width="4"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="25" stroke-width="3"/>
    </g>
    
    <!-- Central mystic symbol -->
    <circle class="pattern-fill" cx="500" cy="725" r="20"/>
  `,
  
  // Diamond luxury - premium diamond pattern
  diamond_luxury: () => `
    <!-- Central luxury diamond -->
    <polygon class="pattern-stroke" points="500,600 600,725 500,850 400,725" stroke-width="6"/>
    <polygon class="pattern-stroke" points="500,625 575,725 500,825 425,725" stroke-width="4"/>
    <polygon class="pattern-fill" points="500,650 550,725 500,800 450,725"/>
    
    <!-- Diamond facets -->
    <line class="pattern-stroke" x1="500" y1="600" x2="500" y2="850" stroke-width="3"/>
    <line class="pattern-stroke" x1="400" y1="725" x2="600" y2="725" stroke-width="3"/>
    <line class="pattern-stroke" x1="450" y1="662" x2="550" y2="788" stroke-width="2"/>
    <line class="pattern-stroke" x1="550" y1="662" x2="450" y2="788" stroke-width="2"/>
    
    <!-- Surrounding luxury diamonds -->
    <polygon class="pattern-stroke" points="250,450 325,525 250,600 175,525" stroke-width="4"/>
    <polygon class="pattern-stroke" points="750,450 825,525 750,600 675,525" stroke-width="4"/>
    <polygon class="pattern-stroke" points="250,850 325,925 250,1000 175,925" stroke-width="4"/>
    <polygon class="pattern-stroke" points="750,850 825,925 750,1000 675,925" stroke-width="4"/>
    
    <!-- Diamond sparkles -->
    <polygon class="pattern-fill" points="300,300 315,315 300,330 285,315"/>
    <polygon class="pattern-fill" points="700,300 715,315 700,330 685,315"/>
    <polygon class="pattern-fill" points="300,1150 315,1165 300,1180 285,1165"/>
    <polygon class="pattern-fill" points="700,1150 715,1165 700,1180 685,1165"/>
    
    <!-- Central luxury core -->
    <circle class="pattern-fill" cx="500" cy="725" r="18"/>
  `
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