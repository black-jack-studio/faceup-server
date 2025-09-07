import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { ArrowLeft, Users, Clock, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

export default function CashGames() {
  const [, navigate] = useLocation();
  const [gameStarted, setGameStarted] = useState(false);
  const startGame = useGameStore((state) => state.startGame);
  const user = useUserStore((state) => state.user);

  const handleStartGame = () => {
    startGame("cash");
    setGameStarted(true);
  };

  if (gameStarted) {
    return <BlackjackTable gameMode="cash" />;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mr-3 text-white hover:bg-muted"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Cash Games</h1>
        </div>

        {/* Balance Display */}
        <motion.div
          className="mb-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-muted-foreground mb-2">Your Balance</p>
          <h2 className="text-3xl font-bold text-yellow-400" data-testid="balance-display">
            <i className="fas fa-coins mr-2" />
            {user?.coins?.toLocaleString() || "0"}
          </h2>
        </motion.div>

        {/* Game Tables */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-card border-border gradient-cash-games">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Beginner Table
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-white/80 text-sm">Min Bet: 10</p>
                    <p className="text-white/80 text-sm">Max Bet: 100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      ~2 min/hand
                    </p>
                    <p className="text-white/80 text-sm flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      95% RTP
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleStartGame}
                  className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold"
                  disabled={!user?.coins || user.coins < 10}
                  data-testid="button-join-beginner"
                >
                  Join Table
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-card border-border opacity-60">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Intermediate Table
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-white/80 text-sm">Min Bet: 50</p>
                    <p className="text-white/80 text-sm">Max Bet: 500</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      ~3 min/hand
                    </p>
                    <p className="text-white/80 text-sm flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      96% RTP
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-muted text-muted-foreground cursor-not-allowed"
                  disabled
                  data-testid="button-join-intermediate"
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-card border-border opacity-60">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  High Stakes Table
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-white/80 text-sm">Min Bet: 250</p>
                    <p className="text-white/80 text-sm">Max Bet: 2,500</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      ~4 min/hand
                    </p>
                    <p className="text-white/80 text-sm flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      97% RTP
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-muted text-muted-foreground cursor-not-allowed"
                  disabled
                  data-testid="button-join-high-stakes"
                >
                  Coming Soon
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Warning */}
        <motion.div
          className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <p className="text-amber-400 text-sm text-center">
            <i className="fas fa-exclamation-triangle mr-2" />
            This is play money only. No real money gambling.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
