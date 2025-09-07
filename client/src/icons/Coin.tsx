export default function Coin({ className = "w-6 h-6", ...props }) {
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
        r="6"
        fill="rgba(255,255,255,0.2)"
        stroke="none"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="rgba(255,255,255,0.3)"
        stroke="none"
      />
      <circle
        cx="12"
        cy="12"
        r="1.5"
        fill="rgba(0,0,0,0.2)"
        stroke="none"
      />
    </svg>
  );
}