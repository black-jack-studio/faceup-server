import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import { Crown, Gem, User } from "@/icons";
import CoinsBadge from "@/components/CoinsBadge";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import AvatarSelector from "@/components/AvatarSelector";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ChangeUsernameModal from "@/components/ChangeUsernameModal";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import keyIcon from "@assets/key_3d_1757364033839.png";
import shieldIcon from "@assets/shield_3d_1757364125393.png";
import signOutIcon from "@assets/outbox_tray_3d_1757364387965.png";
import barChartIcon from "@assets/bar_chart_3d_1757364609374.png";

export default function Profile() {
  const [, navigate] = useLocation();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/stats/summary"],
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };


  const currentLevel = user ? Math.floor((user.xp || 0) / 1000) + 1 : 1;
  const levelProgress = user ? ((user.xp || 0) % 1000) / 10 : 0;
  const xpToNextLevel = user ? 1000 - ((user.xp || 0) % 1000) : 1000;
  
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mr-3 text-white hover:bg-white/10 rounded-xl p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-black text-white tracking-tight">Profile</h1>
          </div>
        </motion.div>

        {/* User Info */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="relative inline-block mb-6">
            <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
              <DialogTrigger asChild>
                <button className="group relative" data-testid="button-change-avatar">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mx-auto halo group-hover:scale-105 transition-transform duration-200">
                    {currentAvatar ? (
                      <img 
                        src={currentAvatar.image} 
                        alt={currentAvatar.name}
                        className="w-20 h-20 object-contain rounded-2xl"
                      />
                    ) : (
                      <span className="text-4xl font-black text-white">
                        {user?.username?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg group-hover:scale-110 transition-transform">
                    <Edit className="w-3 h-3 text-gray-800" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-ink border border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogTitle className="sr-only">Sélectionner un avatar</DialogTitle>
                <AvatarSelector 
                  currentAvatarId={user?.selectedAvatarId || 'face-with-tears-of-joy'}
                  onAvatarSelect={() => setIsAvatarDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex items-center justify-center space-x-3 mb-2">
            <h2 className="text-2xl font-bold text-white" data-testid="profile-username">
              {user?.username}
            </h2>
            <ChangeUsernameModal>
              <button className="group p-1.5 hover:bg-white/10 rounded-lg transition-colors" data-testid="button-edit-username">
                <Edit className="w-4 h-4 text-white/60 hover:text-white transition-colors group-hover:scale-110" />
              </button>
            </ChangeUsernameModal>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <Crown className="w-5 h-5 text-accent-green" />
              <p className="text-accent-green font-bold text-lg">
                Level {currentLevel}
              </p>
            </div>
            <div className="bg-white/10 rounded-full h-3 overflow-hidden mb-3">
              <motion.div 
                className="bg-gradient-to-r from-accent-green to-emerald-400 h-full rounded-full halo"
                initial={{ width: 0 }}
                animate={{ width: `${levelProgress}%` }}
                transition={{ duration: 1.2, delay: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">{(user?.xp || 0).toLocaleString()} XP</span>
              <span className="text-white/70">{xpToNextLevel} to next level</span>
            </div>
          </div>
        </motion.div>


        {/* Stats Cards */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
            <img src={barChartIcon} alt="Bar Chart" className="w-6 h-6 mr-3" />
            Game Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <p className="text-3xl font-black text-accent-gold mb-2" data-testid="stat-wins">
                {(stats as any)?.handsWon || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Hands Won</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <p className="text-3xl font-black text-accent-green mb-2" data-testid="stat-winrate">
                {(stats as any)?.handsWon ? (((stats as any).handsWon / ((stats as any).handsPlayed || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/80 font-semibold">Win Rate</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <p className="text-3xl font-black text-blue-400 mb-2" data-testid="stat-accuracy">
                {(stats as any)?.correctDecisions ? (((stats as any).correctDecisions / ((stats as any).totalDecisions || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/80 font-semibold">Decision Accuracy</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-sm text-center">
              <p className="text-3xl font-black text-accent-purple mb-2" data-testid="stat-blackjacks">
                {(stats as any)?.blackjacks || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Blackjacks</p>
            </div>
          </div>
        </motion.section>


        {/* Account Actions */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="space-y-4">
            <ChangePasswordModal>
              <motion.button
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
                data-testid="button-change-password"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center space-x-2">
                  <img src={keyIcon} alt="Key" className="w-5 h-5" />
                  <span className="text-white font-bold">Change Password</span>
                </div>
              </motion.button>
            </ChangePasswordModal>
            
            <motion.button
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
              data-testid="button-privacy"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <img src={shieldIcon} alt="Shield" className="w-5 h-5" />
                <span className="text-white font-bold">Privacy Settings</span>
              </div>
            </motion.button>
            
            <motion.button
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-left transition-colors"
              onClick={handleLogout}
              data-testid="button-logout"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <img src={signOutIcon} alt="Sign Out" className="w-5 h-5" />
                <span className="text-red-400 font-bold">Sign Out</span>
              </div>
            </motion.button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}