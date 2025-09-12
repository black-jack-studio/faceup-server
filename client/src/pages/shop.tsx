import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Star, RotateCcw } from "lucide-react";
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
import AnimatedCoinsBadge from "@/components/AnimatedCoinsBadge";
import AnimatedCounter from "@/components/AnimatedCounter";
import WheelOfFortune from "@/components/WheelOfFortune";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import NotificationDot from "@/components/NotificationDot";
import { cardBacks } from "@/lib/card-backs";

import nfjezenf from "@assets/nfjezenf.png";
import newGemsImage from "@assets/ibibiz_1757453181053.png";
import gemsCart from "@assets/nbfejzifbzi_1757453308064.png";
import goldCoins from "@assets/jgfcf_1757454892811.png";
import coinStack from "@assets/mbibi_1757455067645.png";
import treasureCart from "@assets/cfgvg_1757455194327.png";

// Load Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function Shop() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if daily spin is available for wheel notification
  const { data: canSpin = false } = useQuery({
    queryKey: ["/api/daily-spin/can-spin"],
  }) as { data: boolean };
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [selectedPack, setSelectedPack] = useState<any>(null);
  
  // Check if we should show Battle Pass section
  const [showBattlePassSection, setShowBattlePassSection] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowBattlePassSection(params.get('battlepass') === 'true');
    
    // Check for payment success
    if (params.get('payment') === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your purchase was processed successfully. Your rewards have been added to your account.",
        duration: 5000,
      });
      
      // Refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
    
    // Check for payment cancellation
    if (params.get('payment') === 'canceled') {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. You can try again whenever you want.",
        variant: "destructive",
        duration: 3000,
      });
      
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [toast, queryClient]);

  // Hide body scroll and navigation when payment modal is open
  useEffect(() => {
    if (showCheckout || showPaymentModal) {
      // Prevent body scroll and make modal stable
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100vh';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      
      // Also prevent document scroll
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.position = 'fixed';
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100vh';
      
      // Store scroll position
      document.body.dataset.scrollY = scrollY.toString();
    } else {
      // Restore normal scrolling
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
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
        delete document.body.dataset.scrollY;
      }
    }
    
    // Cleanup on unmount
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
        if (response.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
          setShowCheckout(true);
        } else {
          toast({
            title: "Payment Error",
            description: data.message || "Unable to create payment. Check your connection.",
            variant: "destructive",
            duration: 5000,
          });
          setShowPaymentModal(true); // Re-show the modal
        }
      } else {
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
      setShowPaymentModal(true); // Re-show the modal
    }
  };

  const handlePaymentSuccess = () => {
    setShowCheckout(false);
    setClientSecret("");
    setSelectedPack(null);
    
    // Show success message
    toast({
      title: "Payment Successful!",
      description: "Your purchase was processed successfully. Your rewards have been added to your account.",
      duration: 5000,
    });
    
    // Refresh user data
    queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
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
    { id: 1, coins: 5000, price: 0.99, popular: false },
    { id: 2, coins: 30000, price: 4.99, popular: true },
    { id: 3, coins: 100000, price: 16.99, popular: false },
    { id: 4, coins: 1000000, price: 49.99, popular: false },
  ];

  const gemPacks = [
    { id: 1, gems: 50, price: 0.99, popular: false },
    { id: 2, gems: 300, price: 2.99, popular: true },
    { id: 3, gems: 1000, price: 7.99, popular: false },
    { id: 4, gems: 3000, price: 14.99, popular: false },
  ];

  // Get card backs from the card backs library
  const { data: ownedCardBacks = [] } = useQuery({
    queryKey: ["/api/inventory/card-backs"],
  });
  
  const isCardOwned = (cardId: string) => {
    return cardId === "classic" || (Array.isArray(ownedCardBacks) && ownedCardBacks.some((item: any) => item.itemId === cardId));
  };

  const handleCardBackPurchase = async (cardBack: any) => {
    try {
      const response = await fetch("/api/shop/buy-card-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          cardBackId: cardBack.id, 
          price: cardBack.price,
          currency: "gems"
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to buy card back");
      }
      
      // Refresh queries to update inventory and user balance
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/card-backs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/gems"] });
      
      toast({
        title: "Card purchased!",
        description: `You've successfully purchased ${cardBack.name}.`,
      });
    } catch (error: any) {
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to purchase card back. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
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
          </div>
          
          {/* Wheel of Fortune Button */}
          <WheelOfFortune>
            <motion.div
              className="relative cursor-pointer"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              data-testid="button-wheel-fortune"
            >
              {/* Simple wheel design */}
              <div className="relative w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full border-2 border-gray-300 shadow-lg">
                {/* Wheel segments */}
                <div className="absolute inset-1 rounded-full overflow-hidden">
                  <div className="w-full h-full" style={{
                    background: `conic-gradient(
                      from 0deg,
                      #4A5568 0deg 90deg,
                      #2D3748 90deg 180deg,
                      #1A202C 180deg 270deg,
                      #4A5568 270deg 360deg
                    )`
                  }}></div>
                </div>
                {/* Center dot */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                {/* Pointer */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-2 border-r-2 border-b-3 border-l-transparent border-r-transparent border-b-white shadow-sm"></div>
                </div>
              </div>
              
              {/* Notification dot for available spin */}
              <NotificationDot show={canSpin} />
            </motion.div>
          </WheelOfFortune>
        </motion.div>

        {/* Balance Display */}
        <motion.div
          className="flex justify-center space-x-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatedCoinsBadge 
            amount={user?.coins || 0} 
            glow 
            size="lg" 
            className="" 
            storageKey="previousShopCoinsBalance"
          />
          <div className="bg-white/5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center space-x-3">
            <Gem className="w-6 h-6 text-accent-purple" />
            <AnimatedCounter
              value={user?.gems || 0}
              storageKey="previousShopGemsBalance"
              className="text-accent-purple font-bold text-lg"
              testId="shop-gems"
            />
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
                      {battlePassPack.price}€
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
          <div className="flex items-center justify-center mb-6">
            <Coin className="w-8 h-8 text-accent-gold mr-3" />
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
                <div className="bg-accent-gold/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {pack.coins === 30000 ? (
                    <img 
                      src={goldCoins} 
                      alt="Premium Gold Coins"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.coins === 100000 ? (
                    <img 
                      src={coinStack} 
                      alt="100K Coin Stack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.coins === 1000000 ? (
                    <img 
                      src={treasureCart} 
                      alt="1M Treasure Cart"
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <Coin size={48} className="text-accent-gold" />
                  )}
                </div>
                <div className="text-3xl font-black text-accent-gold mb-1">
                  {pack.coins === 5000 ? '5K' : 
                   pack.coins === 30000 ? '30K' :
                   pack.coins === 100000 ? '100K' :
                   pack.coins === 1000000 ? '1M' : 
                   pack.coins.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mb-4 font-medium">coins</div>
                <Button
                  className="w-full bg-accent-gold hover:bg-accent-gold/90 text-ink font-bold py-3 px-4 rounded-2xl transition-colors"
                  data-testid={`button-buy-coins-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'coins')}
                >
                  Buy {pack.price}€
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
          <div className="flex items-center justify-center mb-6">
            <Gem className="w-8 h-8 text-accent-purple mr-3" />
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
                <div className="bg-accent-purple/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {pack.gems === 250 ? (
                    <img 
                      src={nfjezenf} 
                      alt="Premium Glowing Gems"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.gems === 500 ? (
                    <img 
                      src={newGemsImage} 
                      alt="500 Gems Pack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.gems === 1200 ? (
                    <img 
                      src={gemsCart} 
                      alt="1200 Gems Pack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <Gem className="w-10 h-10 text-accent-purple" />
                  )}
                </div>
                <div className="text-3xl font-black text-accent-purple mb-1">
                  {pack.gems === 50 ? '50' : 
                   pack.gems === 300 ? '300' :
                   pack.gems === 1000 ? '1K' :
                   pack.gems === 3000 ? '3K' : 
                   pack.gems.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mb-4 font-medium">gems</div>
                <Button
                  className="w-full bg-accent-purple hover:bg-accent-purple/90 text-white font-bold py-3 px-4 rounded-2xl transition-colors"
                  data-testid={`button-buy-gems-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'gems')}
                >
                  Buy {pack.price}€
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
          <div className="flex items-center justify-center mb-6">
            <Crown className="w-6 h-6 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Card Backs</h2>
          </div>
          <div className="space-y-4">
            {cardBacks.filter(cardBack => cardBack.available && cardBack.price).map((cardBack, index) => (
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
                    {isCardOwned(cardBack.id) ? (
                      <div className="bg-accent-green/20 text-accent-green px-4 py-2 rounded-2xl font-bold text-sm">
                        Owned
                      </div>
                    ) : (
                      <Button
                        className="bg-accent-green hover:bg-accent-green/90 text-ink font-bold py-3 px-4 rounded-2xl flex items-center space-x-2"
                        data-testid={`button-buy-cardback-${cardBack.id}`}
                        onClick={() => handleCardBackPurchase(cardBack)}
                      >
                        <span>{cardBack.price}</span>
                        <Gem className="w-4 h-4" />
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
              transform: 'translateZ(0)' // Force hardware acceleration
            }}
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
                    ? `${selectedPack?.coins?.toLocaleString()} coins - ${selectedPack?.price}€`
                    : selectedPack?.packType === 'gems'
                    ? `${selectedPack?.gems?.toLocaleString()} gems - ${selectedPack?.price}€`
                    : `${selectedPack?.name} - ${selectedPack?.price}€`
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
                  <div className="text-sm opacity-80">Visa, Mastercard, and other cards</div>
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
              transform: 'translateZ(0)' // Force hardware acceleration
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
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
            
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorPrimary: '#00d924',
                    colorBackground: '#0a0e1a',
                    colorText: '#ffffff',
                    colorDanger: '#df1b41',
                    fontFamily: 'system-ui, sans-serif',
                    spacingUnit: '4px',
                    borderRadius: '12px',
                  },
                  rules: {
                    '.Input': {
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    },
                    '.Input:focus': {
                      border: '1px solid #00d924',
                      boxShadow: '0 0 0 1px #00d924',
                    },
                    '.Label': {
                      color: '#ffffff',
                    },
                    '.Tab': {
                      backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                    },
                    '.Tab:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    },
                    '.Tab--selected': {
                      backgroundColor: '#00d924',
                      color: '#0a0e1a',
                    }
                  }
                }
              }}
            >
              <CheckoutForm 
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
                amount={selectedPack.price}
                pack={selectedPack}
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
                    ? `${selectedPack?.coins?.toLocaleString()} coins for ${selectedPack?.price}€`
                    : selectedPack?.packType === 'gems'
                    ? `${selectedPack?.gems?.toLocaleString()} gems for ${selectedPack?.price}€`
                    : `${selectedPack?.name} for ${selectedPack?.price}€`
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