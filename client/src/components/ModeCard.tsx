import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import { GameMode } from "@/store/game-store";

interface ModeCardProps {
  // "coming-soon" covers the generic, non-clickable placeholder tile in the modes carousel,
  // which isn't backed by a real GameMode.
  mode: GameMode | "coming-soon";
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }> | string;
  gradient: string;
  // Overrides `gradient` with a raw CSS background — used for mesh-style gradients
  // (multiple radial blobs) that plain Tailwind from/via/to classes can't express.
  backgroundStyle?: React.CSSProperties;
  onClick: () => void;
  isPremium?: boolean;
  requiresPremium?: boolean;
  canPlay?: boolean;
  // Skips this card's own fade/slide-in — see home.tsx's useEnteredOnce. This duplicated
  // ModesCarousel's own per-card entrance animation on its wrapping motion.div (same shape,
  // same values), so without this it kept fading in a second time underneath that wrapper's
  // fix whenever Home remounted.
  skipEntrance?: boolean;
}

export default function ModeCard({ mode, title, subtitle, icon, gradient, backgroundStyle, onClick, isPremium = false, requiresPremium = false, canPlay = true, skipEntrance }: ModeCardProps) {
  return (
    <motion.div
      className={`flex-shrink-0 w-80 h-48 ${backgroundStyle ? '' : gradient} rounded-3xl p-6 border border-white/10 backdrop-blur-sm snap-center ${
        canPlay ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none'
      }`}
      style={backgroundStyle}
      initial={skipEntrance ? false : { opacity: 0, y: 20 }}
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