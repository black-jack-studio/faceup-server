// Iconly/Light/Activity (Anatole's own pasted reference) — stroke="currentColor" instead of the
// original's hardcoded #000000, matching every other icon in this folder, so it can be colored
// via a parent's text-* class (e.g. Profile's Game Stats cards, which want it to match the
// stat's own title color) instead of always rendering black.
export default function Activity({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <g transform="translate(2, 1.5)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="5.24485128 13.2814646 8.23798631 9.39130439 11.652174 12.0732266 14.5812358 8.29290622" />
        <circle cx="17.9954234" cy="2.70022885" r="1.92219681" />
        <path d="M12.9244852,1.62013731 L5.6567506,1.62013731 C2.64530894,1.62013731 0.778032041,3.75286043 0.778032041,6.76430209 L0.778032041,14.846682 C0.778032041,17.8581237 2.60869567,19.9816935 5.6567506,19.9816935 L14.2608696,19.9816935 C17.2723113,19.9816935 19.1395882,17.8581237 19.1395882,14.846682 L19.1395882,7.80778036" />
      </g>
    </svg>
  );
}
