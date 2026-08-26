import { motion } from 'framer-motion';

interface NotificationDotProps {
  show: boolean;
  className?: string;
}

export default function NotificationDot({ show, className = "" }: NotificationDotProps) {
  if (!show) return null;

  return (
    <motion.div
      className={`absolute -top-1 -right-1 w-3 h-3 rounded-full cursor-pointer flex items-center justify-center ${className}`}
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
    >
      <svg width="12" height="12" viewBox="0 0 12 12" className="pointer-events-none">
        <rect x="5.55" y="2.8" width="0.9" height="4.3" rx="0.45" fill="white" fillOpacity="0.85" />
        <circle cx="6" cy="8.6" r="0.55" fill="white" fillOpacity="0.85" />
      </svg>
    </motion.div>
  );
}