import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";

interface PlayerHeaderProps {
  total?: number;
  chips?: number;
  className?: string;
  showAvatar?: boolean;
  centerLayout?: boolean;
}

export default function PlayerHeader({
  total,
  chips,
  className,
  showAvatar = true,
  centerLayout = false
}: PlayerHeaderProps) {
  const user = useUserStore((state) => state.user);
  
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();

  return (
    <motion.div 
      className={cn("p-3", className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={`flex items-center gap-3 ${centerLayout ? 'justify-center' : 'justify-center'}`}>
        {/* Player Avatar - Always on the left when shown */}
        {showAvatar && (
          <div className="h-10 w-10 rounded-full bg-[#13151A] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
            {currentAvatar ? (
              <img 
                src={currentAvatar.image} 
                alt={currentAvatar.name}
                className="w-8 h-8 object-contain rounded-full"
              />
            ) : (
              <span className="text-xl">😊</span>
            )}
          </div>
        )}
        
        {/* Player Info */}
        <div className={centerLayout ? "text-left" : "text-center"}>
          <div className="text-white/90 font-medium text-base">
            {user?.username || 'You'}
          </div>
          {centerLayout && total !== undefined && (
            <div className="text-white/60 text-sm">
              Total: {total}
            </div>
          )}
          {!centerLayout && total !== undefined && (
            <div className="text-xs px-2 py-1 rounded-md text-white bg-[#232227]">
              Total: {total}
            </div>
          )}
        </div>
        
        {/* Optional chips display */}
        {chips !== undefined && (
          <div className="bg-[#13151A] rounded-xl ring-1 ring-white/10 px-2 py-1">
            <div className="text-[#F8CA5A] text-xs font-medium">
              {chips.toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}