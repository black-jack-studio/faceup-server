interface WatchAdIconProps {
  className?: string;
}

// Rounded-square play glyph used to mark "watch a rewarded ad" affordances — GameResultOverlay's
// "Watch to 2X" button and ActionBar's Swap button once the player is out of Swap tokens.
export default function WatchAdIcon({ className }: WatchAdIconProps) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="currentColor" />
    </svg>
  );
}
