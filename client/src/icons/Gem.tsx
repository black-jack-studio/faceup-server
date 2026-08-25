import gemImage from "@assets/gem_diamond_blue_2026-08-25.png";

export default function Gem({ className = "w-6 h-6", ...props }) {
  // Extraire la taille depuis className ou utiliser les props de taille
  const sizeMatch = typeof className === "string" ? className.match(/w-(\d+)/) : null;
  const sizeNumber = sizeMatch ? parseInt(sizeMatch[1], 10) : 6;
  const size = `${sizeNumber * 4}px`;
  
  return (
    <img
      src={gemImage}
      alt="Gem"
      className={className}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}