export default function Lock({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...props}>
      {/* Lock body */}
      <rect x="6" y="10" width="12" height="9" rx="2" 
            fill="url(#lockGradient)" 
            stroke="rgba(255,255,255,0.6)" 
            strokeWidth="1.5"/>
      
      {/* Lock shackle */}
      <path d="M9 10V7c0-1.66 1.34-3 3-3s3 1.34 3 3v3" 
            stroke="rgba(255,255,255,0.7)" 
            strokeWidth="2" 
            strokeLinecap="round" 
            fill="none"/>
      
      {/* Keyhole */}
      <circle cx="12" cy="14" r="1.5" fill="rgba(255,255,255,0.8)"/>
      <rect x="11.5" y="14.5" width="1" height="2" rx="0.5" fill="rgba(255,255,255,0.8)"/>
      
      <defs>
        <linearGradient id="lockGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.8)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.5)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}