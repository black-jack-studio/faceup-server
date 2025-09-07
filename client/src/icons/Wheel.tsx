export default function Wheel({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="12"
        cy="12"
        r="2"
        fill="rgba(0,0,0,0.3)"
        stroke="currentColor"
        strokeWidth="1"
      />
      <line x1="12" y1="3" x2="12" y2="7" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="12" y1="17" x2="12" y2="21" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="3" y1="12" x2="7" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="17" y1="12" x2="21" y2="12" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <line x1="5.6" y1="5.6" x2="8.5" y2="8.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <line x1="15.5" y1="15.5" x2="18.4" y2="18.4" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <line x1="18.4" y1="5.6" x2="15.5" y2="8.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <line x1="8.5" y1="15.5" x2="5.6" y2="18.4" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
      <path
        d="M12 3L10 12H14L12 3Z"
        fill="rgba(255,255,255,0.1)"
      />
    </svg>
  );
}