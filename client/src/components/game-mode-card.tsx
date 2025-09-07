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
          className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}
