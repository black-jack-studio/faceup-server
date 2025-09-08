import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import { Crown, Gem, User } from "@/icons";
import CoinsBadge from "@/components/CoinsBadge";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import AvatarSelector from "@/components/AvatarSelector";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

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

  const achievements = [
    { id: 1, name: "First Win", description: "Win your first hand", unlocked: true, icon: "🏆" },
    { id: 2, name: "Hot Streak", description: "Win 5 hands in a row", unlocked: true, icon: "🔥" },
    { id: 3, name: "Blackjack Master", description: "Get 10 natural blackjacks", unlocked: false, icon: "♠️" },
    { id: 4, name: "Counter", description: "Maintain 90% counting accuracy for 100 cards", unlocked: false, icon: "🧮" },
  ];

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}}
            className="text-white hover:bg-white/10 rounded-xl p-2"
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
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
                  <div className="absolute -bottom-2 -right-2 bg-accent-gold rounded-2xl p-2 group-hover:bg-accent-gold/80 transition-colors">
                    <Crown className="w-6 h-6 text-ink" />
                  </div>
                  <div className="absolute top-0 right-0 bg-accent-green rounded-2xl p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit className="w-4 h-4 text-ink" />
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent className="bg-ink border border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
                <AvatarSelector 
                  currentAvatarId={user?.selectedAvatarId || 'face-with-tears-of-joy'}
                  onAvatarSelect={() => setIsAvatarDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2" data-testid="profile-username">
            {user?.username}
          </h2>
          
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

        {/* Balance Display */}
        <motion.div
          className="grid grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
            <div className="flex justify-center mb-3">
              <CoinsBadge amount={user?.coins || 0} glow size="lg" />
            </div>
            <p className="text-sm text-white/60 font-medium">Total Coins</p>
          </div>
          
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
            <Gem className="w-8 h-8 text-accent-purple mx-auto mb-3" />
            <p className="text-2xl font-black text-accent-purple mb-1">
              {user?.gems?.toLocaleString() || "0"}
            </p>
            <p className="text-sm text-white/60 font-medium">Gems</p>
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
            <div className="w-8 h-8 bg-accent-green/20 rounded-xl flex items-center justify-center mr-3">
              <span className="text-accent-green text-xl">📊</span>
            </div>
            Game Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
              <div className="w-12 h-12 bg-accent-gold/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🏆</span>
              </div>
              <p className="text-2xl font-black text-white mb-1" data-testid="stat-wins">
                {(stats as any)?.handsWon || 0}
              </p>
              <p className="text-sm text-white/60 font-medium">Hands Won</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
              <div className="w-12 h-12 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📈</span>
              </div>
              <p className="text-2xl font-black text-accent-green mb-1" data-testid="stat-winrate">
                {(stats as any)?.handsWon ? (((stats as any).handsWon / ((stats as any).handsPlayed || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/60 font-medium">Win Rate</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
              <div className="w-12 h-12 bg-blue-400/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <p className="text-2xl font-black text-blue-400 mb-1" data-testid="stat-accuracy">
                {(stats as any)?.correctDecisions ? (((stats as any).correctDecisions / ((stats as any).totalDecisions || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/60 font-medium">Decision Accuracy</p>
            </div>
            
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm text-center">
              <div className="w-12 h-12 bg-accent-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">♠️</span>
              </div>
              <p className="text-2xl font-black text-accent-purple mb-1" data-testid="stat-blackjacks">
                {(stats as any)?.blackjacks || 0}
              </p>
              <p className="text-sm text-white/60 font-medium">Blackjacks</p>
            </div>
          </div>
        </motion.section>

        {/* Achievements */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
            <div className="w-8 h-8 bg-accent-gold/20 rounded-xl flex items-center justify-center mr-3">
              <span className="text-accent-gold text-xl">🏅</span>
            </div>
            Achievements
          </h3>
          
          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                className={`bg-white/5 rounded-2xl p-4 border backdrop-blur-sm ${
                  achievement.unlocked 
                    ? 'border-accent-green/50 halo' 
                    : 'border-white/10'
                }`}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    achievement.unlocked 
                      ? 'bg-accent-green/20' 
                      : 'bg-white/10'
                  }`}>
                    <span 
                      className={`text-2xl ${
                        achievement.unlocked ? '' : 'grayscale opacity-50'
                      }`}
                    >
                      {achievement.icon}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg mb-1 ${
                      achievement.unlocked ? 'text-white' : 'text-white/50'
                    }`}>
                      {achievement.name}
                    </h4>
                    <p className="text-sm text-white/60">
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.unlocked && (
                    <div className="w-8 h-8 rounded-2xl bg-accent-green flex items-center justify-center">
                      <span className="text-ink text-lg">✓</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
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
            <motion.button
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left flex items-center space-x-4 transition-colors"
              data-testid="button-change-password"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="w-10 h-10 bg-blue-400/20 rounded-xl flex items-center justify-center">
                <span className="text-blue-400 text-lg">🔑</span>
              </div>
              <span className="text-white font-bold">Change Password</span>
            </motion.button>
            
            <motion.button
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left flex items-center space-x-4 transition-colors"
              data-testid="button-privacy"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="w-10 h-10 bg-accent-purple/20 rounded-xl flex items-center justify-center">
                <span className="text-accent-purple text-lg">🛡️</span>
              </div>
              <span className="text-white font-bold">Privacy Settings</span>
            </motion.button>
            
            <motion.button
              className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-left flex items-center space-x-4 transition-colors"
              onClick={handleLogout}
              data-testid="button-logout"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <span className="text-red-400 text-lg">🚪</span>
              </div>
              <span className="text-red-400 font-bold">Sign Out</span>
            </motion.button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}