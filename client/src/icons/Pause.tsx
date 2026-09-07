export default function Pause({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <g stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="5" x2="8" y2="19" />
        <line x1="16" y1="5" x2="16" y2="19" />
      </g>
    </svg>
  );
}
