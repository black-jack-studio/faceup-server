import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Leaf, Flame, Gem, Star, Target, Clock, TrendingUp } from "lucide-react";
import coinImage from "@assets/coins_1757366059535.png";
import { queryClient } from "@/lib/queryClient";

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
      return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30';
    case 'medium':
      return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
    case 'hard':
      return 'text-rose-400 bg-rose-500/20 border-rose-500/30';
    default:
      return 'text-slate-400 bg-slate-500/20 border-slate-500/30';
  }
};

const getDifficultyIcon = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return <Leaf className="w-3 h-3" />;
    case 'medium':
      return <Flame className="w-3 h-3" />;
    case 'hard':
      return <Gem className="w-3 h-3" />;
    default:
      return <Star className="w-3 h-3" />;
  }
};

const getProgressGradient = (difficulty: string) => {
  switch (difficulty) {
    case 'easy':
      return 'from-emerald-500 to-emerald-400';
    case 'medium':
      return 'from-amber-500 to-amber-400';
    case 'hard':
      return 'from-rose-500 to-rose-400';
    default:
      return 'from-blue-500 to-blue-400';
  }
};

export default function Challenges() {
  const { data: userChallenges = [], isLoading } = useQuery({
    queryKey: ["/api/challenges/user"],
  });

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  // Fetch remaining time from API and update every second
  useEffect(() => {
    const fetchTimeLeft = async () => {
      try {
        const response = await fetch('/api/challenges/time-until-reset');
        const data = await response.json();
        setTimeLeft(data);
      } catch (error) {
        console.error('Error fetching remaining time:', error);
      }
    };

    // Fetch initial time
    fetchTimeLeft();

    // Update countdown every second
    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime.seconds > 0) {
          return { ...prevTime, seconds: prevTime.seconds - 1 };
        } else if (prevTime.minutes > 0) {
          return { hours: prevTime.hours, minutes: prevTime.minutes - 1, seconds: 59 };
        } else if (prevTime.hours > 0) {
          return { hours: prevTime.hours - 1, minutes: 59, seconds: 59 };
        } else {
          // Time elapsed, reload challenges
          fetchTimeLeft();
          // Invalidate challenge cache to reload them
          queryClient.invalidateQueries({ queryKey: ["/api/challenges/user"] });
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <motion.div 
        className="bg-black rounded-3xl p-6 border border-white/20 backdrop-blur-sm"
        style={{ backgroundColor: '#000000' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-3 mb-8">
          <div className="p-2 rounded-xl bg-white/10">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Daily Challenges</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <motion.div 
              key={i} 
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/20"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="w-40 h-5 bg-white/20 animate-pulse rounded-lg mb-3" />
                  <div className="w-32 h-4 bg-white/15 animate-pulse rounded mb-3" />
                  <div className="w-20 h-3 bg-white/10 animate-pulse rounded" />
                </div>
                <div className="w-16 h-8 bg-white/20 animate-pulse rounded-xl" />
              </div>
              <div className="w-full h-3 bg-white/10 animate-pulse rounded-full" />
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  if ((userChallenges as UserChallenge[]).length === 0) {
    return (
      <motion.div 
        className="bg-black rounded-3xl p-8 border border-white/20 backdrop-blur-sm text-center"
        style={{ backgroundColor: '#000000' }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="p-4 rounded-2xl bg-white/10 w-fit mx-auto mb-6"
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Target className="w-12 h-12 text-white" />
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-3">All challenges completed!</h3>
        <p className="text-white/70 mb-8 text-lg">
          Great work! New challenges reset at midnight.
        </p>
        <motion.div 
          className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 rounded-2xl px-6 py-4 inline-flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <div className="text-sm text-white/80">New challenges in:</div>
          </div>
          <div className="text-white font-mono text-2xl font-bold tracking-wider">
            {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className="bg-black rounded-3xl p-6 border border-white/20 backdrop-blur-sm"
      style={{ backgroundColor: '#000000' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-white/10">
            <Target className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Daily Challenges</h2>
        </div>
      </div>

      <div className="space-y-6">
        {(userChallenges as UserChallenge[])
          .filter((userChallenge: UserChallenge) => !userChallenge.isCompleted)
          .map((userChallenge: UserChallenge, index: number) => {
          const progress = Math.min((userChallenge.currentProgress / userChallenge.challenge.targetValue) * 100, 100);
          const isCompleted = userChallenge.isCompleted;
          
          return (
            <motion.div
              key={userChallenge.id}
              className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:border-white/30 transition-all duration-300"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
            >
              {/* Challenge Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-1.5 rounded-lg border ${getDifficultyColor(userChallenge.challenge.difficulty)}`}>
                      {getDifficultyIcon(userChallenge.challenge.difficulty)}
                    </div>
                    <h3 className="font-bold text-white text-base" data-testid={`challenge-title-${index}`}>
                      {userChallenge.challenge.title}
                    </h3>
                  </div>
                  <p className="text-sm text-white/80 mb-3 leading-relaxed">
                    {userChallenge.challenge.description}
                  </p>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4 text-blue-400" />
                      <span className="text-white font-semibold">
                        {userChallenge.currentProgress}/{userChallenge.challenge.targetValue}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wide ${getDifficultyColor(userChallenge.challenge.difficulty)}`}>
                      {userChallenge.challenge.difficulty}
                    </span>
                  </div>
                </div>
                
                {/* Reward */}
                <div className="flex flex-col items-end">
                  <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl px-3 py-2">
                    <div className="flex items-center space-x-2">
                      <img src={coinImage} alt="Coin" className="w-4 h-4" />
                      <span className="text-sm font-bold text-yellow-400" data-testid={`challenge-reward-${index}`}>
                        {userChallenge.challenge.reward}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-white/60">Progress</span>
                  <span className="text-xs text-white font-semibold">{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${getProgressGradient(userChallenge.challenge.difficulty)} relative`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1.2, delay: index * 0.15, ease: "easeOut" }}
                    data-testid={`challenge-progress-${index}`}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Countdown Timer */}
      <motion.div 
        className="mt-8 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/20 rounded-2xl p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-center space-x-3">
          <div className="p-2 rounded-lg bg-white/10">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-center">
            <div className="text-xs text-white/60 mb-1">New challenges reset in</div>
            <div className="text-white font-mono text-lg font-bold tracking-wider">
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}