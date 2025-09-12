import { motion } from 'framer-motion';

interface NotificationDotProps {
  show: boolean;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export default function NotificationDot({ show, className = "", variant = 'default' }: NotificationDotProps) {
  if (!show) return null;
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          background: 'linear-gradient(135deg, var(--accent-green), #00d924)',
          borderColor: 'rgba(181, 243, 199, 0.3)',
          shadowColor: 'rgba(181, 243, 199, 0.6)',
          glowColor: 'var(--accent-green)'
        };
      case 'warning':
        return {
          background: 'linear-gradient(135deg, var(--accent-gold), #f59e0b)',
          borderColor: 'rgba(248, 202, 90, 0.3)',
          shadowColor: 'rgba(248, 202, 90, 0.6)',
          glowColor: 'var(--accent-gold)'
        };
      case 'error':
        return {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          borderColor: 'rgba(239, 68, 68, 0.3)',
          shadowColor: 'rgba(239, 68, 68, 0.6)',
          glowColor: '#ef4444'
        };
      case 'info':
        return {
          background: 'linear-gradient(135deg, var(--accent-blue), #3b82f6)',
          borderColor: 'rgba(140, 203, 255, 0.3)',
          shadowColor: 'rgba(140, 203, 255, 0.6)',
          glowColor: 'var(--accent-blue)'
        };
      default:
        return {
          background: 'linear-gradient(135deg, var(--accent-green), #00d924)',
          borderColor: 'rgba(181, 243, 199, 0.3)',
          shadowColor: 'rgba(181, 243, 199, 0.6)',
          glowColor: 'var(--accent-green)'
        };
    }
  };
  
  const variantStyles = getVariantStyles();

  return (
    <motion.div
      className={`absolute -top-1 -right-1 w-4 h-4 rounded-full shadow-2xl flex items-center justify-center backdrop-blur-sm border ${className}`}
      style={{
        background: variantStyles.background,
        borderColor: variantStyles.borderColor,
        boxShadow: `0 0 20px ${variantStyles.shadowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`
      }}
      animate={{
        scale: [1, 1.1, 1],
        rotateZ: [0, 5, -5, 0]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      data-testid="notification-dot"
    >
      <span className="text-[var(--ink)] text-xs font-black leading-none drop-shadow-sm">!</span>
      
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2"
        style={{
          borderColor: variantStyles.glowColor,
          background: 'transparent'
        }}
        animate={{
          scale: [1, 1.8],
          opacity: [0.8, 0]
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeOut"
        }}
      />
      
      {/* Inner shine effect */}
      <motion.div
        className="absolute top-0.5 left-0.5 w-1.5 h-1.5 bg-white/40 rounded-full blur-[0.5px]"
        animate={{
          opacity: [0.3, 0.8, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}