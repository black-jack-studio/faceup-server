import keyImage from "@assets/lightning_3d_1787220837529.png";

interface KeyProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export function Key({ size = 32, className = "", glow = false }: KeyProps) {
  return (
    <img
      src={keyImage}
      alt="Key"
      className={`${className} ${glow ? 'drop-shadow-lg' : ''}`}
      style={{
        width: size,
        height: size,
        filter: glow ? 'drop-shadow(0 0 8px rgba(255, 105, 180, 0.6))' : 'none'
      }}
    />
  );
}
