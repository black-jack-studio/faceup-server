export default function SwapArrows({ className = "w-6 h-6", ...props }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" {...props}>
      <g
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(12.000000, 12.000000) rotate(90.000000) translate(-12.000000, -12.000000) translate(2.000000, 3.000000)"
      >
        <line x1="14.8395556" y1="17.1642222" x2="14.8395556" y2="3.54644444" />
        <polyline points="18.9172222 13.0681111 14.8394444 17.1647778 10.7616667 13.0681111" />
        <line x1="4.91111111" y1="0.832888889" x2="4.91111111" y2="14.4506667" />
        <polyline points="0.833444444 4.929 4.91122222 0.832333333 8.989 4.929" />
      </g>
    </svg>
  );
}
