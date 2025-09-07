export default function TargetStar({ className = "w-16 h-16", ...props }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...props}>
      {/* Target circles */}
      <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <circle cx="32" cy="32" r="19" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"/>
      <circle cx="32" cy="32" r="12" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
      
      {/* Center star */}
      <path d="M32 22l3 6 6.5 1-4.5 4.5 1 6.5-6-3-6 3 1-6.5L22 29l6.5-1z" 
            fill="url(#starGradient)" 
            stroke="rgba(255,255,255,0.4)" 
            strokeWidth="1"/>
      
      {/* Crosshairs */}
      <line x1="32" y1="8" x2="32" y2="18" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="32" y1="46" x2="32" y2="56" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="32" x2="18" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="32" x2="56" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Corner markers */}
      <path d="M12 12l4 0 0 4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M52 12l-4 0 0 4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M12 52l4 0 0-4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      <path d="M52 52l-4 0 0-4" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" fill="none"/>
      
      {/* Small floating stars */}
      <circle cx="48" cy="16" r="2" fill="rgba(255,255,255,0.6)"/>
      <circle cx="16" cy="48" r="1.5" fill="rgba(255,255,255,0.5)"/>
      <circle cx="52" cy="52" r="1" fill="rgba(255,255,255,0.4)"/>
      
      <defs>
        <radialGradient id="starGradient" cx="0.3" cy="0.3">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="70%" stopColor="rgba(255,255,255,0.7)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)"/>
        </radialGradient>
      </defs>
    </svg>
  );
}