import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Pause, RotateCcw } from "lucide-react";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import PlayingCard from "@/components/game/card";
import { useCountingStore } from "@/lib/blackjack/counting";
import { useSelectedCardBack } from "@/hooks/use-selected-card-back";

export default function Counting() {
  const { t } = useTranslation("counting");
  const [, navigate] = useLocation();
  const [drillStarted, setDrillStarted] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [currentCard, setCurrentCard] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  
  const {
    runningCount,
    trueCount,
    cardsDealt,
    accuracy,
    speed,
    nextCard,
    resetDrill,
    recordCount,
  } = useCountingStore();

  // Get user's selected card back for consistent experience
  const { cardBackUrl } = useSelectedCardBack();

  const handleStartDrill = () => {
    setDrillStarted(true);
    setCurrentCard(nextCard());
    setIsRunning(true);
  };

  const handleCountSubmit = (increment: number) => {
    const newUserCount = userCount + increment;
    setUserCount(newUserCount);
    
    recordCount(newUserCount);
    
    if (isRunning) {
      setCurrentCard(nextCard());
    }
  };

  const handleReset = () => {
    resetDrill();
    setUserCount(0);
    setCurrentCard(null);
    setIsRunning(false);
    setDrillStarted(false);
  };

  if (!drillStarted) {
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

          {/* Counting System Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="bg-gradient-to-br from-orange-500/20 via-amber-500/15 to-yellow-500/20 border-orange-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">{t("hiLoSystem")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("lowCards")}</span>
                    <span className="text-green-400 font-semibold">+1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("neutral")}</span>
                    <span className="text-gray-400 font-semibold">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("highCards")}</span>
                    <span className="text-red-400 font-semibold">-1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Start Drill */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-gradient-to-br from-red-500/20 via-pink-500/15 to-rose-500/20 border-red-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">{t("countingDrill")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/80 mb-4">
                  {t("drillBody")}
                </p>
                <Button
                  onClick={handleStartDrill}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold"
                  data-testid="button-start-counting"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t("startCountingDrill")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md mx-auto">
        {/* Header with Stats */}
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
            <h1 className="text-xl font-bold text-white">{t("countingDrill")}</h1>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className="text-white hover:bg-muted"
              data-testid="button-pause"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-white hover:bg-muted"
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-muted-foreground text-xs">{t("accuracy")}</p>
              <p className="text-white font-semibold" data-testid="accuracy-display">
                {accuracy.toFixed(1)}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-muted-foreground text-xs">{t("speed")}</p>
              <p className="text-white font-semibold" data-testid="speed-display">
                {speed.toFixed(1)}/s
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className="text-muted-foreground text-xs">{t("cards")}</p>
              <p className="text-white font-semibold" data-testid="cards-display">
                {cardsDealt}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Card */}
        {currentCard && (
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            key={currentCard.id}
          >
            <PlayingCard
              suit={currentCard.suit}
              value={currentCard.value}
              isHidden={false}
              cardBackUrl={cardBackUrl}
            />
          </motion.div>
        )}

        {/* Count Display */}
        <div className="text-center mb-6">
          <p className="text-muted-foreground mb-2">{t("yourRunningCount")}</p>
          <h2 className="text-4xl font-bold text-white mb-2" data-testid="user-count">
            {userCount}
          </h2>
          <div className="flex justify-center space-x-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t("true")}</span>
              <span className="text-white" data-testid="true-count">
                {trueCount.toFixed(1)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">{t("actual")}</span>
              <span className="text-primary" data-testid="actual-count">
                {runningCount}
              </span>
            </div>
          </div>
        </div>

        {/* Count Buttons */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={() => handleCountSubmit(-1)}
            disabled={!isRunning}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 text-lg"
            data-testid="button-minus-one"
          >
            -1
          </Button>
          <Button
            onClick={() => handleCountSubmit(0)}
            disabled={!isRunning}
            className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-3 text-lg"
            data-testid="button-zero"
          >
            0
          </Button>
          <Button
            onClick={() => handleCountSubmit(1)}
            disabled={!isRunning}
            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg"
            data-testid="button-plus-one"
          >
            +1
          </Button>
        </div>
      </div>
    </div>
  );
}
