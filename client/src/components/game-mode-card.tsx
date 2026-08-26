import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface GameModeCardProps {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  href?: string;
  onClick?: () => void;
  showNotification?: boolean;
  testId: string;
}

export default function GameModeCard({
  title,
  description,
  icon,
  gradient,
  href,
  onClick,
  showNotification = false,
  testId,
}: GameModeCardProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigate(href);
    }
  };

  return (
    <motion.div
      className={cn(
        "rounded-2xl p-4 card-hover cursor-pointer relative",
        gradient
      )}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      data-testid={testId}
    >
      <div className="flex flex-col h-32">
        <div className="mb-3">
          <i className={cn(icon, "text-white text-2xl")} />
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
        <p className="text-white/80 text-sm">{description}</p>
      </div>
      
      {showNotification && (
        <motion.div
          className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none">
            <rect x="5.55" y="2.8" width="0.9" height="4.3" rx="0.45" fill="white" fillOpacity="0.85" />
            <circle cx="6" cy="8.6" r="0.55" fill="white" fillOpacity="0.85" />
          </svg>
        </motion.div>
      )}
    </motion.div>
  );
}
