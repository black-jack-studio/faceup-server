export default function Skyscraper({ className = "w-16 h-16", ...props }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...props}>
      {/* Building 1 - tallest */}
      <rect x="8" y="12" width="14" height="40" rx="2" fill="url(#buildingGradient1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      
      {/* Building 2 - medium */}
      <rect x="26" y="20" width="12" height="32" rx="2" fill="url(#buildingGradient2)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      
      {/* Building 3 - shorter */}
      <rect x="42" y="28" width="14" height="24" rx="2" fill="url(#buildingGradient3)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      
      {/* Windows pattern */}
      <g fill="rgba(255,255,255,0.4)">
        {/* Building 1 windows */}
        <rect x="11" y="18" width="2" height="3" rx="0.5"/>
        <rect x="16" y="18" width="2" height="3" rx="0.5"/>
        <rect x="11" y="26" width="2" height="3" rx="0.5"/>
        <rect x="16" y="26" width="2" height="3" rx="0.5"/>
        <rect x="11" y="34" width="2" height="3" rx="0.5"/>
        <rect x="16" y="34" width="2" height="3" rx="0.5"/>
        <rect x="11" y="42" width="2" height="3" rx="0.5"/>
        <rect x="16" y="42" width="2" height="3" rx="0.5"/>
        
        {/* Building 2 windows */}
        <rect x="29" y="26" width="2" height="3" rx="0.5"/>
        <rect x="33" y="26" width="2" height="3" rx="0.5"/>
        <rect x="29" y="34" width="2" height="3" rx="0.5"/>
        <rect x="33" y="34" width="2" height="3" rx="0.5"/>
        <rect x="29" y="42" width="2" height="3" rx="0.5"/>
        <rect x="33" y="42" width="2" height="3" rx="0.5"/>
        
        {/* Building 3 windows */}
        <rect x="45" y="34" width="2" height="3" rx="0.5"/>
        <rect x="50" y="34" width="2" height="3" rx="0.5"/>
        <rect x="45" y="42" width="2" height="3" rx="0.5"/>
        <rect x="50" y="42" width="2" height="3" rx="0.5"/>
      </g>
      
      {/* Coins floating */}
      <circle cx="58" cy="16" r="4" fill="url(#coinGradient)" stroke="rgba(255,255,255,0.4)" strokeWidth="1"/>
      <circle cx="6" cy="58" r="3" fill="url(#coinGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      
      <defs>
        <linearGradient id="buildingGradient1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)"/>
        </linearGradient>
        <linearGradient id="buildingGradient2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)"/>
        </linearGradient>
        <linearGradient id="buildingGradient3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.55)"/>
        </linearGradient>
        <radialGradient id="coinGradient" cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)"/>
        </radialGradient>
      </defs>
    </svg>
  );
}