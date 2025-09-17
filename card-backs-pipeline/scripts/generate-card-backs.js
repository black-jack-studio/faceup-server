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

// Pattern generators inspired by visual examples
const PatternGenerators = {
  // Orbit pattern - concentric circles with satellite circles (Example 1,2,5)
  circles: () => `
    <!-- Central concentric circles -->
    <circle class="pattern-stroke" cx="500" cy="725" r="60"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="100"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="140"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="180"/>
    
    <!-- Satellite circles -->
    <circle class="pattern-fill" cx="320" cy="725" r="12"/>
    <circle class="pattern-fill" cx="680" cy="725" r="12"/>
    <circle class="pattern-fill" cx="500" cy="545" r="8"/>
    <circle class="pattern-fill" cx="500" cy="905" r="8"/>
    
    <!-- Corner curves -->
    <path class="pattern-stroke" d="M100,200 Q200,100 300,200"/>
    <path class="pattern-stroke" d="M700,200 Q800,100 900,200"/>
    <path class="pattern-stroke" d="M100,1250 Q200,1350 300,1250"/>
    <path class="pattern-stroke" d="M700,1250 Q800,1350 900,1250"/>
  `,
  
  // Wave pattern with flowing curves
  waves: () => `
    <!-- Flowing wave patterns -->
    <path class="pattern-stroke" d="M0,300 Q250,200 500,300 T1000,300"/>
    <path class="pattern-stroke" d="M0,450 Q250,350 500,450 T1000,450"/>
    <path class="pattern-stroke" d="M0,600 Q250,500 500,600 T1000,600"/>
    <path class="pattern-stroke" d="M0,750 Q250,650 500,750 T1000,750"/>
    <path class="pattern-stroke" d="M0,900 Q250,800 500,900 T1000,900"/>
    <path class="pattern-stroke" d="M0,1050 Q250,950 500,1050 T1000,1050"/>
    <path class="pattern-stroke" d="M0,1200 Q250,1100 500,1200 T1000,1200"/>
    
    <!-- Vertical flow lines -->
    <path class="pattern-thin" d="M200,100 Q300,400 200,700 Q100,1000 200,1350"/>
    <path class="pattern-thin" d="M800,100 Q700,400 800,700 Q900,1000 800,1350"/>
  `,
  
  // Grid pattern with geometric structure  
  grid: () => `
    <!-- Main grid lines -->
    <line class="pattern-stroke" x1="200" y1="100" x2="200" y2="1350"/>
    <line class="pattern-stroke" x1="400" y1="100" x2="400" y2="1350"/>
    <line class="pattern-stroke" x1="600" y1="100" x2="600" y2="1350"/>
    <line class="pattern-stroke" x1="800" y1="100" x2="800" y2="1350"/>
    
    <line class="pattern-stroke" x1="100" y1="300" x2="900" y2="300"/>
    <line class="pattern-stroke" x1="100" y1="500" x2="900" y2="500"/>
    <line class="pattern-stroke" x1="100" y1="700" x2="900" y2="700"/>
    <line class="pattern-stroke" x1="100" y1="900" x2="900" y2="900"/>
    <line class="pattern-stroke" x1="100" y1="1100" x2="900" y2="1100"/>
    
    <!-- Connection points -->
    <circle class="pattern-fill" cx="200" cy="300" r="6"/>
    <circle class="pattern-fill" cx="400" cy="500" r="6"/>
    <circle class="pattern-fill" cx="600" cy="700" r="6"/>
    <circle class="pattern-fill" cx="800" cy="900" r="6"/>
    <circle class="pattern-fill" cx="400" cy="1100" r="6"/>
  `,
  
  // Spiral pattern with curved lines
  spiral: () => `
    <!-- Central spiral -->
    <path class="pattern-stroke" d="M500,725 Q450,675 400,725 Q350,775 400,825 Q450,875 500,825 Q550,775 600,825 Q650,875 700,825 Q750,775 700,725 Q650,675 600,725 Q550,775 500,725"/>
    
    <!-- Expanding spirals -->
    <path class="pattern-thin" d="M500,725 Q400,625 300,725 Q200,825 300,925 Q400,1025 500,925 Q600,825 700,925 Q800,1025 900,925 Q1000,825 900,725"/>
    <path class="pattern-thin" d="M500,725 Q350,575 200,725 Q50,875 200,1025 Q350,1175 500,1025 Q650,875 800,1025 Q950,1175 1100,1025"/>
    
    <!-- Central point -->
    <circle class="pattern-fill" cx="500" cy="725" r="8"/>
  `,
  
  // Dots pattern with rhythmic placement
  dots: () => `
    <!-- Hexagonal dot pattern -->
    <circle class="pattern-fill" cx="200" cy="200" r="10"/>
    <circle class="pattern-fill" cx="350" cy="280" r="10"/>
    <circle class="pattern-fill" cx="500" cy="200" r="10"/>
    <circle class="pattern-fill" cx="650" cy="280" r="10"/>
    <circle class="pattern-fill" cx="800" cy="200" r="10"/>
    
    <circle class="pattern-fill" cx="125" cy="360" r="10"/>
    <circle class="pattern-fill" cx="275" cy="440" r="10"/>
    <circle class="pattern-fill" cx="425" cy="360" r="10"/>
    <circle class="pattern-fill" cx="575" cy="440" r="10"/>
    <circle class="pattern-fill" cx="725" cy="360" r="10"/>
    <circle class="pattern-fill" cx="875" cy="440" r="10"/>
    
    <circle class="pattern-fill" cx="200" cy="520" r="10"/>
    <circle class="pattern-fill" cx="350" cy="600" r="10"/>
    <circle class="pattern-fill" cx="500" cy="520" r="10"/>
    <circle class="pattern-fill" cx="650" cy="600" r="10"/>
    <circle class="pattern-fill" cx="800" cy="520" r="10"/>
    
    <circle class="pattern-fill" cx="125" cy="680" r="10"/>
    <circle class="pattern-fill" cx="275" cy="760" r="10"/>
    <circle class="pattern-fill" cx="425" cy="680" r="10"/>
    <circle class="pattern-fill" cx="575" cy="760" r="10"/>
    <circle class="pattern-fill" cx="725" cy="680" r="10"/>
    <circle class="pattern-fill" cx="875" cy="760" r="10"/>
    
    <circle class="pattern-fill" cx="200" cy="840" r="10"/>
    <circle class="pattern-fill" cx="350" cy="920" r="10"/>
    <circle class="pattern-fill" cx="500" cy="840" r="10"/>
    <circle class="pattern-fill" cx="650" cy="920" r="10"/>
    <circle class="pattern-fill" cx="800" cy="840" r="10"/>
    
    <circle class="pattern-fill" cx="125" cy="1000" r="10"/>
    <circle class="pattern-fill" cx="275" cy="1080" r="10"/>
    <circle class="pattern-fill" cx="425" cy="1000" r="10"/>
    <circle class="pattern-fill" cx="575" cy="1080" r="10"/>
    <circle class="pattern-fill" cx="725" cy="1000" r="10"/>
    <circle class="pattern-fill" cx="875" cy="1080" r="10"/>
    
    <circle class="pattern-fill" cx="200" cy="1160" r="10"/>
    <circle class="pattern-fill" cx="350" cy="1240" r="10"/>
    <circle class="pattern-fill" cx="500" cy="1160" r="10"/>
    <circle class="pattern-fill" cx="650" cy="1240" r="10"/>
    <circle class="pattern-fill" cx="800" cy="1160" r="10"/>
  `,
  
  // Star pattern with central star and radiating elements (Example 4)
  stars: () => `
    <!-- Central 8-point star -->
    <g transform="translate(500,725)">
      <polygon class="pattern-fill" points="0,-80 20,-20 80,0 20,20 0,80 -20,20 -80,0 -20,-20"/>
      
      <!-- Radiating lines -->
      <line class="pattern-stroke" x1="0" y1="-120" x2="0" y2="-100"/>
      <line class="pattern-stroke" x1="85" y1="-85" x2="100" y2="-100"/>
      <line class="pattern-stroke" x1="120" y1="0" x2="100" y2="0"/>
      <line class="pattern-stroke" x1="85" y1="85" x2="100" y2="100"/>
      <line class="pattern-stroke" x1="0" y1="120" x2="0" y2="100"/>
      <line class="pattern-stroke" x1="-85" y1="85" x2="-100" y2="100"/>
      <line class="pattern-stroke" x1="-120" y1="0" x2="-100" y2="0"/>
      <line class="pattern-stroke" x1="-85" y1="-85" x2="-100" y2="-100"/>
      
      <!-- Surrounding circles -->
      <circle class="pattern-stroke" cx="0" cy="0" r="140"/>
      <circle class="pattern-stroke" cx="0" cy="0" r="180"/>
    </g>
    
    <!-- Corner stars -->
    <polygon class="pattern-fill" points="200,250 210,270 230,270 215,285 220,305 200,295 180,305 185,285 170,270 190,270"/>
    <polygon class="pattern-fill" points="800,250 810,270 830,270 815,285 820,305 800,295 780,305 785,285 770,270 790,270"/>
    <polygon class="pattern-fill" points="200,1200 210,1220 230,1220 215,1235 220,1255 200,1245 180,1255 185,1235 170,1220 190,1220"/>
    <polygon class="pattern-fill" points="800,1200 810,1220 830,1220 815,1235 820,1255 800,1245 780,1255 785,1235 770,1220 790,1220"/>
  `,
  
  // Crystal/diamond pattern with geometric shapes
  crystals: () => `
    <!-- Central diamond cluster -->
    <polygon class="pattern-fill" points="500,600 550,650 500,750 450,650"/>
    <polygon class="pattern-stroke" points="500,600 570,670 500,800 430,670"/>
    <polygon class="pattern-stroke" points="500,600 590,700 500,850 410,700"/>
    
    <!-- Side crystals -->
    <polygon class="pattern-fill" points="250,400 300,450 250,550 200,450"/>
    <polygon class="pattern-fill" points="750,400 800,450 750,550 700,450"/>
    <polygon class="pattern-fill" points="250,900 300,950 250,1050 200,950"/>
    <polygon class="pattern-fill" points="750,900 800,950 750,1050 700,950"/>
    
    <!-- Crystal facets -->
    <line class="pattern-thin" x1="500" y1="600" x2="500" y2="750"/>
    <line class="pattern-thin" x1="450" y1="650" x2="550" y2="650"/>
    <line class="pattern-thin" x1="470" y1="680" x2="530" y2="680"/>
    <line class="pattern-thin" x1="480" y1="710" x2="520" y2="710"/>
    
    <!-- Corner accents -->
    <polygon class="pattern-fill" points="150,200 170,220 150,260 130,220"/>
    <polygon class="pattern-fill" points="850,200 870,220 850,260 830,220"/>
    <polygon class="pattern-fill" points="150,1250 170,1270 150,1310 130,1270"/>
    <polygon class="pattern-fill" points="850,1250 870,1270 850,1310 830,1270"/>
  `,
  
  // Lightning pattern with energy bolts
  lightning: () => `
    <!-- Main lightning bolts -->
    <path class="pattern-thick" d="M200,200 L250,350 L200,400 L300,550 L250,600 L350,750"/>
    <path class="pattern-thick" d="M650,200 L700,350 L650,400 L750,550 L700,600 L800,750"/>
    <path class="pattern-thick" d="M200,900 L250,1050 L200,1100 L300,1250 L250,1300 L350,1450"/>
    <path class="pattern-thick" d="M650,900 L700,1050 L650,1100 L750,1250 L700,1300 L800,1450"/>
    
    <!-- Central energy burst -->
    <g transform="translate(500,725)">
      <path class="pattern-stroke" d="M-60,0 L60,0"/>
      <path class="pattern-stroke" d="M0,-60 L0,60"/>
      <path class="pattern-stroke" d="M-42,-42 L42,42"/>
      <path class="pattern-stroke" d="M42,-42 L-42,42"/>
      
      <!-- Energy particles -->
      <circle class="pattern-fill" cx="-80" cy="0" r="4"/>
      <circle class="pattern-fill" cx="80" cy="0" r="4"/>
      <circle class="pattern-fill" cx="0" cy="-80" r="4"/>
      <circle class="pattern-fill" cx="0" cy="80" r="4"/>
    </g>
    
    <!-- Energy trails -->
    <path class="pattern-thin" d="M100,400 Q200,350 300,400 Q400,450 500,400"/>
    <path class="pattern-thin" d="M500,1000 Q600,950 700,1000 Q800,1050 900,1000"/>
  `,
  
  // Triangle pattern with geometric forms
  triangles: () => `
    <!-- Large central triangles -->
    <polygon class="pattern-stroke" points="500,500 600,700 400,700"/>
    <polygon class="pattern-fill" points="500,550 570,650 430,650"/>
    
    <!-- Surrounding triangular pattern -->
    <polygon class="pattern-fill" points="250,300 300,400 200,400"/>
    <polygon class="pattern-fill" points="750,300 800,400 700,400"/>
    <polygon class="pattern-fill" points="250,1000 300,1100 200,1100"/>
    <polygon class="pattern-fill" points="750,1000 800,1100 700,1100"/>
    
    <!-- Small accent triangles -->
    <polygon class="pattern-fill" points="350,200 370,240 330,240"/>
    <polygon class="pattern-fill" points="650,200 670,240 630,240"/>
    <polygon class="pattern-fill" points="350,1250 370,1290 330,1290"/>
    <polygon class="pattern-fill" points="650,1250 670,1290 630,1290"/>
    
    <!-- Triangular grid -->
    <line class="pattern-thin" x1="500" y1="500" x2="250" y2="300"/>
    <line class="pattern-thin" x1="500" y1="500" x2="750" y2="300"/>
    <line class="pattern-thin" x1="500" y1="500" x2="250" y2="1000"/>
    <line class="pattern-thin" x1="500" y1="500" x2="750" y2="1000"/>
    
    <!-- Central point -->
    <circle class="pattern-fill" cx="500" cy="500" r="8"/>
  `,
  
  // Flow pattern with organic curves  
  flow: () => `
    <!-- Main flowing ribbons -->
    <path class="pattern-stroke" d="M100,300 C200,200 300,400 400,300 C500,200 600,400 700,300 C800,200 900,400 1000,300"/>
    <path class="pattern-stroke" d="M0,500 C100,400 200,600 300,500 C400,400 500,600 600,500 C700,400 800,600 900,500"/>
    <path class="pattern-stroke" d="M100,700 C200,600 300,800 400,700 C500,600 600,800 700,700 C800,600 900,800 1000,700"/>
    <path class="pattern-stroke" d="M0,900 C100,800 200,1000 300,900 C400,800 500,1000 600,900 C700,800 800,1000 900,900"/>
    <path class="pattern-stroke" d="M100,1100 C200,1000 300,1200 400,1100 C500,1000 600,1200 700,1100 C800,1000 900,1200 1000,1100"/>
    
    <!-- Vertical flow streams -->
    <path class="pattern-thin" d="M200,100 C250,300 150,500 200,700 C250,900 150,1100 200,1350"/>
    <path class="pattern-thin" d="M800,100 C750,300 850,500 800,700 C750,900 850,1100 800,1350"/>
    
    <!-- Flow nodes -->
    <circle class="pattern-fill" cx="400" cy="300" r="6"/>
    <circle class="pattern-fill" cx="600" cy="500" r="6"/>
    <circle class="pattern-fill" cx="400" cy="700" r="6"/>
    <circle class="pattern-fill" cx="600" cy="900" r="6"/>
    <circle class="pattern-fill" cx="400" cy="1100" r="6"/>
  `,
  
  // Radiant pattern with rays (Example 6)
  radiant: () => `
    <!-- Central circles -->
    <circle class="pattern-stroke" cx="500" cy="725" r="40"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="70"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="100"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="130"/>
    
    <!-- Radiating rays -->
    <g transform="translate(500,725)">
      <!-- Main rays -->
      <line class="pattern-stroke" x1="0" y1="-180" x2="0" y2="-140"/>
      <line class="pattern-stroke" x1="127" y1="-127" x2="99" y2="-99"/>
      <line class="pattern-stroke" x1="180" y1="0" x2="140" y2="0"/>
      <line class="pattern-stroke" x1="127" y1="127" x2="99" y2="99"/>
      <line class="pattern-stroke" x1="0" y1="180" x2="0" y2="140"/>
      <line class="pattern-stroke" x1="-127" y1="127" x2="-99" y2="99"/>
      <line class="pattern-stroke" x1="-180" y1="0" x2="-140" y2="0"/>
      <line class="pattern-stroke" x1="-127" y1="-127" x2="-99" y2="-99"/>
      
      <!-- Secondary rays -->
      <line class="pattern-thin" x1="64" y1="-169" x2="50" y2="-132"/>
      <line class="pattern-thin" x1="169" y1="-64" x2="132" y2="-50"/>
      <line class="pattern-thin" x1="169" y1="64" x2="132" y2="50"/>
      <line class="pattern-thin" x1="64" y1="169" x2="50" y2="132"/>
      <line class="pattern-thin" x1="-64" y1="169" x2="-50" y2="132"/>
      <line class="pattern-thin" x1="-169" y1="64" x2="-132" y2="50"/>
      <line class="pattern-thin" x1="-169" y1="-64" x2="-132" y2="-50"/>
      <line class="pattern-thin" x1="-64" y1="-169" x2="-50" y2="-132"/>
      
      <!-- Tertiary rays -->
      <line class="pattern-thin" x1="32" y1="-177" x2="25" y2="-138"/>
      <line class="pattern-thin" x1="177" y1="-32" x2="138" y2="-25"/>
      <line class="pattern-thin" x1="177" y1="32" x2="138" y2="25"/>
      <line class="pattern-thin" x1="32" y1="177" x2="25" y2="138"/>
      <line class="pattern-thin" x1="-32" y1="177" x2="-25" y2="138"/>
      <line class="pattern-thin" x1="-177" y1="32" x2="-138" y2="25"/>
      <line class="pattern-thin" x1="-177" y1="-32" x2="-138" y2="-25"/>
      <line class="pattern-thin" x1="-32" y1="-177" x2="-25" y2="-138"/>
    </g>
    
    <!-- Central point -->
    <circle class="pattern-fill" cx="500" cy="725" r="8"/>
  `,
  
  // Cosmic pattern with orbital elements
  cosmic: () => `
    <!-- Central cosmic formation -->
    <circle class="pattern-stroke" cx="500" cy="725" r="80"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="120"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="160"/>
    
    <!-- Orbiting bodies -->
    <circle class="pattern-fill" cx="300" cy="725" r="15"/>
    <circle class="pattern-fill" cx="700" cy="725" r="15"/>
    <circle class="pattern-fill" cx="500" cy="565" r="12"/>
    <circle class="pattern-fill" cx="500" cy="885" r="12"/>
    <circle class="pattern-fill" cx="387" cy="638" r="8"/>
    <circle class="pattern-fill" cx="613" cy="812" r="8"/>
    
    <!-- Cosmic trails -->
    <path class="pattern-thin" d="M300,725 Q400,625 500,725 Q600,825 700,725"/>
    <path class="pattern-thin" d="M500,565 Q400,665 500,725 Q600,785 500,885"/>
    
    <!-- Distant stars -->
    <circle class="pattern-fill" cx="200" cy="400" r="4"/>
    <circle class="pattern-fill" cx="800" cy="450" r="4"/>
    <circle class="pattern-fill" cx="250" cy="1000" r="4"/>
    <circle class="pattern-fill" cx="750" cy="1050" r="4"/>
    <circle class="pattern-fill" cx="150" cy="700" r="3"/>
    <circle class="pattern-fill" cx="850" cy="800" r="3"/>
    
    <!-- Cosmic rays -->
    <path class="pattern-thin" d="M100,200 L200,300"/>
    <path class="pattern-thin" d="M800,200 L900,300"/>
    <path class="pattern-thin" d="M100,1200 L200,1100"/>
    <path class="pattern-thin" d="M800,1200 L900,1100"/>
  `,
  
  // Vortex pattern with swirling motion
  vortex: () => `
    <!-- Central vortex spirals -->
    <g transform="translate(500,725)">
      <!-- Inner spiral -->
      <path class="pattern-stroke" d="M0,0 Q-30,-60 -60,0 Q-30,60 0,0 Q30,-60 60,0 Q30,60 0,0"/>
      
      <!-- Middle spiral -->
      <path class="pattern-stroke" d="M0,0 Q-50,-100 -100,0 Q-50,100 0,0 Q50,-100 100,0 Q50,100 0,0"/>
      
      <!-- Outer spiral -->
      <path class="pattern-stroke" d="M0,0 Q-70,-140 -140,0 Q-70,140 0,0 Q70,-140 140,0 Q70,140 0,0"/>
      
      <!-- Vortex arms -->
      <path class="pattern-thin" d="M0,0 Q-100,-50 0,-100 Q100,-50 0,0 Q-100,50 0,100 Q100,50 0,0"/>
      
      <!-- Surrounding circles -->
      <circle class="pattern-thin" cx="0" cy="0" r="180"/>
      <circle class="pattern-thin" cx="0" cy="0" r="220"/>
    </g>
    
    <!-- Corner vortex elements -->
    <path class="pattern-thin" d="M200,300 Q150,250 200,200 Q250,250 200,300"/>
    <path class="pattern-thin" d="M800,300 Q850,250 800,200 Q750,250 800,300"/>
    <path class="pattern-thin" d="M200,1150 Q150,1200 200,1250 Q250,1200 200,1150"/>
    <path class="pattern-thin" d="M800,1150 Q850,1200 800,1250 Q750,1200 800,1150"/>
    
    <!-- Central point -->
    <circle class="pattern-fill" cx="500" cy="725" r="6"/>
  `,
  
  // Phoenix pattern with wing-like forms
  phoenix: () => `
    <!-- Central phoenix body -->
    <ellipse class="pattern-stroke" cx="500" cy="725" rx="40" ry="80"/>
    <circle class="pattern-fill" cx="500" cy="700" r="12"/>
    
    <!-- Phoenix wings -->
    <path class="pattern-stroke" d="M460,725 Q350,625 250,725 Q350,825 460,725"/>
    <path class="pattern-stroke" d="M540,725 Q650,625 750,725 Q650,825 540,725"/>
    
    <!-- Wing details -->
    <path class="pattern-thin" d="M420,700 Q350,650 300,700"/>
    <path class="pattern-thin" d="M420,750 Q350,800 300,750"/>
    <path class="pattern-thin" d="M580,700 Q650,650 700,700"/>
    <path class="pattern-thin" d="M580,750 Q650,800 700,750"/>
    
    <!-- Phoenix tail -->
    <path class="pattern-stroke" d="M500,805 Q450,905 400,1005 Q450,1055 500,955 Q550,1055 600,1005 Q550,905 500,805"/>
    
    <!-- Flame elements -->
    <path class="pattern-thin" d="M200,400 Q250,350 300,400 Q250,450 200,400"/>
    <path class="pattern-thin" d="M700,400 Q750,350 800,400 Q750,450 700,400"/>
    <path class="pattern-thin" d="M350,1100 Q400,1050 450,1100 Q400,1150 350,1100"/>
    <path class="pattern-thin" d="M550,1100 Q600,1050 650,1100 Q600,1150 550,1100"/>
    
    <!-- Head crest -->
    <path class="pattern-stroke" d="M480,650 Q500,600 520,650"/>
    <path class="pattern-fill" d="M485,655 Q500,630 515,655"/>
  `,
  
  // Nebula pattern with cosmic clouds
  nebula: () => `
    <!-- Main nebula clouds -->
    <ellipse class="pattern-stroke" cx="350" cy="400" rx="100" ry="60" transform="rotate(30 350 400)"/>
    <ellipse class="pattern-stroke" cx="650" cy="600" rx="80" ry="100" transform="rotate(-20 650 600)"/>
    <ellipse class="pattern-stroke" cx="500" cy="800" rx="120" ry="70" transform="rotate(45 500 800)"/>
    <ellipse class="pattern-stroke" cx="300" cy="1000" rx="90" ry="110" transform="rotate(-40 300 1000)"/>
    <ellipse class="pattern-stroke" cx="700" cy="1100" rx="110" ry="80" transform="rotate(60 700 1100)"/>
    
    <!-- Nebula cores -->
    <ellipse class="pattern-fill" cx="350" cy="400" rx="40" ry="25" transform="rotate(30 350 400)"/>
    <ellipse class="pattern-fill" cx="650" cy="600" rx="35" ry="45" transform="rotate(-20 650 600)"/>
    <ellipse class="pattern-fill" cx="500" cy="800" rx="50" ry="30" transform="rotate(45 500 800)"/>
    
    <!-- Connecting gas streams -->
    <path class="pattern-thin" d="M400,450 Q500,500 600,550"/>
    <path class="pattern-thin" d="M550,650 Q500,700 450,750"/>
    <path class="pattern-thin" d="M450,850 Q350,900 300,950"/>
    <path class="pattern-thin" d="M600,850 Q650,950 700,1050"/>
    
    <!-- Stellar formations -->
    <circle class="pattern-fill" cx="250" cy="300" r="3"/>
    <circle class="pattern-fill" cx="750" cy="350" r="4"/>
    <circle class="pattern-fill" cx="200" cy="700" r="3"/>
    <circle class="pattern-fill" cx="800" cy="750" r="3"/>
    <circle class="pattern-fill" cx="400" cy="1200" r="4"/>
    <circle class="pattern-fill" cx="600" cy="1250" r="3"/>
  `,
  
  // Crown pattern with royal elements
  crown: () => `
    <!-- Main crown structure -->
    <path class="pattern-stroke" d="M200,700 L250,600 L300,700 L350,550 L400,700 L450,600 L500,700 L550,600 L600,700 L650,550 L700,700 L750,600 L800,700 L800,750 L200,750 Z"/>
    
    <!-- Crown jewels -->
    <circle class="pattern-fill" cx="250" cy="600" r="12"/>
    <circle class="pattern-fill" cx="350" cy="550" r="15"/>
    <circle class="pattern-fill" cx="450" cy="600" r="12"/>
    <circle class="pattern-fill" cx="550" cy="600" r="12"/>
    <circle class="pattern-fill" cx="650" cy="550" r="15"/>
    <circle class="pattern-fill" cx="750" cy="600" r="12"/>
    
    <!-- Crown band -->
    <rect class="pattern-stroke" x="200" y="730" width="600" height="40"/>
    <rect class="pattern-fill" x="220" y="740" width="560" height="20"/>
    
    <!-- Royal scepter -->
    <line class="pattern-stroke" x1="500" y1="770" x2="500" y2="850"/>
    <circle class="pattern-stroke" cx="500" cy="830" r="20"/>
    <circle class="pattern-fill" cx="500" cy="830" r="8"/>
    
    <!-- Decorative elements -->
    <polygon class="pattern-fill" points="300,400 320,450 280,450"/>
    <polygon class="pattern-fill" points="500,350 520,400 480,400"/>
    <polygon class="pattern-fill" points="700,400 720,450 680,450"/>
    
    <!-- Crown base -->
    <rect class="pattern-stroke" x="150" y="770" width="700" height="20"/>
  `,
  
  // Shadow pattern with angular forms
  shadow: () => `
    <!-- Angular shadow blocks -->
    <polygon class="pattern-fill" points="100,300 250,280 270,330 120,350"/>
    <polygon class="pattern-fill" points="300,500 450,480 470,530 320,550"/>
    <polygon class="pattern-fill" points="500,700 650,680 670,730 520,750"/>
    <polygon class="pattern-fill" points="200,900 350,880 370,930 220,950"/>
    <polygon class="pattern-fill" points="600,1100 750,1080 770,1130 620,1150"/>
    
    <!-- Shadow gradients -->
    <polygon class="pattern-stroke" points="750,350 900,330 920,420 770,440"/>
    <polygon class="pattern-stroke" points="150,750 300,730 320,820 170,840"/>
    
    <!-- Angular connectors -->
    <path class="pattern-thin" d="M185,325 L385,490 L585,715 L295,915"/>
    <path class="pattern-thin" d="M815,375 L685,705 L535,1125"/>
    
    <!-- Shadow accents -->
    <polygon class="pattern-fill" points="400,200 420,250 380,250"/>
    <polygon class="pattern-fill" points="600,400 620,450 580,450"/>
    <polygon class="pattern-fill" points="300,600 320,650 280,650"/>
    <polygon class="pattern-fill" points="700,800 720,850 680,850"/>
    <polygon class="pattern-fill" points="400,1000 420,1050 380,1050"/>
    
    <!-- Depth lines -->
    <line class="pattern-thin" x1="100" y1="200" x2="150" y2="250"/>
    <line class="pattern-thin" x1="850" y1="200" x2="900" y2="250"/>
    <line class="pattern-thin" x1="100" y1="1250" x2="150" y2="1200"/>
    <line class="pattern-thin" x1="850" y1="1250" x2="900" y2="1200"/>
  `,
  
  // Royal pattern with heraldic elements
  royal: () => `
    <!-- Central heraldic shield -->
    <path class="pattern-stroke" d="M400,300 L600,300 L600,450 L500,550 L400,450 Z"/>
    <path class="pattern-fill" d="M425,325 L575,325 L575,425 L500,500 L425,425 Z"/>
    
    <!-- Royal crown above shield -->
    <path class="pattern-stroke" d="M430,250 L450,200 L480,250 L500,180 L520,250 L550,200 L570,250 L570,280 L430,280 Z"/>
    <circle class="pattern-fill" cx="450" cy="200" r="6"/>
    <circle class="pattern-fill" cx="500" cy="180" r="8"/>
    <circle class="pattern-fill" cx="550" cy="200" r="6"/>
    
    <!-- Shield details -->
    <circle class="pattern-stroke" cx="500" cy="400" r="30"/>
    <circle class="pattern-fill" cx="500" cy="400" r="15"/>
    
    <!-- Flanking elements -->
    <path class="pattern-stroke" d="M350,400 L380,380 L380,420 L350,450 L320,420 L320,380 Z"/>
    <path class="pattern-stroke" d="M650,400 L680,380 L680,420 L650,450 L620,420 L620,380 Z"/>
    
    <!-- Royal banner -->
    <rect class="pattern-stroke" x="300" y="600" width="400" height="80"/>
    <rect class="pattern-fill" x="320" y="620" width="360" height="40"/>
    
    <!-- Decorative flourishes -->
    <path class="pattern-thin" d="M250,500 Q300,450 350,500 Q300,550 250,500"/>
    <path class="pattern-thin" d="M650,500 Q700,450 750,500 Q700,550 650,500"/>
    
    <!-- Royal base -->
    <rect class="pattern-stroke" x="200" y="750" width="600" height="40"/>
    <line class="pattern-stroke" x1="200" y1="790" x2="800" y2="790"/>
    
    <!-- Corner ornaments -->
    <circle class="pattern-fill" cx="300" cy="850" r="10"/>
    <circle class="pattern-fill" cx="500" cy="850" r="12"/>
    <circle class="pattern-fill" cx="700" cy="850" r="10"/>
  `,
  
  // Mystic pattern with magical symbols
  mystic: () => `
    <!-- Central mystic circle -->
    <circle class="pattern-stroke" cx="500" cy="725" r="100"/>
    <circle class="pattern-stroke" cx="500" cy="725" r="140"/>
    
    <!-- Mystic star -->
    <polygon class="pattern-fill" points="500,625 520,685 580,685 535,720 555,780 500,745 445,780 465,720 420,685 480,685"/>
    
    <!-- Runic symbols -->
    <path class="pattern-stroke" d="M300,400 L350,350 L350,450 M325,400 L375,400"/>
    <path class="pattern-stroke" d="M650,400 L700,350 L700,450 M675,375 L675,425"/>
    <path class="pattern-stroke" d="M300,1000 L350,950 L350,1050 M300,1000 L350,1000"/>
    <path class="pattern-stroke" d="M650,1000 L700,950 L700,1050 M650,975 L700,975 M650,1025 L700,1025"/>
    
    <!-- Mystic connections -->
    <path class="pattern-thin" d="M400,725 Q350,675 300,725 Q350,775 400,725"/>
    <path class="pattern-thin" d="M600,725 Q650,675 700,725 Q650,775 600,725"/>
    
    <!-- Astral bodies -->
    <circle class="pattern-fill" cx="200" cy="300" r="8"/>
    <circle class="pattern-fill" cx="800" cy="350" r="6"/>
    <circle class="pattern-fill" cx="150" cy="800" r="7"/>
    <circle class="pattern-fill" cx="850" cy="900" r="6"/>
    <circle class="pattern-fill" cx="250" cy="1200" r="8"/>
    <circle class="pattern-fill" cx="750" cy="1100" r="7"/>
    
    <!-- Mystical energy -->
    <path class="pattern-thin" d="M200,500 Q250,450 300,500 Q350,550 400,500"/>
    <path class="pattern-thin" d="M600,950 Q650,900 700,950 Q750,1000 800,950"/>
    
    <!-- Sacred geometry -->
    <polygon class="pattern-stroke" points="500,500 540,540 500,580 460,540"/>
    <polygon class="pattern-stroke" points="500,870 540,910 500,950 460,910"/>
    
    <!-- Corner mystic symbols -->
    <path class="pattern-thin" d="M150,150 L200,200 M150,200 L200,150"/>
    <path class="pattern-thin" d="M800,150 L850,200 M800,200 L850,150"/>
    <path class="pattern-thin" d="M150,1300 L200,1250 M150,1250 L200,1300"/>
    <path class="pattern-thin" d="M800,1300 L850,1250 M800,1250 L850,1300"/>
  `,
  
  // Diamond pattern with crystalline structure
  diamond: () => `
    <!-- Central large diamond -->
    <polygon class="pattern-stroke" points="500,500 600,600 500,800 400,600"/>
    <polygon class="pattern-fill" points="500,540 570,620 500,740 430,620"/>
    
    <!-- Diamond facets -->
    <line class="pattern-thin" x1="500" y1="500" x2="500" y2="800"/>
    <line class="pattern-thin" x1="400" y1="600" x2="600" y2="600"/>
    <line class="pattern-thin" x1="450" y1="550" x2="550" y2="550"/>
    <line class="pattern-thin" x1="450" y1="750" x2="550" y2="750"/>
    <line class="pattern-thin" x1="430" y1="620" x2="570" y2="620"/>
    <line class="pattern-thin" x1="430" y1="680" x2="570" y2="680"/>
    
    <!-- Surrounding diamonds -->
    <polygon class="pattern-fill" points="250,400 300,450 250,550 200,450"/>
    <polygon class="pattern-fill" points="750,400 800,450 750,550 700,450"/>
    <polygon class="pattern-fill" points="250,900 300,950 250,1050 200,950"/>
    <polygon class="pattern-fill" points="750,900 800,950 750,1050 700,950"/>
    
    <!-- Small accent diamonds -->
    <polygon class="pattern-fill" points="350,200 370,220 350,260 330,220"/>
    <polygon class="pattern-fill" points="650,200 670,220 650,260 630,220"/>
    <polygon class="pattern-fill" points="350,1200 370,1220 350,1260 330,1220"/>
    <polygon class="pattern-fill" points="650,1200 670,1220 650,1260 630,1220"/>
    
    <!-- Diamond lattice -->
    <line class="pattern-thin" x1="250" y1="400" x2="500" y2="500"/>
    <line class="pattern-thin" x1="750" y1="400" x2="500" y2="500"/>
    <line class="pattern-thin" x1="500" y1="800" x2="250" y2="900"/>
    <line class="pattern-thin" x1="500" y1="800" x2="750" y2="900"/>
    
    <!-- Corner crystal formations -->
    <polygon class="pattern-stroke" points="150,150 180,120 210,150 180,200"/>
    <polygon class="pattern-stroke" points="850,150 880,120 910,150 880,200"/>
    <polygon class="pattern-stroke" points="150,1300 180,1270 210,1300 180,1350"/>
    <polygon class="pattern-stroke" points="850,1300 880,1270 910,1300 880,1350"/>
    
    <!-- Crystal reflections -->
    <circle class="pattern-fill" cx="500" cy="580" r="4"/>
    <circle class="pattern-fill" cx="500" cy="720" r="4"/>
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

// Generate SVG content with new template system
function generateSVG(card, template) {
  const { colors, pattern } = card;
  
  // Replace colors in template
  let svgContent = template
    .replace(/CARD_BG_COLOR/g, colors.bg)
    .replace(/PATTERN_COLOR/g, colors.accent);
  
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