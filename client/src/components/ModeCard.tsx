import { motion } from "framer-motion";
import { GameMode } from "@/store/game-store";

interface ModeCardProps {
  mode: GameMode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }> | string;
  gradient: string;
  onClick: () => void;
}

export default function ModeCard({ mode, title, subtitle, icon, gradient, onClick }: ModeCardProps) {
  return (
    <motion.div
      className={`flex-shrink-0 w-80 h-48 ${gradient} rounded-3xl p-6 border border-white/10 backdrop-blur-sm cursor-pointer snap-center`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      data-testid={`mode-card-${mode}`}
    >
      <div className="h-full flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="w-16 h-16 flex items-center justify-center">
            {typeof icon === 'string' ? (
              <img src={icon} alt="Mode icon" className="w-12 h-12 object-contain drop-shadow-lg" />
            ) : (
              (() => {
                const IconComponent = icon as any;
                return <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />;
              })()
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-3xl font-bold text-black mb-3 leading-tight" data-testid={`mode-title-${mode}`}>
            {title}
          </h3>
          <p className="text-gray-600 text-base font-medium opacity-80" data-testid={`mode-subtitle-${mode}`}>
            {subtitle}
          </p>
        </div>
        
        <motion.div 
          className="w-8 h-1 bg-white/40 rounded-full self-end"
          initial={{ width: "2rem" }}
          whileHover={{ width: "3rem" }}
          transition={{ duration: 0.2 }}
        />
      </div>
    </motion.div>
  );
}