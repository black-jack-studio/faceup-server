import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Star } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useState, useEffect } from 'react';
import CheckoutForm from '@/components/checkout-form';
import PayPalButton from '@/components/paypal-button';
import { Gem, Crown } from "@/icons";
import { Coin } from "@/icons";
import CoinsBadge from "@/components/CoinsBadge";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Shop() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [selectedPack, setSelectedPack] = useState<any>(null);
  
  // Check if we should show Battle Pass section
  const [showBattlePassSection, setShowBattlePassSection] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowBattlePassSection(params.get('battlepass') === 'true');
  }, []);

  const handleSelectPack = (pack: any, packType: 'coins' | 'gems' | 'battlepass') => {
    setSelectedPack({ ...pack, packType });
    setShowPaymentModal(true);
  };

  // Battle Pass pack
  const battlePassPack = {
    id: 'battlepass_premium',
    name: 'Battle Pass Premium',
    price: 9.99,
    popular: true,
    benefits: [
      'Unlock all premium rewards',
      'Exclusive avatars & card backs',
      'Double XP bonus',
      'Premium seasonal content'
    ]
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
            amount: selectedPack.price,
            packType: selectedPack.packType,
            packId: selectedPack.id,
          }),
        });

        const data = await response.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setShowCheckout(true);
        }
      } else {
        setShowCheckout(true);
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setClientSecret("");
    setSelectedPack(null);
    // Refresh user data to show updated balance
    window.location.reload();
  };

  const handlePaymentCancel = () => {
    setShowCheckout(false);
    setClientSecret("");
    setSelectedPack(null);
  };

  const handleModalCancel = () => {
    setShowPaymentModal(false);
    setSelectedPack(null);
  };

  const handlePaymentError = (error: any) => {
    console.error('Payment error:', error);
    // Could show a toast notification here
  };

  const coinPacks = [
    { id: 1, coins: 1000, price: 4.99, popular: false },
    { id: 2, coins: 2500, price: 9.99, popular: true },
    { id: 3, coins: 5000, price: 19.99, popular: false },
    { id: 4, coins: 12000, price: 39.99, popular: false },
  ];

  const gemPacks = [
    { id: 1, gems: 100, price: 2.99, popular: false },
    { id: 2, gems: 250, price: 6.99, popular: true },
    { id: 3, gems: 500, price: 12.99, popular: false },
    { id: 4, gems: 1200, price: 24.99, popular: false },
  ];

  const cardBacks = [
    { id: 1, name: "Royal Blue", price: 150, currency: "gems", owned: false },
    { id: 2, name: "Golden Crown", price: 200, currency: "gems", owned: false },
    { id: 3, name: "Midnight Black", price: 100, currency: "gems", owned: true },
    { id: 4, name: "Ruby Red", price: 300, currency: "gems", owned: false },
  ];

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mr-3 text-white hover:bg-white/10 rounded-xl p-2"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-black text-white tracking-tight">Shop</h1>
        </motion.div>

        {/* Balance Display */}
        <motion.div
          className="flex justify-center space-x-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <CoinsBadge amount={user?.coins || 0} glow size="lg" className="" />
          <div className="bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center space-x-3">
            <Gem className="w-6 h-6 text-accent-purple" />
            <span className="text-accent-purple font-bold text-lg" data-testid="shop-gems">
              {user?.gems?.toLocaleString() || "0"}
            </span>
          </div>
        </motion.div>

        {/* Battle Pass Premium Section */}
        {showBattlePassSection && (
          <motion.section
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center mb-6">
              <Crown className="w-6 h-6 text-yellow-400 mr-3" />
              <h2 className="text-2xl font-bold text-white">September Season Pass</h2>
            </div>
            
            <motion.div
              className="bg-gradient-to-br from-yellow-900/30 to-amber-900/30 rounded-3xl p-6 border border-yellow-500/30 backdrop-blur-sm relative overflow-hidden"
              whileHover={{ scale: 1.01, y: -2 }}
              transition={{ duration: 0.2 }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-3xl" />
              
              {/* Popular badge */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black text-xs font-bold px-4 py-1 rounded-full">
                  Limited Time
                </span>
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-yellow-400 mb-2">
                      {battlePassPack.name}
                    </h3>
                    <p className="text-white/80 text-sm">
                      Unlock exclusive seasonal content and premium rewards
                    </p>
                  </div>
                  <div className="bg-yellow-500/20 w-16 h-16 rounded-2xl flex items-center justify-center">
                    <Crown className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mb-6 space-y-2">
                  {battlePassPack.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-white/90 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Price and Purchase */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-yellow-400">
                      ${battlePassPack.price}
                    </div>
                    <div className="text-sm text-white/60">Monthly subscription</div>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold py-3 px-6 rounded-2xl transition-all shadow-lg"
                    data-testid="button-buy-battlepass"
                    onClick={() => navigate('/premium')}
                  >
                    Unlock Premium
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.section>
        )}

        {/* Coin Packs */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center mb-6">
            <Coin className="w-6 h-6 text-accent-gold mr-3" />
            <h2 className="text-2xl font-bold text-white">Coin Packs</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {coinPacks.map((pack, index) => (
              <motion.div
                key={pack.id}
                className={`bg-white/5 rounded-3xl p-5 border backdrop-blur-sm text-center relative overflow-hidden ${
                  pack.popular ? 'border-accent-gold halo' : 'border-white/10'
                }`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {pack.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent-gold text-ink text-xs font-bold px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <div className="bg-accent-gold/20 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Coin className="w-6 h-6 text-accent-gold" />
                </div>
                <div className="text-3xl font-black text-accent-gold mb-1">
                  {pack.coins.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mb-4 font-medium">coins</div>
                <Button
                  className="w-full bg-accent-gold hover:bg-accent-gold/90 text-ink font-bold py-3 px-4 rounded-2xl transition-colors"
                  data-testid={`button-buy-coins-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'coins')}
                >
                  Buy ${pack.price}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Gem Packs */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center mb-6">
            <Gem className="w-6 h-6 text-accent-purple mr-3" />
            <h2 className="text-2xl font-bold text-white">Gem Packs</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {gemPacks.map((pack, index) => (
              <motion.div
                key={pack.id}
                className={`bg-white/5 rounded-3xl p-5 border backdrop-blur-sm text-center relative overflow-hidden ${
                  pack.popular ? 'border-accent-purple halo' : 'border-white/10'
                }`}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                {pack.popular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-accent-purple text-white text-xs font-bold px-3 py-1 rounded-full">
                      Popular
                    </span>
                  </div>
                )}
                <div className="bg-accent-purple/20 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Gem className="w-6 h-6 text-accent-purple" />
                </div>
                <div className="text-3xl font-black text-accent-purple mb-1">
                  {pack.gems.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mb-4 font-medium">gems</div>
                <Button
                  className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white font-bold py-3 px-4 rounded-2xl transition-colors"
                  data-testid={`button-buy-gems-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'gems')}
                >
                  Buy ${pack.price}
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Card Backs */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center mb-6">
            <Crown className="w-6 h-6 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Card Backs</h2>
          </div>
          <div className="space-y-4">
            {cardBacks.map((cardBack, index) => (
              <motion.div 
                key={cardBack.id} 
                className="bg-white/5 rounded-3xl p-5 border border-white/10 backdrop-blur-sm"
                whileHover={{ scale: 1.01, borderColor: "rgba(181, 243, 199, 0.2)" }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center">
                      <Crown className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{cardBack.name}</h3>
                      <p className="text-white/60 text-sm">
                        Premium card design
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {cardBack.owned ? (
                      <div className="bg-accent-green/20 text-accent-green px-4 py-2 rounded-2xl font-bold text-sm">
                        Owned
                      </div>
                    ) : (
                      <Button
                        className="bg-accent-green hover:bg-accent-green/90 text-ink font-bold py-3 px-4 rounded-2xl flex items-center space-x-2"
                        data-testid={`button-buy-cardback-${cardBack.id}`}
                      >
                        <span>{cardBack.price}</span>
                        {cardBack.currency === "gems" ? (
                          <Gem className="w-4 h-4" />
                        ) : (
                          <Coin className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

      </div>

      {/* Payment Method Selection Modal */}
      {showPaymentModal && selectedPack && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-ink border border-white/20 rounded-3xl p-6 max-w-sm w-full backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Choose Payment
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
              <p className="text-white/60 text-sm mb-2">Your purchase:</p>
              <div className="flex items-center space-x-2">
                {selectedPack?.packType === 'coins' ? (
                  <Coin className="w-5 h-5 text-accent-gold" />
                ) : selectedPack?.packType === 'gems' ? (
                  <Gem className="w-5 h-5 text-accent-purple" />
                ) : (
                  <Crown className="w-5 h-5 text-yellow-400" />
                )}
                <p className="text-white font-bold text-lg">
                  {selectedPack?.packType === 'coins' 
                    ? `${selectedPack?.coins?.toLocaleString()} coins - $${selectedPack?.price}`
                    : selectedPack?.packType === 'gems'
                    ? `${selectedPack?.gems?.toLocaleString()} gems - $${selectedPack?.price}`
                    : `${selectedPack?.name} - $${selectedPack?.price}`
                  }
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
                  <div className="font-bold">Credit Card</div>
                  <div className="text-sm opacity-80">Apple Pay • Google Pay • Cards</div>
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
                  <div className="text-sm opacity-80">PayPal account or card via PayPal</div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {showCheckout && selectedPack && clientSecret && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-ink border border-white/20 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                Secure Payment
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
            
            <div className="mb-6 bg-white/5 p-4 rounded-2xl">
              <div className="flex items-center space-x-2">
                {selectedPack?.packType === 'coins' ? (
                  <Coin className="w-5 h-5 text-accent-gold" />
                ) : (
                  <Gem className="w-5 h-5 text-accent-purple" />
                )}
                <p className="text-white font-bold">
                  {selectedPack?.packType === 'coins' 
                    ? `${selectedPack?.coins?.toLocaleString()} coins for $${selectedPack?.price}`
                    : `${selectedPack?.gems?.toLocaleString()} gems for $${selectedPack?.price}`
                  }
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-xs text-white/60 mb-3">
                Accepted: Credit Cards • Apple Pay • Google Pay
              </p>
            </div>
            
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm 
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          </motion.div>
        </div>
      )}

      {/* PayPal Payment Modal */}
      {showCheckout && selectedPack && !clientSecret && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            className="bg-ink border border-white/20 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
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
            
            <div className="mb-6 bg-white/5 p-4 rounded-2xl">
              <div className="flex items-center space-x-2">
                {selectedPack?.packType === 'coins' ? (
                  <Coin className="w-5 h-5 text-accent-gold" />
                ) : selectedPack?.packType === 'gems' ? (
                  <Gem className="w-5 h-5 text-accent-purple" />
                ) : (
                  <Crown className="w-5 h-5 text-yellow-400" />
                )}
                <p className="text-white font-bold">
                  {selectedPack?.packType === 'coins' 
                    ? `${selectedPack?.coins?.toLocaleString()} coins for $${selectedPack?.price}`
                    : selectedPack?.packType === 'gems'
                    ? `${selectedPack?.gems?.toLocaleString()} gems for $${selectedPack?.price}`
                    : `${selectedPack?.name} for $${selectedPack?.price}`
                  }
                </p>
              </div>
            </div>
            
            <div className="bg-white/5 p-4 rounded-2xl">
              <PayPalButton
                amount={selectedPack.price.toString()}
                packType={selectedPack.packType}
                packId={selectedPack.id}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                onError={handlePaymentError}
              />
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}