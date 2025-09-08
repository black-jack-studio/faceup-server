import { useState } from "react";
import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Trophy, Users, Clock, ArrowLeft } from "lucide-react";

const tournaments = [
  {
    id: "demo-cup",
    name: "Demo Cup",
    buyIn: 500,
    players: 8,
    prize: 3000,
    duration: "10 hands",
    status: "open" as const,
  },
  {
    id: "evening-championship",
    name: "Evening Championship",
    buyIn: 1500,
    players: 16,
    prize: 15000,
    duration: "15 hands",
    status: "starting-soon" as const,
  },
  {
    id: "weekend-special",
    name: "Weekend Special",
    buyIn: 2500,
    players: 12,
    prize: 20000,
    duration: "20 hands",
    status: "full" as const,
  },
];

export default function TournamentsMode() {
  const [, navigate] = useLocation();
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const setMode = useGameStore((state) => state.setMode);
  const user = useUserStore((state) => state.user);
  const spendCoins = useUserStore((state) => state.spendCoins);

  useEffect(() => {
    setMode("tournaments");
  }, [setMode]);

  const handleBack = () => {
    navigate("/");
  };

  const handleJoinTournament = (tournament: typeof tournaments[0]) => {
    if ((user?.coins || 0) >= tournament.buyIn) {
      if (spendCoins(tournament.buyIn)) {
        // Stocker l'info du tournoi et rediriger vers la table
        localStorage.setItem('currentTournament', JSON.stringify(tournament));
        navigate("/cash-games");
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "text-accent-green";
      case "starting-soon": return "text-accent-gold";
      case "full": return "text-red-400";
      default: return "text-white/60";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "open": return "Open";
      case "starting-soon": return "Starting Soon";
      case "full": return "Full";
      default: return status;
    }
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
            <div className="w-20 h-20 bg-accent-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-accent-purple" />
            </div>
            <h1 className="text-3xl font-bold mb-4" data-testid="title-tournaments">Tournaments</h1>
            <p className="text-white/80 max-w-md mx-auto">
              Compete against other players in structured tournaments. Winner takes the biggest share!
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-4">
            {tournaments.map((tournament, index) => (
              <motion.div
                key={tournament.id}
                className="bg-gradient-to-br from-purple-500/25 via-pink-500/20 to-violet-600/25 rounded-3xl p-6 border border-purple-500/30 backdrop-blur-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                data-testid={`tournament-${tournament.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1" data-testid={`tournament-name-${tournament.id}`}>
                      {tournament.name}
                    </h3>
                    <p className={`text-sm font-medium ${getStatusColor(tournament.status)}`}>
                      {getStatusText(tournament.status)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-accent-gold" data-testid={`tournament-prize-${tournament.id}`}>
                      {tournament.prize.toLocaleString()}
                    </p>
                    <p className="text-white/60 text-sm">Prize Pool</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-black/20 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Clock className="w-4 h-4 text-white/60" />
                    </div>
                    <p className="text-white/60 text-xs">Duration</p>
                    <p className="font-bold text-white">{tournament.duration}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <Users className="w-4 h-4 text-white/60" />
                    </div>
                    <p className="text-white/60 text-xs">Players</p>
                    <p className="font-bold text-white">{tournament.players}</p>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 text-center">
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-white/60">💰</span>
                    </div>
                    <p className="text-white/60 text-xs">Buy-in</p>
                    <p className="font-bold text-white">{tournament.buyIn.toLocaleString()}</p>
                  </div>
                </div>

                <motion.button
                  onClick={() => handleJoinTournament(tournament)}
                  disabled={tournament.status !== "open" || (user?.coins || 0) < tournament.buyIn}
                  className={`w-full py-3 rounded-2xl font-bold transition-all ${
                    tournament.status === "open" && (user?.coins || 0) >= tournament.buyIn
                      ? "bg-accent-purple hover:bg-accent-purple/80 text-white"
                      : "bg-white/10 text-white/40 cursor-not-allowed"
                  }`}
                  whileHover={
                    tournament.status === "open" && (user?.coins || 0) >= tournament.buyIn
                      ? { scale: 1.02 }
                      : {}
                  }
                  whileTap={
                    tournament.status === "open" && (user?.coins || 0) >= tournament.buyIn
                      ? { scale: 0.98 }
                      : {}
                  }
                  data-testid={`button-join-${tournament.id}`}
                >
                  {tournament.status === "open"
                    ? (user?.coins || 0) >= tournament.buyIn
                      ? "Join Tournament"
                      : "Not Enough Coins"
                    : tournament.status === "full"
                    ? "Tournament Full"
                    : "Starting Soon"}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}