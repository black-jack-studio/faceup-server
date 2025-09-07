import { useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useChipsStore } from "@/store/chips-store";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Coins } from "lucide-react";

export default function HighStakesMode() {
  const [, navigate] = useLocation();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  
  const { setMode, startGame } = useGameStore();
  const user = useUserStore((state) => state.user);
  const { balance, deductBet, loadBalance } = useChipsStore();

  useEffect(() => {
    setMode("high-stakes");
    startGame("cash");
    loadBalance();
  }, [setMode, startGame, loadBalance]);

  const stakesOptions = [
    { amount: 5000, color: "bg-gradient-to-br from-accent-gold/30 to-yellow-400/20", label: "5 000" },
    { amount: 10000, color: "bg-gradient-to-br from-red-500/30 to-red-700/20", label: "10 000" },
  ];

  const minimumCoins = 5000;
  const hasEnoughCoins = (user?.coins || 0) >= minimumCoins;

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
  };

  const handleValidate = () => {
    if (selectedAmount && balance >= selectedAmount) {
      // Déduire la mise du solde
      deductBet(selectedAmount);
      // Naviguer vers la page de jeu avec le montant misé (même que le mode classique)
      navigate(`/play/game?bet=${selectedAmount}&mode=high-stakes`);
    }
  };

  const handleBack = () => {
    navigate("/");
  };

  const canAfford = (amount: number) => {
    return balance >= amount;
  };

  return (
    <div className="relative h-full w-full bg-[#0B0B0F] text-white min-h-screen overflow-hidden">
      <div className="max-w-md mx-auto relative h-full">
        {/* Header */}
        <div className="absolute top-0 inset-x-0 z-10 px-6 pt-12 pb-6">
          <motion.div 
            className="flex items-center justify-between"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.button
              onClick={handleBack}
              className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </motion.button>
            
            <h1 className="text-lg font-medium text-white">High Stakes</h1>
            <div className="w-8"></div>
          </motion.div>
        </div>

        {/* Page de sélection */}
        <div className="flex flex-col h-screen pt-20 pb-4 px-6">
          {/* Section du haut : Solde */}
          <div className="flex-shrink-0 mb-6">
            <motion.div
              className="bg-[#13151A] rounded-2xl p-4 ring-1 ring-white/10 text-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-10 h-10 bg-[#F8CA5A]/20 rounded-xl flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[#F8CA5A]" />
                </div>
                <div className="text-left">
                  <p className="text-white/60 text-xs">Solde en Jetons</p>
                  <p className="text-[#F8CA5A] font-bold text-lg">
                    {balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {!hasEnoughCoins && (
                <motion.div
                  className="bg-red-500/20 border border-red-500/30 rounded-2xl p-3 mb-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  data-testid="warning-insufficient-coins"
                >
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <div className="text-left">
                      <p className="font-bold text-red-400 text-sm">Pièces insuffisantes</p>
                      <p className="text-red-300 text-xs">
                        Vous avez besoin d'au moins {minimumCoins.toLocaleString()} pièces.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
          
          {/* Section du milieu : Instructions */}
          <div className="flex-shrink-0 text-center mb-6">
            <p className="text-white/70 text-lg font-medium mb-2">Choisissez votre montant</p>
            <p className="text-white/50 text-sm">Sélectionnez la mise pour votre partie High Stakes</p>
          </div>
          
          {/* Section des montants */}
          <div className="flex-1 flex items-center justify-center">
            <div className="space-y-4 w-full max-w-sm">
              {stakesOptions.map((option) => (
                <motion.button
                  key={option.amount}
                  onClick={() => handleAmountSelect(option.amount)}
                  disabled={!canAfford(option.amount)}
                  className={`w-full p-6 rounded-2xl border-2 transition-all ${
                    selectedAmount === option.amount
                      ? "border-accent-gold bg-accent-gold/10"
                      : canAfford(option.amount)
                      ? "border-white/20 hover:border-white/40 bg-white/5"
                      : "border-red-500/30 bg-red-500/10 cursor-not-allowed opacity-50"
                  }`}
                  whileHover={canAfford(option.amount) ? { scale: 1.02 } : {}}
                  whileTap={canAfford(option.amount) ? { scale: 0.98 } : {}}
                  data-testid={`amount-${option.amount}`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">
                      {option.label}
                    </div>
                    <div className="text-white/60 text-sm">pièces</div>
                    {!canAfford(option.amount) && (
                      <div className="text-red-400 text-xs mt-1">Solde insuffisant</div>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Bouton de validation */}
          {selectedAmount && (
            <motion.div
              className="flex-shrink-0 mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                onClick={handleValidate}
                className="w-full bg-[#232227] hover:bg-[#1a1a1e] text-white font-bold py-4 rounded-xl text-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-validate"
              >
                Commencer la partie ({selectedAmount.toLocaleString()} pièces)
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}