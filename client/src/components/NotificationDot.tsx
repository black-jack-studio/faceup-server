import { motion } from 'framer-motion';

interface NotificationDotProps {
  show: boolean;
  className?: string;
}

export default function NotificationDot({ show, className = "" }: NotificationDotProps) {
  if (!show) return null;

  return (
    <motion.div
      className={`absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-lg ${className}`}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [1, 0.7, 1]
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      data-testid="notification-dot"
    >
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-full"
        animate={{
          scale: [0, 1.5],
          opacity: [1, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
    </motion.div>
  );
}