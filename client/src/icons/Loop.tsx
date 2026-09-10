export default function Loop({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.5 12a8.5 8.5 0 1 1 -2.49 -6.01" />
        <path d="M21 3.5v5h-5" />
      </g>
    </svg>
  );
}
