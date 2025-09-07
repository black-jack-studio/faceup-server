export default function Cards({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <rect x="4" y="5" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
      <rect x="8" y="7" width="8" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.9"/>
      <path d="M10 10h2M10 12h3M10 14h2" stroke="rgba(0,0,0,0.7)" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="13" cy="16" r="0.8" fill="rgba(0,0,0,0.6)"/>
    </svg>
  );
}