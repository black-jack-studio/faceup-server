export default function Cart({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 3H5L5.4 5M7 13H17L21 5H5.4M7 13L5.4 5M7 13L4.7 15.3C4.3 15.7 4.6 16.5 5.1 16.5H17M17 13V16.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="9"
        cy="19.5"
        r="1.5"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle
        cx="20"
        cy="19.5"
        r="1.5"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="7"
        y="7"
        width="12"
        height="4"
        fill="rgba(255,255,255,0.1)"
        rx="1"
      />
    </svg>
  );
}