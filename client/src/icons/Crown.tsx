export default function Crown({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 16L3 7L8 12L12 5L16 12L21 7L19 16H5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="16"
        width="16"
        height="3"
        rx="1"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 12L12 8L16 12L19 9L16 16H8L5 9L8 12Z"
        fill="rgba(255,255,255,0.2)"
        stroke="none"
      />
      <circle cx="12" cy="11" r="1" fill="rgba(255,255,255,0.4)" />
      <circle cx="8" cy="13" r="0.5" fill="rgba(255,255,255,0.3)" />
      <circle cx="16" cy="13" r="0.5" fill="rgba(255,255,255,0.3)" />
    </svg>
  );
}