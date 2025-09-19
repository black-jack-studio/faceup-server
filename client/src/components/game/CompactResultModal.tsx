import { motion, AnimatePresence } from "framer-motion";

interface CompactResultModalProps {
  showResult: boolean;
  result: "WIN" | "LOSE" | "PUSH";
  dealerTotal: number;
  playerTotal: number;
  bet: number;
  payout: number;
  rebate: number;
  onClose: () => void;
}

export default function CompactResultModal({
  showResult,
  result,
  dealerTotal,
  playerTotal,
  bet,
  payout,
  rebate,
  onClose
}: CompactResultModalProps) {
  
  const getResultAnimation = () => {
    switch (result) {
      case "WIN":
        return {
          text: "WIN",
          color: "text-green-400",
          bgColor: "bg-green-500/20",
          scale: [1, 1.1, 1],
          description: `+${payout} coins (3x multiplier!)`
        };
      case "LOSE":
        return {
          text: "LOSE",
          color: "text-red-400",
          bgColor: "bg-red-500/20",
          scale: [1, 0.9, 1],
          description: `10% recovery: +${rebate} coins`
        };
      case "PUSH":
        return {
          text: "PUSH",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/20",
          scale: [1, 1.05, 1],
          description: "Bet returned"
        };
      default:
        return {
          text: "",
          color: "",
          bgColor: "",
          scale: [1, 1, 1],
          description: ""
        };
    }
  };

  const resultAnimation = getResultAnimation();

  return (
    <AnimatePresence>
      {showResult && resultAnimation.text && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-pointer"
          data-testid="compact-result-modal"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0, rotate: -5 }}
              animate={{ 
                scale: 1,
                rotate: 0,
                transition: { 
                  duration: 0.4,
                  type: "spring",
                  bounce: 0.3
                }
              }}
              className={`${resultAnimation.bgColor} px-8 py-6 rounded-2xl border border-white/20 shadow-xl max-w-sm mx-4`}
              onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking on the modal content
            >
              <motion.h1
                initial={{ y: 10, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: { delay: 0.1 }
                }}
                className={`text-4xl font-bold ${resultAnimation.color} text-center mb-4`}
                data-testid="result-title"
              >
                {resultAnimation.text}
              </motion.h1>
              
              {/* Dealer and player scores */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: { delay: 0.2 }
                }}
                className="grid grid-cols-2 gap-4 mb-4"
              >
                <div className="bg-red-500/20 rounded-xl p-3 text-center">
                  <p className="text-white/60 text-sm">Dealer</p>
                  <p className="text-white font-bold text-2xl" data-testid="dealer-total">{dealerTotal}</p>
                </div>
                <div className="bg-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-white/60 text-sm">You</p>
                  <p className="text-green-400 font-bold text-2xl" data-testid="player-total">{playerTotal}</p>
                </div>
              </motion.div>
              
              {/* Display winnings or losses */}
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ 
                  y: 0, 
                  opacity: 1,
                  transition: { delay: 0.3 }
                }}
                className="text-white text-lg text-center mb-3"
                data-testid="result-description"
              >
                {resultAnimation.description}
              </motion.p>
              
              {/* Close instruction */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: 1,
                  transition: { delay: 0.5 }
                }}
                className="text-white/60 text-sm text-center"
              >
                Tap anywhere to continue
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}