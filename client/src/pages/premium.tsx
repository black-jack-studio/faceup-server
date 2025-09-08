import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Lock, Star, Plus, RefreshCw } from "lucide-react";

export default function Premium() {
  const [, navigate] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);

  const benefits = [
    {
      icon: Lock,
      title: "Access to private games",
      description: "Play with your friends at private tables.",
      bgColor: "bg-purple-500/20",
      iconColor: "text-purple-400"
    },
    {
      icon: Star,
      title: "Monthly Season Pass",
      description: "Access to the premium rewards track.",
      bgColor: "bg-yellow-500/20",
      iconColor: "text-yellow-400"
    },
    {
      icon: Plus,
      title: "1 extra spin for Hero Drop",
      description: "More chances to upgrade your reward.",
      bgColor: "bg-green-500/20",
      iconColor: "text-green-400"
    },
    {
      icon: RefreshCw,
      title: "Free Fortune Wheel spin",
      description: "Spin the wheel every 20 hours at no cost.",
      bgColor: "bg-emerald-500/20",
      iconColor: "text-emerald-400"
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <button
          onClick={() => navigate('/')}
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
              €5,99<span className="text-lg text-white/60">/mo</span>
            </div>
            <p className="text-white/60 text-sm">That's just one cup of coffee!</p>
          </div>

          {/* Monthly/Annual Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-white/60'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`w-14 h-7 rounded-full transition-colors ${
                isAnnual ? 'bg-white' : 'bg-gray-600'
              }`}
              data-testid="toggle-billing"
            >
              <div
                className={`w-5 h-5 bg-black rounded-full transform transition-transform ${
                  isAnnual ? 'translate-x-8' : 'translate-x-1'
                } mt-1`}
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
                <div className={`w-10 h-10 ${benefit.bgColor} rounded-xl flex items-center justify-center`}>
                  <benefit.icon className={`w-5 h-5 ${benefit.iconColor}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium text-sm mb-1">{benefit.title}</h3>
                  <p className="text-white/60 text-xs">{benefit.description}</p>
                </div>
                <div className="text-white/40">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
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
          data-testid="button-subscribe"
        >
          Subscribe for €5,99/mo
        </motion.button>
      </div>
    </div>
  );
}