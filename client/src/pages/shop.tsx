import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useState, useEffect } from 'react';
import { Gem, Crown } from "@/icons";
import { Coin } from "@/icons";
import OffsuitCard from "@/components/PlayingCard";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { chestCostFor, type ChestTier } from "@shared/chestCatalog";

// Every coin/gem pack tier renders the same master artwork now (matches the Coin/Gem icon
// components used everywhere else in the app), instead of a different photoreal pile per size.
import newGemImage from "@assets/gem_diamond_blue_2026-08-26.png";
import goldCoins from "@assets/coin_gold_crown_2026-08-26.png";
// Shop chest tiles show off the actual Battle Pass premium chests, not their own dedicated
// art: bronze -> premium tier 1's chest (Crown), silver -> tier 2's (Gold), gold -> tier 5's
// (Purple) -- see getChestTierForPassTier() in shared/battlePassChests.ts for that mapping.
// Named for what they show, not the shop's own bronze/silver/gold tier keys, since those no
// longer match (e.g. the shop's "silver" tier renders the Gold battle pass chest).
import chestTier1PremiumImage from "@assets/battlepass_chests/chest_crown_1787823960.png";
import chestTier2PremiumImage from "@assets/battlepass_chests/chest_gold_1787823960.png";
import chestTier5PremiumImage from "@assets/battlepass_chests/chest_purple_1787823960.png";
import { formatFullNumber } from "@/lib/formatUtils";

const CHEST_IMAGES: Record<ChestTier, string> = {
  bronze: chestTier1PremiumImage,
  silver: chestTier2PremiumImage,
  gold: chestTier5PremiumImage,
};

// Display order only (bronze/silver/gold's own tier keys, pricing, etc. are untouched) --
// Anatole wanted Silver shown first, then Gold, with Bronze last.
const CHEST_DISPLAY_ORDER: ChestTier[] = ['silver', 'gold', 'bronze'];

