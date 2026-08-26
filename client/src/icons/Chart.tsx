// Iconly/Light/Chart (Anatole's own pasted reference) — stroke="currentColor" instead of the
// original's hardcoded #000000, matching every other icon in this folder, so it can be colored
// via a parent's text-* class (e.g. Profile's Game Stats cards, which want it to match the
// stat's own title color) instead of always rendering black.
export default function Chart({ className = "w-6 h-6", ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" className={className} {...props}>
      <g transform="translate(2, 2)" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5.37142857" y1="8.20171265" x2="5.37142857" y2="15.0618459" />
        <line x1="10.0380952" y1="4.91912464" x2="10.0380952" y2="15.0618459" />
        <line x1="14.6285714" y1="11.8268316" x2="14.6285714" y2="15.0618459" />
        <path d="M14.6857143,0 L5.31428571,0 C2.04761905,0 0,2.31208373 0,5.58515699 L0,14.414843 C0,17.6879163 2.03809524,20 5.31428571,20 L14.6857143,20 C17.9619048,20 20,17.6879163 20,14.414843 L20,5.58515699 C20,2.31208373 17.9619048,0 14.6857143,0 Z" />
      </g>
    </svg>
  );
}
