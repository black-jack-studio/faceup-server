import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Lock, Star, Plus, RefreshCw } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import unlocked3d from "@assets/unlocked_3d_1758059243603.png";
import star3d from "@assets/star_3d_1758059135945.png";
import barChartIcon from "@assets/bar_chart_3d_1757364609374.png";
import worldMapIcon from "@assets/world_map_3d_1758060118100.png";

export default function Premium() {
  const [, navigate] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{ price: number, type: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubscribe = () => {
    const plan = {
      price: isAnnual ? 24.99 : 3.99,
      type: isAnnual ? 'annual' : 'monthly'
    };
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const benefits = [
    {
      icon: Lock,
      title: "21 Streack Mode",
      description: "A unique and strategic game mode",
      bgColor: "bg-purple-500/20",
      iconColor: "text-purple-400"
    },
    {
      icon: Star,
      title: "Premium Battle Pass",
      description: "Unlock exclusive rewards",
      bgColor: "bg-yellow-500/20",
      iconColor: "text-yellow-400"
    },
    {
      icon: Plus,
      title: "Advanced Stats",
      description: "Get detailed insights into your performance",
      bgColor: "bg-green-500/20",
      iconColor: "text-green-400"
    },
    {
      icon: RefreshCw,
      title: "Global Leaderboard",
      description: "Compete with the best players worldwide",
      bgColor: "bg-emerald-500/20",
      iconColor: "text-emerald-400"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={() => navigate('/battlepass')}
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
          className="w-full max-w-sm bg-gray-800/50 rounded-3xl p-6 mb-8 border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
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
              className="bg-gray-800/30 rounded-2xl p-4 border border-gray-700"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              data-testid={`benefit-${index}`}
            >
              <div className="flex items-center space-x-3">
                {index === 0 ? (
                  <img
                    src={unlocked3d}
                    alt="Unlocked"
                    className="w-10 h-10"
                  />
                ) : index === 1 ? (
                  <img
                    src={star3d}
                    alt="Star"
                    className="w-10 h-10"
                  />
                ) : index === 2 ? (
                  <img
                    src={barChartIcon}
                    alt="Bar Chart"
                    className="w-10 h-10"
                  />
                ) : index === 3 ? (
                  <img
                    src={worldMapIcon}
                    alt="World Map"
                    className="w-10 h-10"
                  />
                ) : (
                  <div className={`w-10 h-10 ${benefit.bgColor} rounded-xl flex items-center justify-center`}>
                    <benefit.icon className={`w-5 h-5 ${benefit.iconColor}`} />
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
          className="w-full max-w-sm bg-white text-black font-semibold py-4 rounded-2xl hover:bg-gray-100 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          onClick={handleSubscribe}
          data-testid="button-subscribe"
        >
          {isAnnual ? 'Subscribe for 24,99€/year' : 'Subscribe for 3,99€/mo'}
        </motion.button>
      </div>

    </div>
  );
}
