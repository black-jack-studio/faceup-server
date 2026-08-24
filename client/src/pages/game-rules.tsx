import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

// Shared with the Game Rules sheet Settings opens (see BottomSheet/settings.tsx) — the text
// itself, no color/background assumptions, so it reads correctly however it's wrapped.
export function GameRulesContent() {
  return (
    <div className="space-y-8 leading-relaxed">
      <div>
        <h2 className="text-2xl font-bold mb-4">Blackjack Rules</h2>
        <div className="h-px bg-current opacity-10 mb-8" />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Goal</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>
            Beat the dealer by getting a hand value closer to 21 than theirs, without going over.
            Number cards are worth their face value, face cards (J, Q, K) are worth 10, and an Ace
            is worth 11 or 1, whichever helps your hand most.
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">How a hand plays out</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>
            You and the dealer each get two cards. Yours are dealt face up; the dealer shows one
            card and keeps the other hidden until it's their turn to play.
          </p>
          <p>
            If your first two cards total 21 (an Ace with a 10-value card), that's a natural
            blackjack and it pays 3 to 2, unless the dealer also has one, in which case it's a push
            (tie, bet returned).
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">Your options</h3>
        <div className="opacity-80 space-y-3 text-sm leading-relaxed">
          <p><span className="font-semibold opacity-100">Hit</span> — take another card.</p>
          <p><span className="font-semibold opacity-100">Stand</span> — keep your current hand and end your turn.</p>
          <p>
            <span className="font-semibold opacity-100">Double Down</span> — double your bet, take exactly
            one more card, then stand. Only available as your first decision on a hand.
          </p>
          <p>
            <span className="font-semibold opacity-100">Split</span> — if your first two cards have the same
            value, split them into two separate hands, each with its own bet equal to your original wager.
            Only available once, on your first decision — hands can't be re-split.
          </p>
          <p>
            <span className="font-semibold opacity-100">Surrender</span> — give up the hand immediately and get
            half your bet back. Only available as your first decision, before taking any other action.
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">The dealer's turn</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>
            Once every player hand is finished, the dealer reveals their hidden card. The dealer
            must hit on any total below 17, and stands on all 17s, whether hard or soft (an Ace
            counted as 11).
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">Payouts</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>Natural blackjack: pays 3 to 2.</p>
          <p>Regular win: pays 1 to 1.</p>
          <p>Push (tie with the dealer): your bet is returned.</p>
          <p>Surrender: half your bet is returned.</p>
          <p>Bust (going over 21) or a loss to the dealer's total: you lose your bet.</p>
        </div>
      </div>
    </div>
  );
}

export default function GameRules() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen text-white p-6 overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center mb-8 pt-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => navigate("/settings")}
            className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Game Rules</h1>
        </motion.div>

        {/* Content */}
        <motion.div
          className="bg-white/5 rounded-2xl p-8 border border-white/10 backdrop-blur-sm text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GameRulesContent />
        </motion.div>
      </div>
    </div>
  );
}
