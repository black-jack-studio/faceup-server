export default function GlobePlay({ className = "w-16 h-16", ...props }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...props}>
      {/* Globe base */}
      <circle cx="32" cy="32" r="28" fill="url(#globeGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      
      {/* Continents stylisés */}
      <path d="M15 25c3-2 8-1 12 1s6 5 10 3 5-4 8-2" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M18 38c4-1 7 2 11 1s6-3 9-1" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M25 45c3-2 6 0 9-1s5-2 7 0" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      
      {/* Jetons flottants */}
      <circle cx="48" cy="20" r="6" fill="url(#chipGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
      <circle cx="16" cy="48" r="5" fill="url(#chipGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
      <circle cx="52" cy="44" r="4" fill="url(#chipGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      
      {/* Highlight */}
      <ellipse cx="28" cy="24" rx="8" ry="6" fill="rgba(255,255,255,0.2)"/>
      
      <defs>
        <radialGradient id="globeGradient" cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="70%" stopColor="rgba(255,255,255,0.7)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)"/>
        </radialGradient>
        <radialGradient id="chipGradient" cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.4)"/>
        </radialGradient>
      </defs>
    </svg>
  );
}