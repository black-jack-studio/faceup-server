import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Lock, Star, Plus, RefreshCw } from "lucide-react";
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/checkout-form';
import PayPalButton from '@/components/PayPalButton';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import unlocked3d from "@assets/unlocked_3d_1758059243603.png";
import star3d from "@assets/star_3d_1758059135945.png";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

export default function Premium() {
  const [, navigate] = useLocation();
  const [isAnnual, setIsAnnual] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<{price: number, type: string} | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Hide body scroll when payment modal is open
  useEffect(() => {
    if (showCheckout || showPaymentModal) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100vh';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100vh';
      
      document.body.dataset.scrollY = scrollY.toString();
    } else {
      const scrollY = document.body.dataset.scrollY;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
      
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
        delete document.body.dataset.scrollY;
      }
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.width = '';
      document.documentElement.style.height = '';
    };
  }, [showCheckout, showPaymentModal]);

  const handleSubscribe = () => {
    const plan = {
      price: isAnnual ? 24.99 : 3.99,
      type: isAnnual ? 'annual' : 'monthly'
    };
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentMethod = async (method: 'stripe' | 'paypal') => {
    try {
      setShowPaymentModal(false);
      
      if (method === 'stripe') {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            amount: selectedPlan?.price,
            packType: 'premium',
            packId: selectedPlan?.type,
          }),
        });

        const data = await response.json();
        if (response.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
          setShowCheckout(true);
        } else {
          toast({
            title: "Payment Error",
            description: data.message || "Unable to create payment.",
            variant: "destructive",
            duration: 5000,
          });
          setShowPaymentModal(true);
        }
      } else {
        // PayPal flow
        setShowCheckout(true);
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: "Connection Error",
        description: "Unable to connect to payment server.",
        variant: "destructive",
        duration: 5000,
      });
      setShowPaymentModal(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setClientSecret('');
    setSelectedPlan(null);
    toast({
      title: "Payment Successful!",
      description: "Welcome to Premium! Enjoy your new benefits.",
      duration: 5000,
    });
    queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    navigate('/');
  };

  const handlePaymentCancel = () => {
    setShowCheckout(false);
    setClientSecret('');
    setSelectedPlan(null);
    setShowPaymentModal(false);
  };

  const handleModalCancel = () => {
    setShowPaymentModal(false);
    setSelectedPlan(null);
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
              {isAnnual ? (
                <>24,99€<span className="text-lg text-white/60">/year</span></>
              ) : (
                <>3,99€<span className="text-lg text-white/60">/mo</span></>
              )}
            </div>
            {isAnnual ? (
              <p className="text-green-400 text-sm font-medium">Save 23€ per year!</p>
            ) : (
              <p className="text-white/60 text-sm">That's just one cup of coffee!</p>
            )}
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

      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedPlan && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4" 
          style={{
            touchAction: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overscrollBehavior: 'none'
          }}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        >
          <motion.div 
            className="bg-ink border border-white/20 rounded-3xl p-6 max-w-sm w-full backdrop-blur-xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ 
              touchAction: 'auto',
              position: 'relative',
              transform: 'translateZ(0)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Choisir le paiement
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleModalCancel}
                className="text-white hover:bg-white/10 rounded-xl w-8 h-8 p-0"
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-6 bg-white/5 p-4 rounded-2xl">
              <p className="text-white/60 text-sm mb-2">Votre abonnement:</p>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-400" />
                <p className="text-white font-bold text-lg">
                  Premium {selectedPlan.type === 'annual' ? 'Annuel' : 'Mensuel'} - {selectedPlan.price}€
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <motion.button
                className="w-full bg-accent-green hover:bg-accent-green/90 text-ink p-4 rounded-2xl font-bold transition-colors flex items-center justify-start space-x-3"
                onClick={() => handlePaymentMethod('stripe')}
                data-testid="payment-method-stripe"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="bg-ink/20 p-2 rounded-xl">
                  <i className="fas fa-credit-card text-lg" />
                </div>
                <div className="text-left">
                  <div className="font-bold">Carte Bleue</div>
                  <div className="text-sm opacity-80">Apple Pay • Google Pay • Cartes</div>
                </div>
              </motion.button>
              
              <motion.button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl font-bold transition-colors flex items-center justify-start space-x-3"
                onClick={() => handlePaymentMethod('paypal')}
                data-testid="payment-method-paypal"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="bg-white/20 p-2 rounded-xl">
                  <i className="fab fa-paypal text-lg" />
                </div>
                <div className="text-left">
                  <div className="font-bold">PayPal</div>
                  <div className="text-sm opacity-80">Compte PayPal ou carte via PayPal</div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* PayPal Payment Modal */}
      {showCheckout && selectedPlan && !clientSecret && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" 
          style={{
            touchAction: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overscrollBehavior: 'none'
          }}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        >
          <motion.div 
            className="bg-ink border border-white/20 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ 
              touchAction: 'auto',
              position: 'relative',
              transform: 'translateZ(0)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                PayPal Payment
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePaymentCancel}
                className="text-white hover:bg-white/10 rounded-xl w-8 h-8 p-0"
              >
                ✕
              </Button>
            </div>
            
            <div className="mb-6 bg-white/5 p-4 rounded-2xl text-center">
              <div className="flex items-center justify-center space-x-3 mb-3">
                <Star className="w-6 h-6 text-yellow-400" />
                <div>
                  <p className="text-white font-bold text-lg">
                    Premium {selectedPlan.type === 'annual' ? 'Annuel' : 'Mensuel'}
                  </p>
                  <p className="text-white/60 text-sm">
                    Total: {selectedPlan.price}€
                  </p>
                </div>
              </div>
              <p className="text-xs text-white/60">
                Paiement sécurisé via PayPal
              </p>
            </div>
            
            <div className="text-center">
              <PayPalButton 
                amount={selectedPlan.price.toString()}
                currency="EUR"
                intent="CAPTURE"
                packType="premium"
                packId={selectedPlan.type}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                onError={(error) => {
                  console.error('PayPal error:', error);
                  toast({
                    title: "Erreur PayPal",
                    description: "Une erreur est survenue lors du paiement PayPal.",
                    variant: "destructive",
                    duration: 5000,
                  });
                }}
              />
            </div>
            
            <div className="mt-4 text-center">
              <Button
                variant="outline"
                onClick={handlePaymentCancel}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Annuler
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {showCheckout && selectedPlan && clientSecret && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4" 
          style={{
            touchAction: 'none',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overscrollBehavior: 'none'
          }}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
        >
          <motion.div 
            className="bg-ink border border-white/20 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl max-h-[85vh] overflow-y-auto shadow-2xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{ 
              touchAction: 'auto',
              position: 'relative',
              transform: 'translateZ(0)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Paiement sécurisé
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePaymentCancel}
                className="text-white hover:bg-white/10 rounded-xl w-8 h-8 p-0"
              >
                ✕
              </Button>
            </div>
            
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                amount={selectedPlan.price}
                pack={{
                  packType: 'premium',
                  type: selectedPlan.type,
                  price: selectedPlan.price
                }}
              />
            </Elements>
            </motion.div>
        </div>
      )}
    </div>
  );
}