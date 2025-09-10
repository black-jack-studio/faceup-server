interface Pointer3DProps {
  width?: number;
  faceColor?: string;
  foldColor?: string;
  shadow?: boolean;
}

export default function Pointer3D({ 
  width = 120, 
  faceColor = "#ffffff", 
  foldColor = "#e5e7eb", 
  shadow = true 
}: Pointer3DProps) {
  const height = (width * 90) / 120;
  
  const svg = (
    <svg 
      viewBox="0 0 120 90" 
      width={width} 
      height={height} 
      aria-hidden="true"
      className="pointer-events-none"
    >
      <defs>
        <linearGradient id="pointerGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={faceColor} />
          <stop offset="1" stopColor="#f4f4f4" />
        </linearGradient>
      </defs>
      {/* Front face triangle pointing down */}
      <path 
        d="M0 0 L120 0 L60 90 Z" 
        fill="url(#pointerGradient)" 
        stroke="rgba(0,0,0,0.08)" 
        strokeWidth="1"
      />
      {/* Right-side fold sliver for 3D effect */}
      <path 
        d="M120 0 L92 20 L60 90 L120 0 Z" 
        fill={foldColor}
        stroke="rgba(0,0,0,0.05)" 
        strokeWidth="0.5"
      />
    </svg>
  );

  if (shadow) {
    return (
      <div className="pointer-events-none filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)]">
        {svg}
      </div>
    );
  }

  return svg;
}