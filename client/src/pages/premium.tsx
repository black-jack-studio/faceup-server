import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useUserStore } from '@/store/user-store';
import unlocked3d from "@assets/unlocked_3d_1758059243603.png";
import crown3d from "@assets/crown_3d_1758379656323.png";
import fireAnimated from "@assets/fire_animated_1787270400000.png";
import slotMachine3d from "@assets/slot_machine_3d_1788544779000.png";

interface PremiumProps {
  onClose?: () => void;
  // Set when this is mounted inside another overlay's own slide-up transition (e.g. Battle
  // Pass's "Unlock premium rewards") — the whole page is already animating in as one block
  // there, so these elements fading/sliding in individually on top of that read as a second,
  // competing animation instead of a single clean motion.
  skipEntranceAnimation?: boolean;
}

export default function Premium({ onClose, skipEntranceAnimation }: PremiumProps = {}) {
  const { t } = useTranslation("premium");
  const [, navigate] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const checkSubscriptionStatus = useUserStore((state) => state.checkSubscriptionStatus);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubscribe = async () => {
    if (isSubscribing) return;
    setIsSubscribing(true);
    try {
      await apiRequest('POST', '/api/subscription/subscribe', {
        plan: isAnnual ? 'annual' : 'monthly',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] }),
        checkSubscriptionStatus(),
      ]);
      toast({ message: t("activatedMessage") });
      onClose ? onClose() : navigate('/battlepass');
    } catch (error: any) {
      toast({ message: t("subscribeFailedMessage") });
    } finally {
      setIsSubscribing(false);
    }
  };

  const benefits = [
    {
      image: unlocked3d,
      title: t("benefit1Title"),
      description: t("benefit1Description")
    },
    {
      image: crown3d,
      title: t("benefit2Title"),
      description: t("benefit2Description")
    },
    {
      image: slotMachine3d,
      title: t("benefit3Title"),
      description: t("benefit3Description")
    },
    {
      image: fireAnimated,
      title: t("benefit4Title"),
      description: t("benefit4Description")
    }
  ];

  return (
    // fixed inset-0 (not min-h-screen): min-h-screen let this grow taller than the viewport
    // and scroll the whole page, so the button below just ended up past the fold on shorter
    // screens instead of being kept on-screen by the scrollable region below. fixed inset-0 +
    // overflow-hidden pins this to the true viewport (same fix battlepass.tsx uses), so only
    // the flex-1 section in the middle scrolls and the button stays put.
    <div className="fixed inset-0 overflow-hidden bg-black text-white flex flex-col">
      {/* Header - pt-safe: fixed inset-0 pins this to the true viewport origin, so unlike
          normal document flow it doesn't inherit any safe-area padding from an ancestor -
          without this the crown was rendered straight under the notch/status bar. */}
      <div className="flex-shrink-0 flex items-center justify-between p-4 pt-safe">
        <button
          onClick={onClose ?? (() => navigate('/battlepass'))}
          className="text-white/80 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <img src={crown3d} alt="Premium" className="w-12 h-12" />
        <div className="w-6"></div>
      </div>

      {/* Scrollable middle: on a short screen (small iPhone) this scrolls on its own so the
          button below always keeps its full padding instead of getting squeezed against the
          bottom edge. */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 pt-8">

        {/* Pricing Card */}
        <motion.div
          className="w-full max-w-sm bg-white/10 rounded-3xl p-6 mb-8"
          initial={skipEntranceAnimation ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-white mb-2">
              {isAnnual ? (
                <>29,99€<span className="text-lg text-white/60">{t("perYear")}</span></>
              ) : (
                <>4,99€<span className="text-lg text-white/60">{t("perMonth")}</span></>
              )}
            </div>
            {isAnnual ? (
              <p className="text-green-400 text-sm font-medium">{t("saveAnnual")}</p>
            ) : (
              <p className="text-white/60 text-sm">{t("cheaperThanChips")}</p>
            )}
          </div>

          {/* Monthly/Annual Toggle */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <span className={`text-sm font-medium w-16 text-center ${!isAnnual ? 'text-white' : 'text-white/60'}`}>
              {t("monthly")}
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center shrink-0 ${isAnnual ? 'bg-white' : 'bg-gray-600'
                }`}
              data-testid="toggle-billing"
            >
              <div
                className={`w-5 h-5 bg-black rounded-full transform transition-transform ${isAnnual ? 'translate-x-8' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className={`text-sm font-medium w-16 text-center ${isAnnual ? 'text-white' : 'text-white/60'}`}>
              {t("annual")}
            </span>
          </div>
        </motion.div>

        {/* Benefits List */}
        <div className="w-full max-w-sm space-y-3 mb-8">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="bg-white/10 rounded-2xl p-4"
              initial={skipEntranceAnimation ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              data-testid={`benefit-${index}`}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={benefit.image}
                  alt=""
                  className="w-10 h-10"
                />
                <div className="flex-1">
                  <h3 className="text-white font-medium text-sm mb-1">{benefit.title}</h3>
                  <p className="text-white/60 text-xs">{benefit.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>

      {/* Subscribe Button - a fixed-shrink sibling of the scrollable area above, not part of
          its flow, so it always keeps this same padding above the home indicator no matter
          how tall the content is or how small the phone's screen is. */}
      <div
        className="flex-shrink-0 px-6 pt-4"
        style={{ paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom) + 1rem))" }}
      >
        <motion.button
          className="w-full max-w-sm mx-auto block font-semibold py-4 rounded-xl disabled:opacity-50"
          style={{
            background: '#FFFFFF',
            color: '#15161A',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
          }}
          initial={skipEntranceAnimation ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            opacity: { delay: 0.8 },
            y: { delay: 0.8 },
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubscribe}
          disabled={isSubscribing}
          data-testid="button-subscribe"
        >
          {isSubscribing
            ? t("subscribing")
            : isAnnual ? t("subscribeAnnual") : t("subscribeMonthly")}
        </motion.button>
      </div>

    </div>
  );
}
