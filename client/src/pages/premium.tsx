import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Dices } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useUserStore } from '@/store/user-store';
import unlocked3d from "@assets/unlocked_3d_1758059243603.png";
import crown3d from "@assets/crown_3d_1758379656323.png";
import fireAnimated from "@assets/fire_animated_1787270400000.png";

interface PremiumProps {
  onClose?: () => void;
  // Set when this is mounted inside another overlay's own slide-up transition (e.g. Battle
  // Pass's "Unlock premium rewards") — the whole page is already animating in as one block
  // there, so these elements fading/sliding in individually on top of that read as a second,
  // competing animation instead of a single clean motion.
  skipEntranceAnimation?: boolean;
}

export default function Premium({ onClose, skipEntranceAnimation }: PremiumProps = {}) {
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
      toast({ title: 'Premium activated!', description: 'Enjoy your new perks.' });
      onClose ? onClose() : navigate('/battlepass');
    } catch (error: any) {
      toast({
        title: "Couldn't subscribe",
        description: error?.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubscribing(false);
    }
  };

  const benefits = [
    {
      image: unlocked3d,
      title: "Premium Battle Pass",
      description: "Unlock exclusive rewards"
    },
    {
      image: crown3d,
      title: "Crown on your profile",
      description: "Stand out with a Premium badge"
    },
    {
      icon: Dices,
      title: "2 free Lucky Reels spins a day",
      description: "Double your daily spins, no ads needed",
      bgColor: "bg-purple-500/20",
      iconColor: "text-purple-400"
    },
    {
      image: fireAnimated,
      title: "+20% on every reward",
      description: "Chests, Lucky Reels, Streak, all boosted"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <button
          onClick={onClose ?? (() => navigate('/battlepass'))}
          className="text-white/80 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-white">Premium</h1>
        <div className="w-6"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">

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
                <>24,99€<span className="text-lg text-white/60">/year</span></>
              ) : (
                <>3,99€<span className="text-lg text-white/60">/mo</span></>
              )}
            </div>
            {isAnnual ? (
              <p className="text-green-400 text-sm font-medium">Save 23€ per year!</p>
            ) : (
              <p className="text-white/60 text-sm">Cheaper than a pack of chips !</p>
            )}
          </div>

          {/* Monthly/Annual Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-white/60'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`w-14 h-7 rounded-full transition-colors flex items-center ${isAnnual ? 'bg-white' : 'bg-gray-600'
                }`}
              data-testid="toggle-billing"
            >
              <div
                className={`w-5 h-5 bg-black rounded-full transform transition-transform ${isAnnual ? 'translate-x-8' : 'translate-x-1'
                  }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-white' : 'text-white/60'}`}>
              Annual
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
                {benefit.image ? (
                  <img
                    src={benefit.image}
                    alt=""
                    className="w-10 h-10"
                  />
                ) : (
                  <div className={`w-10 h-10 ${benefit.bgColor} rounded-xl flex items-center justify-center`}>
                    {benefit.icon && <benefit.icon className={`w-5 h-5 ${benefit.iconColor}`} />}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-white font-medium text-sm mb-1">{benefit.title}</h3>
                  <p className="text-white/60 text-xs">{benefit.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Subscribe Button */}
        <motion.button
          className="w-full max-w-sm font-semibold py-4 rounded-xl disabled:opacity-50"
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
            ? 'Subscribing…'
            : isAnnual ? 'Subscribe for 24,99€/year' : 'Subscribe for 3,99€/mo'}
        </motion.button>
      </div>

    </div>
  );
}
