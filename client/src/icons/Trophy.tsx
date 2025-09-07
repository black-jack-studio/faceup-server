export default function Trophy({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <path d="M6 9c-1.1 0-2-.9-2-2V5c0-.55.45-1 1-1h1c.55 0 1 .45 1 1v4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M18 9c1.1 0 2-.9 2-2V5c0-.55-.45-1-1-1h-1c-.55 0-1 .45-1 1v4" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 5v6c0 2.2 1.8 4 4 4s4-1.8 4-4V5H8z" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.2)"/>
      <rect x="10" y="15" width="4" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" opacity="0.8"/>
      <rect x="8" y="19" width="8" height="2" rx="1" stroke="currentColor" strokeWidth="1.3" fill="currentColor"/>
      <circle cx="12" cy="9" r="1.5" fill="rgba(255,255,255,0.6)"/>
    </svg>
  );
}