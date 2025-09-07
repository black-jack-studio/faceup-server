export default function BracketBot({ className = "w-16 h-16", ...props }) {
  return (
    <svg viewBox="0 0 64 64" className={className} {...props}>
      {/* Robot head */}
      <rect x="22" y="18" width="20" height="16" rx="4" fill="url(#robotGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      
      {/* Robot body */}
      <rect x="25" y="32" width="14" height="18" rx="3" fill="url(#robotGradient)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      
      {/* Eyes */}
      <circle cx="28" cy="25" r="2.5" fill="rgba(255,255,255,0.8)"/>
      <circle cx="36" cy="25" r="2.5" fill="rgba(255,255,255,0.8)"/>
      <circle cx="28" cy="25" r="1.5" fill="rgba(255,255,255,0.4)"/>
      <circle cx="36" cy="25" r="1.5" fill="rgba(255,255,255,0.4)"/>
      
      {/* Antennae */}
      <line x1="27" y1="18" x2="27" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="37" y1="18" x2="37" y2="14" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="27" cy="14" r="1.5" fill="rgba(255,255,255,0.7)"/>
      <circle cx="37" cy="14" r="1.5" fill="rgba(255,255,255,0.7)"/>
      
      {/* Bracket symbols */}
      <path d="M8 20c-2 0-2 4 0 4v8c2 0 2 4 0 4" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <path d="M56 20c2 0 2 4 0 4v8c-2 0-2 4 0 4" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      
      {/* Tournament lines */}
      <line x1="12" y1="24" x2="18" y2="24" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="32" x2="18" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="24" x2="52" y2="24" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="32" x2="52" y2="32" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      
      {/* Crown on robot */}
      <path d="M28 18l2-3 2 3 2-3 2 3h-8z" fill="rgba(255,255,255,0.6)" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      
      <defs>
        <linearGradient id="robotGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0.6)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}