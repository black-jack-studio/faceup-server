import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Star, RotateCcw, Gift, Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useState, useEffect } from 'react';
import { Gem, Crown } from "@/icons";
import { Ticket } from "@/components/ui/Ticket";
import { Coin } from "@/icons";
import OffsuitCard from "@/components/PlayingCard";
import CoinsBadge from "@/components/CoinsBadge";
import AnimatedCoinsBadge from "@/components/AnimatedCoinsBadge";
import AnimatedCounter from "@/components/AnimatedCounter";
import WheelOfFortune from "@/components/WheelOfFortune";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_BASE_URL } from "../lib/apiBase";

import newGemImage from "@assets/nfjezenf_1758044629929.png";
import newGemsImage from "@assets/ibibiz_1757453181053.png";
import newGemsImageFor1K from "@assets/ibibiz_1758046156490.png";
import gemsCart from "@assets/nbfejzifbzi_1757453308064.png";
import gemsWagon from "@assets/nbfejzifbzi_1758059160481.png";
import goldCoins from "@assets/jgfcf_1757454892811.png";
import coinStack from "@assets/mbibi_1757455067645.png";
import treasureCart from "@assets/cfgvg_1757455194327.png";
export default function Shop() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const { updateUser, loadUser } = useUserStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);

  // Check if we should show Battle Pass section
  const [showBattlePassSection, setShowBattlePassSection] = useState(false);

  // Mystery card back purchase states
  const [isPurchasingMystery, setIsPurchasingMystery] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);

  // Gem purchase loading states
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  // Removed automatic user data sync on mount - user store already maintains fresh data
  // and loading on every shop visit can cause unnecessary API calls and session issues

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
    popular: false,
    benefits: [
      'Unlock all premium rewards',
      'Exclusive avatars & card backs',
      'Double XP bonus',
      'Premium seasonal content'
    ]
  };

  const coinPacks = [
    { id: 1, coins: 5000, price: 0.99, popular: false },
    { id: 2, coins: 30000, price: 3.99, popular: true },
    { id: 3, coins: 100000, price: 14.99, popular: false },
    { id: 4, coins: 1000000, price: 49.99, popular: false },
  ];

  const gemPacks = [
    { id: 1, gems: 50, price: 0.99, popular: false },
    { id: 2, gems: 300, price: 2.99, popular: true },
    { id: 3, gems: 1000, price: 7.99, popular: false },
    { id: 4, gems: 3000, price: 14.99, popular: false },
  ];

  // Gem shop offers (buy with gems)
  const gemOffers = [
    { id: 'coins-5k', type: 'coins', amount: 5000, gemCost: 50, label: '5K Coins', popular: false },
    { id: 'coins-15k', type: 'coins', amount: 15000, gemCost: 100, label: '15K Coins', popular: false },
    { id: 'tickets-3', type: 'tickets', amount: 3, gemCost: 30, label: '3 Tickets', popular: false },
    { id: 'tickets-10', type: 'tickets', amount: 10, gemCost: 50, label: '10 Tickets', popular: false },
  ];

  // Mystery pack only - no individual card back purchases needed

  const handleMysteryCardBackPurchase = async () => {
    if (isPurchasingMystery) return;

    try {
      // Check if user has enough gems before making the request
      if (!user || (user.gems || 0) < 50) {
        toast({
          title: "Insufficient gems",
          description: "You need 50 gems to purchase a mystery card back.",
          variant: "destructive",
        });
        return;
      }

      setIsPurchasingMystery(true);

      // Store original gems for potential rollback
      const originalGems = user.gems || 0;

      // Optimistically debit gems locally for immediate UI feedback
      updateUser({ gems: originalGems - 50 });

      const response = await apiRequest('POST', '/api/shop/mystery-card-back');

      const result = await response.json();

      if (!response.ok) {
        // Revert the optimistic update by restoring original gems
        updateUser({ gems: originalGems });

        if (response.status === 409) {
          toast({
            title: "Collection Complete!",
            description: result.error || "You already own all available card backs.",
            duration: 5000,
          });
        } else if (response.status === 400) {
          toast({
            title: "Insufficient gems",
            description: result.error || "You need 50 gems to purchase a mystery card back.",
            variant: "destructive",
          });
        } else {
          throw new Error(result.error || "Failed to buy card back");
        }
        return;
      }

      // Success - show result modal
      setPurchaseResult(result.data);
      setShowResultModal(true);

      // Refresh inventory and user data to sync with server
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/card-backs"] });
      await loadUser(); // Reload user data to ensure sync with server

    } catch (error: any) {
      // Revert optimistic update on unexpected errors
      if (user) {
        updateUser({ gems: user.gems || 0 });
      }
      toast({
        title: "Purchase failed",
        description: error.message || "Failed to purchase mystery card back. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasingMystery(false);
    }
  };

  // Handle gem offer purchases
  const handleGemOfferPurchase = async (offer: any) => {
    if (!user || isPurchasing) return;

    const userGems = user.gems || 0;
    if (userGems < offer.gemCost) {
      toast({
        title: "Insufficient gems",
        description: `You need ${offer.gemCost} gems for this purchase.`,
        variant: "destructive",
      });
      return;
    }

    setIsPurchasing(offer.id);

    try {
      // Optimistically update gems
      const originalGems = user.gems || 0;
      const newGems = originalGems - offer.gemCost;
      updateUser({ gems: newGems });

      // Update coins or tickets optimistically  
      if (offer.type === 'coins') {
        const newCoins = (user.coins || 0) + offer.amount;
        updateUser({ coins: newCoins });
      } else if (offer.type === 'tickets') {
        const newTickets = (user.tickets || 0) + offer.amount;
        updateUser({ tickets: newTickets });
      }

      // API call to process purchase (only send offer ID for security)
      const response = await apiRequest("POST", "/api/shop/gem-purchase", {
        offerId: offer.id
      });

      const result = await response.json();

      if (!response.ok) {
        // Revert optimistic update
        updateUser({
          gems: originalGems,
          ...(offer.type === 'coins' ? { coins: user.coins || 0 } : {}),
          ...(offer.type === 'tickets' ? { tickets: user.tickets || 0 } : {})
        });

        throw new Error(result.error || "Purchase failed");
      }

      // Success toast
      toast({
        title: "Purchase Successful!",
        description: `${offer.label} added to your account!`,
        duration: 3000,
      });

      // Sync with server
      await loadUser();

    } catch (error: any) {
      console.error("Purchase error details:", error);
      toast({
        title: "Purchase failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(null);
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setPurchaseResult(null);
  };

  const handleEquipPurchasedCardBack = async () => {
    if (!purchaseResult?.cardBack) return;

    try {
      updateUser({ selectedCardBackId: purchaseResult.cardBack.id });
      toast({
        title: "Card Back Equipped!",
        description: `${purchaseResult.cardBack.name} is now your active card back.`
      });
      setShowResultModal(false);
      setPurchaseResult(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to equip card back.",
        variant: "destructive"
      });
    }
  };


  return (
    <div className="min-h-screen text-white p-6 overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
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

            </motion.div>
          </WheelOfFortune>
        </motion.div>

        {/* Balance Display */}
        <motion.div
          className="flex items-center justify-center space-x-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-white/5 px-3.5 py-2 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center justify-center space-x-3">
            <Gem className="w-6 h-6 text-accent-purple" />
            <AnimatedCounter
              value={user?.gems || 0}
              storageKey="previousShopGemsBalance"
              className="text-accent-purple font-bold text-[15px]"
              testId="shop-gems"
            />
          </div>
          <AnimatedCoinsBadge
            amount={user?.coins || 0}
            glow
            size="lg"
            className="flex-shrink-0"
            storageKey="previousShopCoinsBalance"
          />
          <div className="bg-white/5 px-3.5 py-2 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center justify-center space-x-3">
            <Ticket size={24} />
            <AnimatedCounter
              value={user?.tickets || 0}
              storageKey="shopTicketsBalance"
              className="text-white font-bold text-[15px]"
              testId="shop-tickets"
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
              <Crown className="w-6 h-6 text-white mr-3" />
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
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {battlePassPack.name}
                    </h3>
                    <p className="text-white/80 text-sm">
                      Unlock exclusive seasonal content and premium rewards
                    </p>
                  </div>
                  <div className="bg-yellow-500/20 w-16 h-16 rounded-2xl flex items-center justify-center">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Benefits List */}
                <div className="mb-6 space-y-2">
                  {battlePassPack.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Star className="w-4 h-4 text-white flex-shrink-0" />
                      <span className="text-white/90 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>

                {/* Price and Purchase */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-white">
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
            <Coin className="w-8 h-8 text-white mr-3" />
            <h2 className="text-2xl font-bold text-white">Coin Packs</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {coinPacks.map((pack, index) => (
              <motion.div
                key={pack.id}
                className="bg-white/5 rounded-3xl p-5 border border-white/10 backdrop-blur-sm text-center relative overflow-hidden cursor-pointer"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                data-testid={`button-buy-coins-${pack.id}`}
                onClick={() => handleSelectPack(pack, 'coins')}
              >
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
                    <Coin size={48} className="text-white" />
                  )}
                </div>
                <div className="text-3xl font-black text-white mb-1">
                  {pack.coins === 5000 ? '5K' :
                    pack.coins === 30000 ? '30K' :
                      pack.coins === 100000 ? '100K' :
                        pack.coins === 1000000 ? '1M' :
                          pack.coins.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mb-4 font-medium">coins</div>
                <div className="text-accent-gold font-bold text-lg">
                  {pack.price}€
                </div>
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
                className="bg-white/5 rounded-3xl p-5 border border-white/10 backdrop-blur-sm text-center relative overflow-hidden cursor-pointer"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
                data-testid={`button-buy-gems-${pack.id}`}
                onClick={() => handleSelectPack(pack, 'gems')}
              >
                <div className="bg-accent-purple/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {pack.gems === 250 || pack.gems === 300 ? (
                    <img
                      src={newGemImage}
                      alt="Premium Glowing Gems"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.gems === 500 ? (
                    <img
                      src={newGemsImage}
                      alt="500 Gems Pack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.gems === 1000 ? (
                    <img
                      src={newGemsImageFor1K}
                      alt="1K Gems Pack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.gems === 1200 ? (
                    <img
                      src={gemsCart}
                      alt="1200 Gems Pack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.gems === 3000 ? (
                    <img
                      src={gemsWagon}
                      alt="3K Gems Wagon"
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <Gem className="w-10 h-10 text-accent-purple" />
                  )}
                </div>
                <div className="text-3xl font-black mb-1 text-[#ffffff]">
                  {pack.gems === 50 ? '50' :
                    pack.gems === 300 ? '300' :
                      pack.gems === 1000 ? '1K' :
                        pack.gems === 3000 ? '3K' :
                          pack.gems.toLocaleString()}
                </div>
                <div className="text-sm text-white/60 mb-4 font-medium">gems</div>
                <div className="text-accent-purple font-bold text-lg">
                  {pack.price}€
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Gem Offers Section */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-center justify-center mb-6">
            <Gem className="w-8 h-8 text-accent-purple mr-3" />
            <h2 className="text-2xl font-bold text-white">Gem Exchange</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {gemOffers.map((offer) => {
              const isDisabled = isPurchasing === offer.id || !user || (user.gems || 0) < offer.gemCost;
              return (
                <motion.div
                  key={offer.id}
                  className="bg-white/5 rounded-3xl p-5 border border-white/10 backdrop-blur-sm text-center relative overflow-hidden cursor-pointer"
                  whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
                  whileTap={!isDisabled ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.2 }}
                  data-testid={`button-buy-${offer.id}`}
                  onClick={() => !isDisabled && handleGemOfferPurchase(offer)}
                  style={{
                    opacity: isDisabled ? 0.5 : 1,
                    cursor: isDisabled ? 'not-allowed' : 'pointer'
                  }}
                >
                  <div className="flex items-center justify-center mx-auto mb-4">
                    {offer.type === 'coins' ? (
                      <Coin size={48} className="text-white" />
                    ) : (
                      <Ticket size={56} className="text-white" />
                    )}
                  </div>
                  <div className="text-3xl font-black mb-1 text-white">
                    {offer.amount === 5000 ? '5K' :
                      offer.amount === 15000 ? '15K' :
                        offer.amount.toLocaleString()}
                  </div>
                  <div className="text-sm mb-4 font-medium text-white/60">
                    {offer.type === 'coins' ? 'coins' : 'tickets'}
                  </div>
                  <div className="text-accent-purple font-bold text-lg flex items-center justify-center gap-1">
                    {isPurchasing === offer.id ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="text-lg font-bold">{offer.gemCost}</span>
                        <Gem className="w-5 h-5" />
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Card Backs Section Title */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-3xl font-black text-white">Card Backs</h2>
        </motion.div>

        {/* Mystery Card Back */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <motion.div
            className="bg-gradient-to-br from-white/5 to-white/10 rounded-3xl p-6 border border-white/10 backdrop-blur-sm relative overflow-hidden"
            whileHover={{ scale: 1.01, y: -2 }}
            transition={{ duration: 0.2 }}
          >
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-white/5 rounded-3xl" />

            <div className="relative z-10 flex flex-col items-center text-center space-y-6">
              {/* Mystery Card Back Visual */}
              <div className="relative">
                <div
                  className="relative w-20 h-28 bg-black rounded-2xl border-2 border-white flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
                    boxShadow: '0 0 20px rgba(96, 165, 250, 0.2)',
                    animation: 'mysteryCardGlow 2s ease-in-out infinite'
                  }}
                >
                  <span className="text-white text-3xl font-bold">?</span>
                </div>
              </div>

              {/* Purchase Button */}
              <motion.button
                className="bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3"
                data-testid="button-buy-mystery-cardback"
                onClick={handleMysteryCardBackPurchase}
                disabled={isPurchasingMystery || !user || (user.gems || 0) < 50}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  hover: { duration: 0.2 },
                  tap: { duration: 0.1 }
                }}
              >
                {isPurchasingMystery ? (
                  <RotateCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="text-lg">Buy</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-lg font-bold">50</span>
                      <Gem className="w-5 h-5" />
                    </div>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.section>

      </div>
      {/* Mystery Card Back Result Modal */}
      {showResultModal && purchaseResult && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
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
            className="bg-gradient-to-br from-ink/95 to-gray-900/95 border border-white/10 rounded-3xl p-8 max-w-xs w-full backdrop-blur-2xl shadow-2xl relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              touchAction: 'auto',
              position: 'relative',
              transform: 'translateZ(0)'
            }}
          >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-green/5 via-transparent to-blue-500/5 rounded-3xl" />
            <div className="absolute -inset-px bg-gradient-to-br from-accent-green/20 via-transparent to-blue-500/20 rounded-3xl blur-sm" />

            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCloseResultModal}
              className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10 rounded-xl w-10 h-10 p-0 transition-all"
              data-testid="button-close-modal"
            >
              ✕
            </Button>

            <div className="relative z-10 text-center">
              {/* Card Back Display */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Card Back Preview */}
                <div className="w-20 h-28 mx-auto mb-4">
                  <OffsuitCard
                    rank="A"
                    suit="spades"
                    faceDown={true}
                    size="sm"
                    cardBackUrl={purchaseResult.cardBack.imageUrl}
                    className="w-full h-full"
                  />
                </div>

                <h3 className="text-white font-bold text-lg mb-2">
                  {purchaseResult.cardBack.name}
                </h3>
              </motion.div>

              {/* Equip Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold py-3 px-6 rounded-2xl transition-colors"
                  onClick={handleEquipPurchasedCardBack}
                  data-testid="button-equip-card-back"
                >
                  Equip
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
