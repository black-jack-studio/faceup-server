import crownImage from "@assets/crown_3d_1758379656323.png";

interface PremiumCrownProps {
  size?: number;
  className?: string;
}

export function PremiumCrown({ size = 20, className = "" }: PremiumCrownProps) {
  return (
    <img 
      src={crownImage} 
      alt="Premium" 
      className={`inline-block ${className}`}
      style={{ 
        width: size, 
        height: size,
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
      }}
      title="Premium Member"
    />
  );
}