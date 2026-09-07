export default function Repeat({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2.5 L20 5.5 L17 8.5" />
        <path d="M20 5.5 H8 a5 5 0 0 0 -5 5 v1" />
        <path d="M7 21.5 L4 18.5 L7 15.5" />
        <path d="M4 18.5 H16 a5 5 0 0 0 5 -5 v-1" />
      </g>
    </svg>
  );
}
