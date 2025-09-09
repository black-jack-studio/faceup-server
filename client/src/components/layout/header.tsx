import { motion } from "framer-motion";
import { useUserStore } from "@/store/user-store";
import coinImage from "@assets/coins_1757366059535.png";
import gemImage from "@assets/image_1757366539717.png";

export default function Header() {
  const user = useUserStore((state) => state.user);

  return (
    <header className="px-6 pt-12 pb-6">
      <div className="flex items-center justify-between">
        <motion.div 
          className="flex items-center space-x-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <i className="fas fa-cube text-white text-sm"></i>
          </div>
          <span className="text-blue-400 font-medium" data-testid="header-level">
            {user?.level ?? 1}
          </span>
        </motion.div>
        
        <motion.div 
          className="flex items-center space-x-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center space-x-2">
            <img src={coinImage} alt="Coin" className="w-4 h-4" />
            <span className="text-yellow-400 font-medium" data-testid="header-coins">
              {user?.coins?.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <img src={gemImage} alt="Gem" className="w-4 h-4" />
            <span className="text-purple-400 font-medium" data-testid="header-gems">
              {user?.gems?.toLocaleString() || "0"}
            </span>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
