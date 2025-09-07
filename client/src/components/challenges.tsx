import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

interface Challenge {
  id: string;
  challengeType: string;
  title: string;
  description: string;
  targetValue: number;
  reward: number;
  difficulty: string;
}

interface UserChallenge {
  id: string;
  currentProgress: number;
  isCompleted: boolean;
  challenge: Challenge;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'text-green-400 bg-green-400/20';
    case 'medium':
      return 'text-yellow-400 bg-yellow-400/20';
    case 'hard':
      return 'text-red-400 bg-red-400/20';
    default:
      return 'text-gray-400 bg-gray-400/20';
  }
};

const getDifficultyIcon = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return '🌱';
    case 'medium':
      return '🔥';
    case 'hard':
      return '💎';
    default:
      return '⭐';
  }
};

export default function Challenges() {
  const { data: userChallenges = [], isLoading } = useQuery({
    queryKey: ["/api/challenges/user"],
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glassmorphism rounded-2xl p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="w-32 h-4 bg-muted animate-pulse rounded mb-2" />
                <div className="w-24 h-3 bg-muted animate-pulse rounded" />
              </div>
              <div className="w-16 h-6 bg-muted animate-pulse rounded" />
            </div>
            <div className="w-full h-2 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if ((userChallenges as UserChallenge[]).length === 0) {
    return (
      <div className="glassmorphism rounded-2xl p-6 text-center">
        <div className="text-4xl mb-2">🎯</div>
        <h3 className="text-lg font-semibold text-white mb-2">Aucun défi disponible</h3>
        <p className="text-sm text-muted-foreground">
          De nouveaux défis apparaissent toutes les 24h !
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Défis quotidiens</h2>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <i className="fas fa-clock" />
          <span>24h</span>
        </div>
      </div>

      <div className="space-y-3">
        {(userChallenges as UserChallenge[]).map((userChallenge: UserChallenge, index: number) => {
          const progress = Math.min((userChallenge.currentProgress / userChallenge.challenge.targetValue) * 100, 100);
          const isCompleted = userChallenge.isCompleted;
          
          return (
            <motion.div
              key={userChallenge.id}
              className={`glassmorphism rounded-2xl p-4 ${isCompleted ? 'bg-green-500/10 border border-green-500/30' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              data-testid={`challenge-${index}`}
            >
              {isCompleted ? (
                // Affichage simple pour les défis terminés
                <div className="flex items-center justify-center h-20">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="text-center"
                  >
                    <div className="text-4xl font-bold text-green-400 mb-1">
                      TERMINÉ
                    </div>
                    <div className="text-sm text-green-300">
                      +{userChallenge.challenge.reward} pièces
                    </div>
                  </motion.div>
                </div>
              ) : (
                // Affichage normal pour les défis en cours
                <>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-lg">{getDifficultyIcon(userChallenge.challenge.difficulty)}</span>
                        <h3 className="font-semibold text-white text-sm" data-testid={`challenge-title-${index}`}>
                          {userChallenge.challenge.title}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {userChallenge.challenge.description}
                      </p>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-white font-medium">
                          {userChallenge.currentProgress}/{userChallenge.challenge.targetValue}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(userChallenge.challenge.difficulty)}`}>
                          {userChallenge.challenge.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <div className="flex items-center space-x-1 text-yellow-400">
                        <i className="fas fa-coins text-xs" />
                        <span className="text-sm font-semibold" data-testid={`challenge-reward-${index}`}>
                          {userChallenge.challenge.reward}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-blue-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                      data-testid={`challenge-progress-${index}`}
                    />
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 glassmorphism rounded-xl">
        <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
          <i className="fas fa-sync-alt" />
          <span>Nouveaux défis dans 24h</span>
        </div>
      </div>
    </div>
  );
}