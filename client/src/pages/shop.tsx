import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart, Star, RotateCcw, Gift, Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useState, useEffect } from 'react';
import { Gem, Crown } from "@/icons";
import { Bolt } from "@/components/ui/Bolt";
import { Coin } from "@/icons";
import OffsuitCard from "@/components/PlayingCard";
import CoinsBadge from "@/components/CoinsBadge";
import AnimatedCoinsBadge from "@/components/AnimatedCoinsBadge";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_BASE_URL } from "../lib/apiBase";
import { CHEST_TIERS, CHEST_BOLT_COST, type ChestTier } from "@shared/chestCatalog";

import newGemImage from "@assets/nfjezenf_1758044629929.png";
import newGemsImage from "@assets/ibibiz_1757453181053.png";
import newGemsImageFor1K from "@assets/ibibiz_1758046156490.png";
import gemsCart from "@assets/nbfejzifbzi_1757453308064.png";
import gemsWagon from "@assets/nbfejzifbzi_1758059160481.png";
import goldCoins from "@assets/jgfcf_1757454892811.png";
import coinStack from "@assets/mbibi_1757455067645.png";
import treasureCart from "@assets/cfgvg_1757455194327.png";
import chestBronzeImage from "@assets/chest_bronze_1758975400000.png";
import chestSilverImage from "@assets/chest_silver_1758975400001.png";
import chestGoldImage from "@assets/chest_gold_1758975400002.png";

const CHEST_IMAGES: Record<ChestTier, string> = {
  bronze: chestBronzeImage,
  silver: chestSilverImage,
  gold: chestGoldImage,
};

// Abbreviates round thousands/millions (1000 -> "1K", 20000 -> "20K", 1000000 -> "1M"),
// falling back to a plain formatted number for anything that doesn't divide evenly —
// avoids a hardcoded per-value lookup that silently breaks every time pack amounts change.
function formatAmount(n: number): string {
  if (n >= 1000000 && n % 1000000 === 0) return `${n / 1000000}M`;
  if (n >= 1000 && n % 1000 === 0) return `${n / 1000}K`;
  return n.toLocaleString();
}

