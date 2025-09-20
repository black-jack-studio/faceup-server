import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Target } from "lucide-react";
import { Lightning } from "@/icons";

interface Challenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  reward: {
    type: "coins" | "gems" | "xp";
    amount: number;
  };
  claimed: boolean;
}

const initialChallenges: Challenge[] = [
  {
    id: "win-streak-3",
    title: "Win Streak",
    description: "Win 3 hands in a row",
    target: 3,
    progress: 0,
    reward: { type: "coins", amount: 500 },
    claimed: false,
  },
  {
    id: "natural-21",
    title: "Natural 21",
    description: "Get a natural blackjack (21 with 2 cards)",
    target: 1,
    progress: 0,
    reward: { type: "gems", amount: 10 },
    claimed: false,
  },
  {
    id: "beat-dealer-20",
    title: "High Score Victory",
    description: "Beat the dealer with a score of 20 or higher",
    target: 5,
    progress: 2,
    reward: { type: "xp", amount: 200 },
    claimed: false,
  },
];

export default function ChallengesMode() {
  const [, navigate] = useLocation();
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const setMode = useGameStore((state) => state.setMode);
  const addCoins = useUserStore((state) => state.addCoins);
  const addGems = useUserStore((state) => state.addGems);
  const addSeasonXP = useUserStore((state) => state.addSeasonXP);

  useEffect(() => {
    setMode("challenges");
    // Load challenges from localStorage
    const savedChallenges = localStorage.getItem('challenges');
    if (savedChallenges) {
      setChallenges(JSON.parse(savedChallenges));
    }
  }, [setMode]);

  const handleBack = () => {
    navigate("/");
  };

  const handleStartPlaying = () => {
    // Save challenges and go to table
    localStorage.setItem('challenges', JSON.stringify(challenges));
    navigate("/cash-games");
  };

  const handleClaimReward = (challengeId: string) => {
    setChallenges(prev => {
      const updated = prev.map(challenge => {
        if (challenge.id === challengeId && challenge.progress >= challenge.target && !challenge.claimed) {
          // Award the reward
          switch (challenge.reward.type) {
            case "coins":
              addCoins(challenge.reward.amount);
              break;
            case "gems":
              addGems(challenge.reward.amount);
              break;
            case "xp":
              addSeasonXP(challenge.reward.amount);
              break;
          }
          return { ...challenge, claimed: true };
        }
        return challenge;
      });
      localStorage.setItem('challenges', JSON.stringify(updated));
      return updated;
    });
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "coins": return "🪙";
      case "gems": return "💎";
      case "xp": return "⭐";
      default: return "🎁";
    }
  };

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <div className="px-6 py-12">
        <motion.button
          onClick={handleBack}
          className="flex items-center space-x-2 text-white/60 hover:text-white mb-8 transition-colors"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Home</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-accent-green/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Lightning className="w-10 h-10 text-accent-green" />
            </div>
            <h1 className="text-3xl font-bold mb-4" data-testid="title-challenges">Daily Challenges</h1>
            <p className="text-white/80 max-w-md mx-auto">
              Complete challenges to earn extra rewards. Progress is tracked while you play.
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4 mb-8">
            {challenges.map((challenge, index) => (
              <motion.div
                key={challenge.id}
                className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                data-testid={`challenge-${challenge.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-accent-green/20 rounded-xl flex items-center justify-center">
                      <Target className="w-6 h-6 text-accent-green" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white" data-testid={`challenge-title-${challenge.id}`}>
                        {challenge.title}
                      </h3>
                      <p className="text-white/60 text-sm">{challenge.description}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xl">{getRewardIcon(challenge.reward.type)}</span>
                      <span className="font-bold text-accent-gold">
                        {challenge.reward.amount.toLocaleString('fr-FR', { 
                          maximumFractionDigits: 0,
                          notation: 'standard' 
                        })}
                      </span>
                    </div>
                    <p className="text-white/60 text-xs capitalize">{challenge.reward.type}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white/60 text-sm">Progress</span>
                    <span className="font-bold text-white" data-testid={`challenge-progress-${challenge.id}`}>
                      {challenge.progress}/{challenge.target}
                    </span>
                  </div>
                  <div className="w-full bg-black/30 rounded-full h-2">
                    <motion.div
                      className="bg-accent-green h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${getProgressPercentage(challenge.progress, challenge.target)}%` }}
                      transition={{ duration: 0.8, delay: 0.2 * index }}
                    />
                  </div>
                </div>

                {challenge.claimed ? (
                  <div className="flex items-center justify-center py-3 bg-accent-green/20 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-accent-green mr-2" />
                    <span className="text-accent-green font-bold">Claimed</span>
                  </div>
                ) : challenge.progress >= challenge.target ? (
                  <motion.button
                    onClick={() => handleClaimReward(challenge.id)}
                    className="w-full py-3 bg-accent-green hover:bg-accent-green/80 text-ink font-bold rounded-2xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    data-testid={`button-claim-${challenge.id}`}
                  >
                    Claim Reward
                  </motion.button>
                ) : (
                  <div className="w-full py-3 bg-white/10 text-white/60 font-bold rounded-2xl text-center">
                    In Progress
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="text-center">
            <motion.button
              onClick={handleStartPlaying}
              className="bg-accent-green hover:bg-accent-green/80 text-ink font-bold py-4 px-8 rounded-2xl transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-start-playing"
            >
              Start Playing
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}