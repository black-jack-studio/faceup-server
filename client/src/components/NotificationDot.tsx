import { motion } from 'framer-motion';

interface NotificationDotProps {
  show: boolean;
  className?: string;
}

export default function NotificationDot({ show, className = "" }: NotificationDotProps) {
  if (!show) return null;

  return (
    <motion.div
      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full cursor-pointer ${className}`}
      style={{
        background: '#ef4444'
      }}
      animate={{
        scale: [1, 1.2, 1]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      data-testid="notification-dot"
    />
  );
}