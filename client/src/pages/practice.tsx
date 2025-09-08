import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Practice() {
  const [, navigate] = useLocation();
  const [gameStarted, setGameStarted] = useState(false);
  const startGame = useGameStore((state) => state.startGame);

  const handleStartPractice = () => {
    startGame("practice");
    setGameStarted(true);
  };

  if (gameStarted) {
    return <BlackjackTable gameMode="practice" />;
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
          <h1 className="text-2xl font-bold text-white">Practice Mode</h1>
        </div>

        {/* Practice Options */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-purple-500/20 border-blue-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Basic Strategy Training</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Learn optimal blackjack decisions with real-time feedback on every hand.
                </p>
                <Button
                  onClick={handleStartPractice}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                  data-testid="button-start-practice"
                >
                  Start Training
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-teal-500/20 border-emerald-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Game Rules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Dealer stands on:</span>
                    <span className="text-white">Soft 17</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Blackjack pays:</span>
                    <span className="text-white">3:2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Double after split:</span>
                    <span className="text-white">Yes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Surrender:</span>
                    <span className="text-white">Late</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Number of decks:</span>
                    <span className="text-white">6</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-purple-500/20 via-violet-500/15 to-pink-500/20 border-purple-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Practice Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Follow the highlighted optimal decisions</li>
                  <li>• Review your mistakes after each hand</li>
                  <li>• Use keyboard shortcuts: H (Hit), S (Stand), D (Double), P (Split)</li>
                  <li>• Focus on learning basic strategy patterns</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
