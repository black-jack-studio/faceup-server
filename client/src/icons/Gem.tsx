import gemImage from "@assets/image_1757366539717.png";

export default function Gem({ className = "w-6 h-6", ...props }) {
  // Extraire la taille depuis className ou utiliser les props de taille
  const sizeMatch = className.match(/w-(\d+)/);
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