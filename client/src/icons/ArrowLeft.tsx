export default function ArrowLeft({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <g
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(12.000000, 12.000000) rotate(-270.000000) translate(-12.000000, -12.000000) translate(5.500000, 4.000000)"
      >
        <line x1="6.7743" y1="15.75" x2="6.7743" y2="0.75" />
        <polyline points="12.7987 9.7002 6.7747 15.7502 0.7497 9.7002" />
      </g>
    </svg>
  );
}
