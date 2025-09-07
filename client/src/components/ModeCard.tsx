import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Lock } from "@/icons";

interface ModeCardProps {
  title: string;
  subtitle: string;
  gradient: 'green' | 'peach' | 'lavender' | 'aqua';
  icon: React.ReactNode;
  locked?: boolean;
  to: string;
}

const gradientClasses = {
  green: 'bg-card-green',
  peach: 'bg-card-peach', 
  lavender: 'bg-card-lavender',
  aqua: 'bg-card-aqua',
};

export default function ModeCard({ title, subtitle, gradient, icon, locked = false, to }: ModeCardProps) {
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (!locked) {
      navigate(to);
    }
  };

  return (
    <motion.div
      className={`
        relative flex-shrink-0 w-[85vw] max-w-sm h-40 
        ${gradientClasses[gradient]}
        rounded-3xl sm:rounded-4xl 
        px-6 py-7 sm:px-7 sm:py-8
        cursor-pointer snap-center
        ${locked ? 'opacity-75' : ''}
      `}
      style={{
        boxShadow: '0 12px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={!locked ? { scale: 1.02 } : {}}
      whileTap={!locked ? { scale: 0.98, opacity: 0.95 } : {}}
      onClick={handleClick}
      role="link"
      aria-label={locked ? `${title} - Locked` : `Play ${title} mode`}
      data-testid={`mode-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {/* Gloss overlay */}
      <div 
        className="absolute inset-0 rounded-3xl sm:rounded-4xl"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 100%)',
        }}
      />
      
      {/* Content container */}
      <div className="relative h-full flex flex-col justify-between">
        {/* Top row: Icon and Lock */}
        <div className="flex items-start justify-between">
          <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] flex items-center justify-center">
            {icon}
          </div>
          
          {locked && (
            <div className="opacity-90">
              <Lock className="w-6 h-6 text-white drop-shadow-sm" />
            </div>
          )}
        </div>
        
        {/* Bottom: Text content */}
        <div className="space-y-1">
          <h3 
            className="text-2xl sm:text-[28px] font-semibold text-black leading-tight tracking-[-0.01em]"
            data-testid={`mode-title-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {title}
          </h3>
          <p 
            className="text-[15px] text-black/70 leading-relaxed"
            data-testid={`mode-subtitle-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </motion.div>
  );
}