export default function Shop() {
  const [, navigate] = useLocation();
  const user = useUserStore((state) => state.user);
  const { updateUser, loadUser } = useUserStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Drives the red badge on the wheel icon — same query/key the wheel page itself uses.
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean }>({
    queryKey: ["/api/daily-spin/free/can-spin"],
  });
  const canSpinFreeWheel = freeSpinStatus?.canSpin ?? false;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<any>(null);

  // Check if we should show Battle Pass section
  const [showBattlePassSection, setShowBattlePassSection] = useState(false);

  // Gem purchase loading states
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  // Chest opening state
  const [openingChestTier, setOpeningChestTier] = useState<ChestTier | null>(null);
  const [chestReward, setChestReward] = useState<
    | { type: 'coins' | 'gems' | 'bolts'; amount: number }
    | { type: 'card_back'; cardBack: { id: string; name: string; imageUrl: string }; duplicate: boolean }
    | null
  >(null);
  const [showChestReward, setShowChestReward] = useState(false);

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
    { id: 1, coins: 1000, price: 0.99, popular: false },
    { id: 2, coins: 5000, price: 3.99, popular: true },
    { id: 3, coins: 20000, price: 14.99, popular: false },
    { id: 4, coins: 100000, price: 49.99, popular: false },
  ];

  const gemPacks = [
    { id: 1, gems: 50, price: 0.99, popular: false },
    { id: 2, gems: 300, price: 2.99, popular: true },
    { id: 3, gems: 1000, price: 7.99, popular: false },
    { id: 4, gems: 3000, price: 14.99, popular: false },
  ];

  // Gem shop offers (buy with gems). id values are the server's GEM_OFFERS keys — keep
  // them as-is even though they no longer match the amount (e.g. 'coins-5k' now gives
  // 750, not 5000); only amount/label describe what the offer actually gives.
  const gemOffers = [
    { id: 'coins-5k', type: 'coins', amount: 750, gemCost: 50, label: '750 Coins', popular: false },
    { id: 'coins-15k', type: 'coins', amount: 1500, gemCost: 100, label: '1.5K Coins', popular: false },
    { id: 'bolts-3', type: 'bolts', amount: 3, gemCost: 30, label: '3 Bolts', popular: false },
    { id: 'bolts-10', type: 'bolts', amount: 10, gemCost: 50, label: '10 Bolts', popular: false },
  ];

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

      // Update coins or bolts optimistically
      if (offer.type === 'coins') {
        const newCoins = (user.coins || 0) + offer.amount;
        updateUser({ coins: newCoins });
      } else if (offer.type === 'bolts') {
        const newBolts = (user.bolts || 0) + offer.amount;
        updateUser({ bolts: newBolts });
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
          ...(offer.type === 'bolts' ? { bolts: user.bolts || 0 } : {})
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

  const handleOpenChest = async (tier: ChestTier) => {
    if (openingChestTier) return;

    const cost = CHEST_BOLT_COST[tier];
    if (!user || (user.bolts || 0) < cost) {
      toast({
        title: "Not enough bolts",
        description: `You need ${cost} bolts to open this chest.`,
        variant: "destructive",
      });
      return;
    }

    setOpeningChestTier(tier);

    try {
      // The server owns the reward and re-checks the cost — this call is the source of truth.
      const response = await apiRequest("POST", "/api/chests/open", { tier });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to open chest");
      }

      const reward = data.reward;

      if (reward.type === 'card_back') {
        // Bolts were spent, nothing else changes locally — the card back itself lives
        // server-side until the profile's card-back list is refetched.
        updateUser({ bolts: (user.bolts || 0) - cost });
        queryClient.invalidateQueries({ queryKey: ["/api/user/card-backs"] });
      } else {
        updateUser({
          bolts: (user.bolts || 0) - cost + (reward.type === 'bolts' ? reward.amount : 0),
          ...(reward.type === 'coins' ? { coins: (user.coins || 0) + reward.amount } : {}),
          ...(reward.type === 'gems' ? { gems: (user.gems || 0) + reward.amount } : {}),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });

      setChestReward(reward);
      setShowChestReward(true);
    } catch (error: any) {
      toast({
        title: "Failed to open chest",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setOpeningChestTier(null);
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

          {/* Wheel of Fortune Button — navigates to its own page rather than opening a popup */}
          <motion.div
            className="relative cursor-pointer"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/wheel-of-fortune")}
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

            {canSpinFreeWheel && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
              </span>
            )}
          </motion.div>
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
            <Bolt size={24} />
            <AnimatedCounter
              value={user?.bolts || 0}
              storageKey="shopBoltsBalance"
              className="text-white font-bold text-[15px]"
              testId="shop-bolts"
            />
          </div>
        </motion.div>

        {/* Chests — bronze/silver spend bolts for a random coins/gems/bolts reward; gold
            spends bolts for a random card back instead (uniform odds, no rarity). */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center justify-center mb-6">
            <Bolt size={28} className="mr-3" />
            <h2 className="text-2xl font-bold text-white">Chests</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {CHEST_TIERS.map((tier) => {
              const cost = CHEST_BOLT_COST[tier];
              const isOpening = openingChestTier === tier;
              // Always shown at full opacity/clickable regardless of balance — an
              // insufficient-bolts tap surfaces a toast instead of graying the chest out.
              const isBusy = !!openingChestTier;
              return (
                <motion.div
                  key={tier}
                  className="bg-white/5 rounded-3xl px-2 pt-6 pb-5 border border-white/10 text-center relative overflow-hidden cursor-pointer"
                  whileHover={!isBusy ? { scale: 1.03, y: -2 } : {}}
                  whileTap={!isBusy ? { scale: 0.97 } : {}}
                  transition={{ duration: 0.2 }}
                  data-testid={`button-open-chest-${tier}`}
                  onClick={() => !isBusy && handleOpenChest(tier)}
                  style={{ cursor: isBusy ? 'not-allowed' : 'pointer' }}
                >
                  <motion.img
                    src={CHEST_IMAGES[tier]}
                    alt={`${tier} chest`}
                    className="w-[90%] h-auto object-contain mx-auto mb-3"
                    animate={isOpening ? { rotate: [-4, 4, -4, 4, 0], scale: [1, 1.08, 1] } : {}}
                    transition={isOpening ? { duration: 0.6, repeat: Infinity } : {}}
                  />
                  <div className="text-white font-bold text-base mb-2 capitalize">{tier}</div>
                  <div className="flex items-center justify-center gap-1.5 text-white font-bold text-lg">
                    {isOpening ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{cost}</span>
                        <Bolt size={20} />
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

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
                  {pack.coins === 5000 ? (
                    <img
                      src={goldCoins}
                      alt="Premium Gold Coins"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.coins === 20000 ? (
                    <img
                      src={coinStack}
                      alt="20K Coin Stack"
                      className="w-14 h-14 object-contain"
                    />
                  ) : pack.coins === 100000 ? (
                    <img
                      src={treasureCart}
                      alt="100K Treasure Cart"
                      className="w-14 h-14 object-contain"
                    />
                  ) : (
                    <Coin size={48} className="text-white" />
                  )}
                </div>
                <div className="text-3xl font-black text-white mb-1">
                  {formatAmount(pack.coins)}
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
                      <Bolt size={56} className="text-white" />
                    )}
                  </div>
                  <div className="text-3xl font-black mb-1 text-white">
                    {offer.amount === 5000 ? '5K' :
                      offer.amount === 15000 ? '15K' :
                        offer.amount.toLocaleString()}
                  </div>
                  <div className="text-sm mb-4 font-medium text-white/60">
                    {offer.type === 'coins' ? 'coins' : 'bolts'}
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

      </div>
      {/* Chest Reward Popup */}
      {showChestReward && chestReward && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowChestReward(false)}
        >
          {chestReward.type === 'card_back' ? (
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <div className="w-28 h-40 flex items-center justify-center">
                <OffsuitCard
                  rank="A"
                  suit="spades"
                  faceDown={true}
                  size="md"
                  cardBackUrl={chestReward.cardBack.imageUrl}
                />
              </div>
              <p className="text-white font-bold text-lg">{chestReward.cardBack.name}</p>
              {chestReward.duplicate && (
                <p className="text-white/60 text-sm">Already owned — no new copy added.</p>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="flex items-center space-x-4"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <motion.div
                className="text-6xl font-light tracking-tight text-white"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                +{chestReward.amount}
              </motion.div>
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
              >
                {chestReward.type === 'coins' ? (
                  <Coin size={64} glow />
                ) : chestReward.type === 'gems' ? (
                  <Gem className="w-16 h-16" />
                ) : (
                  <Bolt size={64} glow />
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}

    </div>
  );
}
