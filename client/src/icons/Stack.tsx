export default function Stack({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <ellipse cx="12" cy="7" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,255,255,0.15)"/>
      <ellipse cx="12" cy="12" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.4" fill="rgba(255,255,255,0.25)"/>
      <ellipse cx="12" cy="17" rx="7" ry="2.5" stroke="currentColor" strokeWidth="1.4" fill="currentColor" opacity="0.9"/>
      <path d="M8 15c0 1.1 1.79 2 4 2s4-.9 4-2" stroke="rgba(0,0,0,0.4)" strokeWidth="1"/>
      <path d="M8 10c0 1.1 1.79 2 4 2s4-.9 4-2" stroke="rgba(0,0,0,0.3)" strokeWidth="1"/>
    </svg>
  );
}