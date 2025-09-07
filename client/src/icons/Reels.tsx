export default function Reels({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="3"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="4"
        y="6"
        width="4"
        height="12"
        rx="1"
        fill="rgba(0,0,0,0.3)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
      <rect
        x="10"
        y="6"
        width="4"
        height="12"
        rx="1"
        fill="rgba(0,0,0,0.3)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
      <rect
        x="16"
        y="6"
        width="4"
        height="12"
        rx="1"
        fill="rgba(0,0,0,0.3)"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="1"
      />
      <circle cx="6" cy="10" r="1" fill="rgba(255,255,255,0.4)" />
      <rect x="11" y="9" width="2" height="2" rx="0.5" fill="rgba(255,255,255,0.4)" />
      <path d="M17 9L19 11L17 13V9Z" fill="rgba(255,255,255,0.4)" />
      <rect
        x="2"
        y="11"
        width="20"
        height="2"
        fill="rgba(255,255,255,0.1)"
      />
    </svg>
  );
}