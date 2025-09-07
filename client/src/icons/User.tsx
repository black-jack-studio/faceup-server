export default function User({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <circle
        cx="12"
        cy="8"
        r="5"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M20 21C20 16 16.4 12 12 12S4 16 4 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="12"
        cy="8"
        r="3"
        fill="rgba(255,255,255,0.2)"
        stroke="none"
      />
      <ellipse
        cx="12"
        cy="19"
        rx="8"
        ry="3"
        fill="rgba(255,255,255,0.1)"
      />
    </svg>
  );
}