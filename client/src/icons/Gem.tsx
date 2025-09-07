export default function Gem({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M6 9L12 3L18 9L16 21H8L6 9Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 3L14 9H10L12 3Z"
        fill="rgba(255,255,255,0.2)"
        stroke="none"
      />
      <path
        d="M6 9H18L16 13H8L6 9Z"
        fill="rgba(255,255,255,0.1)"
        stroke="none"
      />
    </svg>
  );
}