import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";

// Shared with the Game Rules sheet Settings opens (see BottomSheet/settings.tsx) — the text
// itself, no color/background assumptions, so it reads correctly however it's wrapped.
export function GameRulesContent() {
  const { t } = useTranslation("gameRules");
  return (
    <div className="space-y-8 leading-relaxed">
      <div>
        <h2 className="text-2xl font-bold mb-4">{t("heading")}</h2>
        <div className="h-px bg-current opacity-10 mb-8" />
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">{t("goalTitle")}</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>
            {t("goalBody")}
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">{t("handPlaysOutTitle")}</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>
            {t("handPlaysOutBody1")}
          </p>
          <p>
            {t("handPlaysOutBody2")}
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">{t("optionsTitle")}</h3>
        <div className="opacity-80 space-y-3 text-sm leading-relaxed">
          <p><span className="font-semibold opacity-100">{t("optionHit")}</span> — {t("optionHitBody")}</p>
          <p><span className="font-semibold opacity-100">{t("optionStand")}</span> — {t("optionStandBody")}</p>
          <p>
            <span className="font-semibold opacity-100">{t("optionDouble")}</span> — {t("optionDoubleBody")}
          </p>
          <p>
            <span className="font-semibold opacity-100">{t("optionSplit")}</span> — {t("optionSplitBody")}
          </p>
          <p>
            <span className="font-semibold opacity-100">{t("optionSurrender")}</span> — {t("optionSurrenderBody")}
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">{t("dealerTurnTitle")}</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>
            {t("dealerTurnBody")}
          </p>
        </div>
      </div>

      <div className="h-px bg-current opacity-10" />

      <div>
        <h3 className="text-xl font-semibold mb-4">{t("payoutsTitle")}</h3>
        <div className="opacity-80 space-y-2 text-sm leading-relaxed">
          <p>{t("payoutBlackjack")}</p>
          <p>{t("payoutWin")}</p>
          <p>{t("payoutPush")}</p>
          <p>{t("payoutSurrender")}</p>
          <p>{t("payoutBust")}</p>
        </div>
      </div>
    </div>
  );
}

export default function GameRules() {
  const { t } = useTranslation("gameRules");
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
          <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
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