// Abbreviates thousands/millions (1000 -> "1K", 1500 -> "1.5K", 20000 -> "20K",
// 1000000 -> "1M"), falling back to a plain formatted number under 1K — avoids a
// hardcoded per-value lookup that silently breaks every time pack amounts change.
function formatAmount(n: number): string {
  if (n >= 1000000) {
    const v = n / 1000000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}K`;
  }
  return formatFullNumber(n);
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

  const [, setShowPaymentModal] = useState(false);
  const [, setSelectedPack] = useState<any>(null);

  // Check if we should show Battle Pass section
  const [showBattlePassSection, setShowBattlePassSection] = useState(false);

  // Gem purchase loading states
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  // Chest opening state
  const [openingChestTier, setOpeningChestTier] = useState<ChestTier | null>(null);
  const [chestReward, setChestReward] = useState<
    | { type: 'coins' | 'gems'; amount: number }
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
    { id: 3, coins: 15000, price: 9.99, popular: false },
    { id: 4, coins: 40000, price: 19.99, popular: false },
    { id: 5, coins: 100000, price: 39.99, popular: false },
    { id: 6, coins: 250000, price: 79.99, popular: false },
  ];

  const gemPacks = [
    { id: 1, gems: 50, price: 0.99, popular: false },
    { id: 2, gems: 300, price: 2.99, popular: true },
    { id: 3, gems: 700, price: 5.99, popular: false },
    { id: 4, gems: 1500, price: 11.99, popular: false },
    { id: 5, gems: 3500, price: 24.99, popular: false },
    { id: 6, gems: 8000, price: 49.99, popular: false },
  ];

  // Gem shop offers (buy with gems). id values are the server's GEM_OFFERS keys — keep
  // them as-is even though they no longer match the amount (e.g. 'coins-5k' now gives
  // 750, not 5000); only amount/label describe what the offer actually gives.
  const gemOffers = [
    { id: 'coins-5k', type: 'coins', amount: 750, gemCost: 50, label: '750 Coins', popular: false },
    { id: 'coins-15k', type: 'coins', amount: 1500, gemCost: 100, label: '1.5K Coins', popular: false },
    // Same 15 coins-per-gem rate as the two offers above, one tier up.
    { id: 'coins-3000', type: 'coins', amount: 3000, gemCost: 200, label: '3K Coins', popular: false },
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

      // Update coins optimistically
      if (offer.type === 'coins') {
        const newCoins = (user.coins || 0) + offer.amount;
        updateUser({ coins: newCoins });
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

    const cost = chestCostFor(tier);
    if (!user || (user.gems || 0) < cost) {
      toast({
        title: "Not enough gems",
        description: `You need ${cost} gems to open this chest.`,
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
        if (data.allOwned) {
          toast({
            title: "Collection complete!",
            description: data.message || "You already own every card back.",
          });
          return;
        }
        throw new Error(data.message || "Failed to open chest");
      }

      const reward = data.reward;

      if (reward.type === 'card_back') {
        // Gems were spent, nothing else changes locally — the card back itself lives
        // server-side until the profile's card-back list is refetched.
        updateUser({ gems: (user.gems || 0) - cost });
        queryClient.invalidateQueries({ queryKey: ["/api/user/card-backs"] });
      } else {
        updateUser({
          gems: (user.gems || 0) - cost + (reward.type === 'gems' ? reward.amount : 0),
          ...(reward.type === 'coins' ? { coins: (user.coins || 0) + reward.amount } : {}),
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
    <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Header — fixed in place while the page scrolls underneath, same pattern as home.tsx's
          own header. Mirrors home's header row: a compact balance indicator on each side
          instead of a page title, same font/format as the coins counter that crossfades in
          there while scrolling. */}
      {/* Fixed elements ignore body's own safe-area padding-top (see index.css), so unlike
          Profile's icons — which sit in normal flow and inherit it "for free" via a plain
          top-6/24px offset on top of that inherited clearance — this needs the inset added
          back in explicitly, or it reads flush against the status bar/notch. Matches Profile's
          same env(safe-area-inset-top) + 24px total. */}
      {/* Forces its own GPU-composited layer -- on iOS WKWebView, a plain "fixed" header can
          otherwise lag a frame behind during fast/momentum scrolling, letting the scrolled
          content underneath flash through the header's own background for an instant. */}
      <header
        className="fixed top-0 inset-x-0 z-20 bg-black px-6 pb-3"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)",
          transform: "translateZ(0)",
          WebkitTransform: "translateZ(0)",
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        <motion.div
          className="max-w-md mx-auto flex items-center justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-1.5 pl-1">
            <Gem className="w-6 h-6" />
            <span className="text-lg font-light text-sky-400" data-testid="shop-header-gems">
              {formatFullNumber(user?.gems || 0)}
            </span>
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
              <motion.span
                className="absolute -top-1 -right-1 flex h-3.5 w-3.5 rounded-full bg-red-500 items-center justify-center"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <svg width="14" height="14" viewBox="0 0 12 12" className="pointer-events-none">
                  <rect x="5.55" y="2.8" width="0.9" height="4.3" rx="0.45" fill="white" fillOpacity="0.85" />
                  <circle cx="6" cy="8.6" r="0.55" fill="white" fillOpacity="0.85" />
                </svg>
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      </header>
      {/* Spacer for the now-fixed header above, so content starts where it used to — grows
          by the same safe-area inset the header's own padding-top just gained. */}
      {/* +16px on top of the header's own height: the Chests title pill above overlaps
          its section's top edge (-top-3), and without this the fixed header's opaque
          background clips the top of its letters. */}
      <div aria-hidden style={{ height: "calc(env(safe-area-inset-top) + 88px + 16px)" }} />
      <div className="max-w-md mx-auto px-6 pb-6">
        {/* Chests — bronze/silver spend gems for a random coins/gems reward; gold spends
            gems for a random card back instead (uniform odds, no rarity). */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="relative rounded-[20px] pt-14 pb-4 px-2">
            <div className="absolute -top-3 left-0 right-0 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Chests</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CHEST_DISPLAY_ORDER.map((tier) => {
                const cost = chestCostFor(tier);
                const isOpening = openingChestTier === tier;
                // Always shown at full opacity/clickable regardless of balance — an
                // insufficient-gems tap surfaces a toast instead of graying the chest out.
                const isBusy = !!openingChestTier;
                return (
                  <motion.div
                    key={tier}
                    className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
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
                      className="w-20 h-20 object-contain mx-auto mb-2"
                      animate={isOpening ? { rotate: [-4, 4, -4, 4, 0], scale: [1, 1.08, 1] } : {}}
                      transition={isOpening ? { duration: 0.6, repeat: Infinity } : {}}
                    />
                    <div className="text-white font-bold text-xl mb-1 capitalize">{tier}</div>
                    <div className="flex items-center justify-center gap-1.5 text-accent-blue font-bold text-base">
                      {isOpening ? (
                        <RotateCcw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Gem className="w-5 h-5" />
                          <span>{cost}</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
                      €{battlePassPack.price}
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
          {/* Section title sits in its own bordered bar, full width of the panel and
              overlapping the grid's top edge (border style from the Friends row on the
              profile page, corner radius from Home's "See full leaderboard" button) --
              the grid itself has no border of its own. */}
          <div className="relative rounded-[20px] pt-14 pb-4 px-2">
            <div className="absolute -top-3 left-0 right-0 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Coin Packs</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {coinPacks.map((pack) => (
                <motion.div
                  key={pack.id}
                  className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`button-buy-coins-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'coins')}
                >
                  <div className="bg-accent-gold/20 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <img src={goldCoins} alt="Coins" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="text-xl font-black text-white mb-1">
                    {formatAmount(pack.coins)}
                  </div>
                  <div className="text-accent-gold font-bold text-base">
                    €{pack.price}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Gem Packs */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="relative rounded-[20px] pt-14 pb-4 px-2">
            <div className="absolute -top-3 left-0 right-0 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Gem Packs</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gemPacks.map((pack) => (
                <motion.div
                  key={pack.id}
                  className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`button-buy-gems-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'gems')}
                >
                  <div className="bg-accent-blue/20 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <img src={newGemImage} alt="Gems" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="text-xl font-black mb-1 text-[#ffffff]">
                    {formatAmount(pack.gems)}
                  </div>
                  <div className="text-accent-blue font-bold text-base">
                    €{pack.price}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Gem Offers Section */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="relative rounded-[20px] pt-14 pb-4 px-2">
            <div className="absolute -top-3 left-0 right-0 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Gem Exchange</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gemOffers.map((offer) => {
                const isDisabled = isPurchasing === offer.id || !user || (user.gems || 0) < offer.gemCost;
                return (
                  <motion.div
                    key={offer.id}
                    className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
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
                    <div className="bg-accent-gold/20 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Coin size={40} className="text-white" />
                    </div>
                    <div className="text-xl font-black mb-1 text-white">
                      {formatAmount(offer.amount)}
                    </div>
                    <div className="text-accent-blue font-bold text-base flex items-center justify-center gap-1">
                      {isPurchasing === offer.id ? (
                        <RotateCcw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Gem className="w-4 h-4" />
                          <span>{offer.gemCost}</span>
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
                ) : (
                  <Gem className="w-16 h-16" />
                )}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}

    </div>
  );
}
