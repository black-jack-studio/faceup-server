import { motion } from "framer-motion";
import { Lock, Ticket } from "lucide-react";
import { GameMode } from "@/store/game-store";

interface ModeCardProps {
  mode: GameMode;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }> | string;
  gradient: string;
  onClick: () => void;
  isPremium?: boolean;
  requiresPremium?: boolean;
  ticketCount?: number;
  canPlay?: boolean;
}

export default function ModeCard({ mode, title, subtitle, icon, gradient, onClick, isPremium = false, requiresPremium = false, ticketCount, canPlay = true }: ModeCardProps) {
  return (
    <motion.div
      className={`flex-shrink-0 w-80 h-48 ${gradient} rounded-3xl p-6 border border-white/10 backdrop-blur-sm snap-center ${
        canPlay ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={canPlay ? { scale: 1.02, y: -4 } : {}}
      whileTap={canPlay ? { scale: 0.98 } : {}}
      onClick={canPlay ? onClick : undefined}
      data-testid={`mode-card-${mode}`}
    >
      <div className="h-full flex flex-col justify-between">
        <div className="flex items-start justify-between mb-2">
          <div className="w-16 h-16 flex items-center justify-center">
            {typeof icon === 'string' ? (
              <img src={icon} alt="Mode icon" className="w-14 h-14 object-contain drop-shadow-lg" />
            ) : (
              (() => {
                const IconComponent = icon as any;
                return <IconComponent className="w-10 h-10 text-white drop-shadow-lg" />;
              })()
            )}
          </div>
          {/* Lock icon for premium-only modes when user is not premium */}
          {requiresPremium && !isPremium && (
            <div className="w-8 h-8 bg-black/50 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20">
              <Lock className="w-4 h-4 text-white" />
            </div>
          )}
          
          {/* Ticket badge for all-in mode */}
          {mode === "all-in" && ticketCount !== undefined && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-white/20" data-testid="ticket-badge">
              <Ticket className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-medium" data-testid="ticket-count">{ticketCount}</span>
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-2xl font-normal text-black mb-3 leading-tight" data-testid={`mode-title-${mode}`}>
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