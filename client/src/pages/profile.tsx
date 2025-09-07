import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Settings, Trophy, TrendingUp, Target } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";

export default function Profile() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const { data: stats } = useQuery({
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

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mr-3 text-white hover:bg-muted"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-white">Profile</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {}}
            className="text-white hover:bg-muted"
            data-testid="button-settings"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* User Info */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2" data-testid="profile-username">
            {user?.username}
          </h2>
          <p className="text-muted-foreground">
            Level {user ? Math.floor(user.xp / 1000) + 1 : 1} • {user?.xp?.toLocaleString()} XP
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.section
          className="grid grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white" data-testid="stat-wins">
                {stats?.handsWon || 0}
              </p>
              <p className="text-xs text-muted-foreground">Hands Won</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white" data-testid="stat-winrate">
                {stats ? ((stats.handsWon / (stats.handsPlayed || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white" data-testid="stat-accuracy">
                {stats ? ((stats.correctDecisions / (stats.totalDecisions || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Decision Accuracy</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <i className="fas fa-playing-card text-purple-400 text-2xl mb-2 block" />
              <p className="text-2xl font-bold text-white" data-testid="stat-blackjacks">
                {stats?.blackjacks || 0}
              </p>
              <p className="text-xs text-muted-foreground">Blackjacks</p>
            </CardContent>
          </Card>
        </motion.section>

        {/* Achievements */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Achievements</h3>
          <div className="space-y-3">
            {achievements.map((achievement, index) => (
              <Card 
                key={achievement.id} 
                className={`bg-card border-border ${achievement.unlocked ? 'border-green-500/50' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <span 
                      className={`text-2xl ${achievement.unlocked ? '' : 'grayscale opacity-50'}`}
                    >
                      {achievement.icon}
                    </span>
                    <div className="flex-1">
                      <h4 className={`font-medium ${achievement.unlocked ? 'text-white' : 'text-muted-foreground'}`}>
                        {achievement.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {achievement.description}
                      </p>
                    </div>
                    {achievement.unlocked && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <i className="fas fa-check text-white text-xs" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Account Actions */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:bg-muted"
              data-testid="button-change-password"
            >
              <i className="fas fa-key mr-3" />
              Change Password
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-border hover:bg-muted"
              data-testid="button-privacy"
            >
              <i className="fas fa-shield-alt mr-3" />
              Privacy Settings
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt mr-3" />
              Sign Out
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
