import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";

export default function Practice() {
  const { t } = useTranslation("practice");
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
          <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        </div>

        {/* Practice Options */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-white/10 via-white/5 to-purple-500/20 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">{t("basicStrategyTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {t("basicStrategyBody")}
                </p>
                <Button
                  onClick={handleStartPractice}
                  className="w-full bg-white hover:bg-white/90 text-[#15161A]"
                  data-testid="button-start-practice"
                >
                  {t("startTraining")}
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
                <CardTitle className="text-white">{t("gameRulesTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t("dealerStandsOn")}</span>
                    <span className="text-white">{t("dealerStandsOnValue")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("blackjackPays")}</span>
                    <span className="text-white">3:2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("doubleAfterSplit")}</span>
                    <span className="text-white">{t("yes")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("surrender")}</span>
                    <span className="text-white">{t("surrenderValue")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("numberOfDecks")}</span>
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
                <CardTitle className="text-white">{t("tipsTitle")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• {t("tip1")}</li>
                  <li>• {t("tip2")}</li>
                  <li>• {t("tip3")}</li>
                  <li>• {t("tip4")}</li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
