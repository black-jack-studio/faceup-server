import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useGameStore } from "@/store/game-store";
import { useUserStore } from "@/store/user-store";
import { useLocation } from "wouter";
import { ArrowLeft } from "@/icons";
import { BetSlider } from "@/components/BetSlider";
import { useBetting } from "@/hooks/use-betting";
import { formatFullNumber } from "@/lib/formatUtils";
import { trackCoinsDepleted } from "@/lib/analytics";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const { t } = useTranslation("gameplay");
  const [currentBet, setCurrentBet] = useState(1);

  const { setMode } = useGameStore();
  const user = useUserStore((state) => state.user);
  const loadUserCoins = useUserStore((state) => state.loadUserCoins);

  const balance = user?.coins || 0;
  // Snapshot the balance shown right before the bet is placed — the result screen animates
  // from this exact number, so it can't rely on re-reading the store later (background
  // refreshes can race ahead and already reflect this hand's payout by then).
  const preBetBalanceRef = useRef(balance);

  const { placeBet, navigateToGame, isLoading } = useBetting({
    mode: "classic",
    onSuccess: (result) => {
      // Navigate to game after successful bet using the committed amount
      navigateToGame(result.gameId, result.betAmount, {
        balance: String(preBetBalanceRef.current),
      });
    },
  });

  const dynamicMax = Math.max(1, balance);

  useEffect(() => {
    setMode("classic");
    loadUserCoins();
  }, [setMode, loadUserCoins]);

  // currentBet intentionally survives a hand (it's not reset on mount) so the slider comes back
  // pre-set to whatever was last bet. But a loss can drop `balance` below that remembered bet,
  // and without this the slider's thumb would sit past the track's own right edge (unreachable
  // by drag) while "CONFIRM BET" stayed permanently disabled (balance < currentBet) -- the bet
  // amount just silently outliving the balance that could ever cover it again.
  useEffect(() => {
    setCurrentBet((prev) => Math.min(prev, dynamicMax));
  }, [dynamicMax]);

  // Fires exactly when this screen swaps "CONFIRM BET" for the "GET COINS" wall below —
  // the sharpest monetization/churn fork in the app. Re-fires if the player tops up and
  // then goes broke again in the same session, which is the correct behavior here.
  useEffect(() => {
    if (balance === 0) trackCoinsDepleted();
  }, [balance]);

  const handleSliderChange = (value: number) => {
    setCurrentBet(value);
  };

  // Round a raw balance fraction up to the nearest ten (e.g. 247 -> 250),
  // so quick-bet pills stay round while still tracking the real percentage.
  const roundUpToTen = (rawValue: number) => Math.ceil(rawValue / 10) * 10;

  const quickBetPresets = [
    roundUpToTen(dynamicMax * 0.25),
    roundUpToTen(dynamicMax * 0.5),
    dynamicMax,
  ]
    .map((amount) => Math.max(1, Math.min(dynamicMax, amount)))
    .filter((amount, index, all) => all.indexOf(amount) === index);

  const handleQuickAction = (amount: number) => {
    setCurrentBet(amount);
  };

  const handleConfirmBet = async () => {
    if (currentBet > 0 && balance >= currentBet && !isLoading) {
      preBetBalanceRef.current = balance;
      try {
        await placeBet(currentBet);
      } catch (error) {
        // Error handling is done in the useBetting hook
        console.error("Bet confirmation failed:", error);
      }
    }
  };

  const handleGoToShop = () => {
    // ?section=coins tells shop.tsx (see its own scroll-to-Coin-Packs effect) to land straight
    // on the Coin Packs section instead of the top of the page -- this is the one CTA on the
    // whole page at that point, so there's no ambiguity about what the player came to buy.
    navigate("/shop?section=coins");
  };

  return (
    <div
      className="fixed-safe-screen"
      style={{ background: '#000000' }}
    >
      <div className="max-w-md mx-auto relative h-full">
        {/* Main Content */}
        <div className="h-full flex flex-col pb-6 gap-8">

          {/* Extended Top Section */}
          <motion.div
            className="flex-shrink-0"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="px-6 pt-12 pb-8"
              style={{
                background: 'linear-gradient(180deg, #1C1D21 0%, #24262B 100%)',
                borderRadius: '0 0 40px 40px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24), 0 4px 16px rgba(0, 0, 0, 0.12)'
              }}
            >
              {/* Header inside the gray section */}
              <motion.div
                className="flex items-center justify-between mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.button
                  onClick={() => navigate("/")}
                  className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-back"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>{t("classic.back")}</span>
                </motion.button>

                <h1 className="text-lg font-medium text-white">{t("classic.title")}</h1>
              </motion.div>

              {/* Balance and Bet section */}
              <div className="text-center">
                <p className="text-sm text-white/50 mb-1">
                  {t("balance", { amount: formatFullNumber(balance) })}
                </p>

                {/* "YOUR BET" + the amount only mean anything once there's something to bet --
                    at 0 balance currentBet still shows a leftover 1 (dynamicMax floors at 1, see
                    above), which read as a phantom bet you could never actually place. */}
                {balance > 0 && (
                  <>
                    <p
                      className="text-xs font-medium mb-3"
                      style={{
                        color: '#9CA3AF',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}
                    >
                      {t("yourBet")}
                    </p>

                    <motion.p
                      className="text-4xl font-light tracking-tight text-white"
                      key={currentBet}
                      initial={{ scale: 0.9, opacity: 0.7 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 25,
                        duration: 0.15
                      }}
                      data-testid="text-current-bet"
                    >
                      {formatFullNumber(currentBet)}
                    </motion.p>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Bet Slider */}
          {balance >= 1 ? (
            <motion.div
              className="flex-shrink-0 px-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <BetSlider
                min={1}
                max={dynamicMax}
                value={currentBet}
                onChange={handleSliderChange}
                dataTestId="bet-slider"
                disabled={isLoading}
              />
            </motion.div>
          ) : null}

          {/* Quick Action Pills */}
          {balance >= 1 ? (
            <motion.div
              className="flex-shrink-0 flex justify-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              {quickBetPresets.map((amount, index) => {
                const isMax = amount === dynamicMax;
                const label = isMax ? t("max") : formatFullNumber(amount);
                return (
                  <motion.button
                    key={`${amount}-${index}`}
                    onClick={() => handleQuickAction(amount)}
                    disabled={isLoading}
                    className="px-6 py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: '#2A2B30',
                      border: '1px solid #5A5C63',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)'
                    }}
                    whileHover={!isLoading ? {
                      scale: 1.02,
                      backgroundColor: '#34353C'
                    } : {}}
                    whileTap={!isLoading ? { scale: 0.98 } : {}}
                    data-testid={isMax ? "pill-max" : `pill-${amount}`}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </motion.div>
          ) : null}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Bottom CTA or Error State */}
          <motion.div
            className="flex-shrink-0 px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            {balance === 0 ? (
              <motion.button
                onClick={handleGoToShop}
                className="w-full py-4 text-base font-bold rounded-xl transition-all"
                style={{
                  background: '#FFFFFF',
                  color: '#15161A',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={{
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                }}
                whileTap={{ scale: 0.98 }}
                data-testid="button-go-to-shop"
              >
                {t("goToShop").toUpperCase()}
              </motion.button>
            ) : (
              <motion.button
                onClick={handleConfirmBet}
                disabled={currentBet === 0 || balance < currentBet || isLoading}
                className="w-full py-4 text-base font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: '#FFFFFF',
                  color: '#15161A',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
                }}
                whileHover={currentBet > 0 && balance >= currentBet && !isLoading ? {
                  scale: 1.02,
                  boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)'
                } : {}}
                whileTap={currentBet > 0 && balance >= currentBet && !isLoading ? { scale: 0.98 } : {}}
                data-testid="button-confirm-bet"
              >
                {isLoading ? t("confirming") : t("confirmBetCta")}
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}