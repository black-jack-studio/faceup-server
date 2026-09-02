import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useState, useEffect, useMemo } from 'react';
import { triggerHapticTick } from "@/lib/haptics";
import { Gem, Crown } from "@/icons";
import ChestRewardReveal, {
  type ChestRewardItem,
  type ChestRewardCardBack,
  type ChestRewardAvatar,
  type ChestRewardEmote,
} from "@/components/ChestRewardReveal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { chestCostFor, type ChestTier } from "@shared/chestCatalog";
import BottomSheet from "@/components/BottomSheet";
import Premium from "@/pages/premium";
import { useOverlayVisibility } from "@/hooks/use-overlay-visibility";
import LuckyReelsMachine, {
  type SlotSymbol,
  REEL_WINDOW_HEIGHT,
  buildReelStrip,
  randomSlotSymbol,
} from "@/components/LuckyReelsMachine";
// Escalating swap-token pile art (3 -> 10 -> 20+ coins), same idea as the Coin/Gem Pack
// tier illustrations above, for the Gem Exchange's 3 swap token offers below.
import swapPileSmall from "@assets/swap_pile_small_2026-09-02.png";
import swapPileMedium from "@assets/swap_pile_medium_2026-09-02.png";
import swapPileLarge from "@assets/swap_pile_large_2026-09-02.png";

// One escalating gem-pile/container illustration per Gem Pack tier, same idea as the Coin
// Packs escalation below.
import gemPackTier1 from "@assets/gempack_tier1_2026-09-01.png";
import gemPackTier2 from "@assets/gempack_tier2_2026-09-01.png";
import gemPackTier3 from "@assets/gempack_tier3_2026-09-01.png";
import gemPackTier4 from "@assets/gempack_tier4_2026-09-01.png";
import gemPackTier5 from "@assets/gempack_tier5_2026-09-01.png";
import gemPackTier6 from "@assets/gempack_tier6_2026-09-01.png";
// One escalating coin-pile/container illustration per Coin Pack tier (smallest pile for the
// cheapest pack, up to the overflowing mine cart for the biggest) instead of the same single
// coin icon repeated six times.
import coinPackTier1 from "@assets/coinpack_tier1_2026-09-01.png";
import coinPackTier2 from "@assets/coinpack_tier2_2026-09-01.png";
import coinPackTier3 from "@assets/coinpack_tier3_2026-09-01.png";
import coinPackTier4 from "@assets/coinpack_tier4_2026-09-01.png";
import coinPackTier5 from "@assets/coinpack_tier5_2026-09-01.png";
import coinPackTier6 from "@assets/coinpack_tier6_2026-09-01.png";
// Shop chest tiles now use the same 3 chest tiers as the Battle Pass (gold/purple/crown) and
// the matching art, since gold/purple/crown pay out identically whether bought here or earned
// from a Battle Pass tier — see shared/battlePassChests.ts.
import chestGoldImage from "@assets/battlepass_chests/chest_gold_1787823960.png";
import chestPurpleImage from "@assets/battlepass_chests/chest_purple_1787823960.png";
import chestCrownImage from "@assets/battlepass_chests/chest_crown_1787823960.png";
import { formatFullNumber } from "@/lib/formatUtils";

const CHEST_IMAGES: Record<ChestTier, string> = {
  gold: chestGoldImage,
  purple: chestPurpleImage,
  crown: chestCrownImage,
};

// Display order: cheapest -> priciest (gold 100 gems -> purple 250 -> crown 600, see
// shared/chestCatalog.ts).
const CHEST_DISPLAY_ORDER: ChestTier[] = ['gold', 'purple', 'crown'];

// Casino-themed player-facing names, cheapest -> priciest, same idea as before ("Jackpot"
// reads as the big-ticket one).
const CHEST_DISPLAY_NAMES: Record<ChestTier, string> = {
  gold: 'Lucky',
  purple: 'Fortune',
  crown: 'Jackpot',
};

// Coin Packs' id -> tier illustration (see coinPacks below; ids are 1-6, smallest pack first).
const COIN_PACK_IMAGES: Record<number, string> = {
  1: coinPackTier1,
  2: coinPackTier2,
  3: coinPackTier3,
  4: coinPackTier4,
  5: coinPackTier5,
  6: coinPackTier6,
};

// Gem Packs' id -> tier illustration (see gemPacks below; ids are 1-6, smallest pack first).
const GEM_PACK_IMAGES: Record<number, string> = {
  1: gemPackTier1,
  2: gemPackTier2,
  3: gemPackTier3,
  4: gemPackTier4,
  5: gemPackTier5,
  6: gemPackTier6,
};

// Gem Exchange's coin offers reuse the matching Coin Pack tier's own illustration (smallest
// coin offer -> tier 1's pile, and so on) instead of the generic Coin icon, so the same coin
// amount reads with the same art wherever it's sold.
const GEM_EXCHANGE_COIN_IMAGE: Record<string, string> = {
  'coins-5k': COIN_PACK_IMAGES[1],
  'coins-15k': COIN_PACK_IMAGES[2],
  'coins-3000': COIN_PACK_IMAGES[3],
};

// Same idea for the 3 swap token offers -- a bigger pile of coins for the bigger offer,
// instead of the same single SwapCoin icon repeated three times.
const GEM_EXCHANGE_SWAP_IMAGE: Record<string, string> = {
  'swap-3': swapPileSmall,
  'swap-6': swapPileMedium,
  'swap-12': swapPileLarge,
};

// The header's Lucky Reels preview renders the real LuckyReelsMachine at this reference width,
// then shrinks the whole thing with a CSS transform down to MINI_TARGET_HEIGHT tall -- every
// internal measurement (reel item size, bezel padding, divider width, ...) scales together,
// instead of an independently-tuned mini version that could drift out of sync visually with
// the real one on the Lucky Reels page.
const LUCKY_REELS_MINI_REFERENCE_WIDTH = 320;
const LUCKY_REELS_MINI_TARGET_HEIGHT = 44;
const LUCKY_REELS_MINI_BEZEL_PADDING = 14; // p-3.5 in LuckyReelsMachine, top+bottom
const LUCKY_REELS_MINI_NATURAL_HEIGHT = LUCKY_REELS_MINI_BEZEL_PADDING * 2 + REEL_WINDOW_HEIGHT;
const LUCKY_REELS_MINI_SCALE = LUCKY_REELS_MINI_TARGET_HEIGHT / LUCKY_REELS_MINI_NATURAL_HEIGHT;
const LUCKY_REELS_MINI_TARGET_WIDTH = LUCKY_REELS_MINI_REFERENCE_WIDTH * LUCKY_REELS_MINI_SCALE;

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

  // Purely decorative preview of the real Lucky Reels machine (see LuckyReelsMachine.tsx) --
  // no server call, no real reward, just a one-shot spin that plays once when the Shop first
  // mounts, then rests on whatever it landed on. spinId 0 would render idly with no animation
  // at all, so this starts already spinning instead of waiting on an effect to kick it off a
  // frame later.
  const [luckyReelsSpinId] = useState(1);
  const [luckyReelsStrips] = useState<[SlotSymbol[], SlotSymbol[], SlotSymbol[]]>(() => {
    const target = randomSlotSymbol();
    return [buildReelStrip(target), buildReelStrip(target), buildReelStrip(target)];
  });
  const [luckyReelsIdleSymbols] = useState<[SlotSymbol, SlotSymbol, SlotSymbol][]>(() =>
    [0, 1, 2].map(() => [randomSlotSymbol(), randomSlotSymbol(), randomSlotSymbol()])
  );

  // Same query/logic as battlepass.tsx's own "Unlock premium rewards" button, so the
  // button here hides for users who are already Premium exactly the same way.
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/status'],
  });
  const isUserPremium = useMemo(() =>
    (subscriptionData as any)?.isActive || user?.membershipType === 'premium' || false,
    [subscriptionData, user?.membershipType]
  );

  const [, setShowPaymentModal] = useState(false);
  const [, setSelectedPack] = useState<any>(null);

  // Check if we should show Battle Pass section
  const [showBattlePassSection, setShowBattlePassSection] = useState(false);

  // Premium page shown as a slide-up overlay (same pattern as battlepass.tsx's own
  // "Unlock premium rewards" button) rather than a route change.
  const [showPremium, setShowPremium] = useState(false);
  const onPremiumExitComplete = useOverlayVisibility(showPremium);

  // Gem purchase loading states
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null);

  // Chest opening state
  const [openingChestTier, setOpeningChestTier] = useState<ChestTier | null>(null);
  const [chestReward, setChestReward] = useState<
    | {
        tier: ChestTier;
        rewards: ChestRewardItem[];
        cardBack: ChestRewardCardBack | null;
        avatar: ChestRewardAvatar | null;
        emote: ChestRewardEmote | null;
      }
    | null
  >(null);
  const [showChestReward, setShowChestReward] = useState(false);
  // Unlike every other full-screen overlay in the app, chest opening deliberately does NOT
  // register with the shared overlay-visibility system (see hooks/use-overlay-visibility.ts) --
  // the bottom nav bar and the shop's own background stay mounted and visible underneath the
  // whole confirm -> suspense -> reveal flow instead of being unmounted, per Anatole (2026-09-02).

  // Purchase confirmation sheets, same pattern as avatars.tsx's "Unlock {name}?" sheet -- a
  // single tap used to spend gems immediately on both Chests and Gem Exchange, which was easy
  // to trigger by accident. Only one of these is ever open at a time.
  const [confirmChestTier, setConfirmChestTier] = useState<ChestTier | null>(null);
  const [confirmOffer, setConfirmOffer] = useState<any | null>(null);

  // Insufficient-gems check happens up front, same as avatars.tsx's requestPurchase -- the
  // confirm sheet only ever opens for something the player can actually afford.
  const requestOpenChest = (tier: ChestTier) => {
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
    setConfirmChestTier(tier);
  };

  const requestGemOfferPurchase = (offer: any) => {
    if (!user || isPurchasing) return;
    if ((user.gems || 0) < offer.gemCost) {
      toast({
        title: "Insufficient gems",
        description: `You need ${offer.gemCost} gems for this purchase.`,
        variant: "destructive",
      });
      return;
    }
    setConfirmOffer(offer);
  };

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

  // Economy pass (2026-09-02): same USD price ladder for Coin Packs and Gem Packs
  // (0.99/2.99/9.99/19.99/49.99/99.99) so the two currencies feel "raccord" at every tier
  // instead of drifting apart like the old ladders did. Value-per-$ improves at every step,
  // and improves more sharply at the top than at the bottom so the biggest packs feel like a
  // real deal and average basket size isn't capped low. id 2 ($2.99) is the "popular" tier
  // for both. Numbers confirmed with Anatole after a few rounds (round figures, no big gap
  // between consecutive tiers).
  const coinPacks = [
    { id: 1, coins: 1000, price: 0.99, popular: false },
    { id: 2, coins: 4000, price: 2.99, popular: true },
    { id: 3, coins: 18000, price: 9.99, popular: false },
    { id: 4, coins: 40000, price: 19.99, popular: false },
    { id: 5, coins: 120000, price: 49.99, popular: false },
    { id: 6, coins: 300000, price: 99.99, popular: false },
  ];

  // Gems stay the rare/premium currency: amounts are calibrated against avatar costs in
  // shared/avatarCatalog.ts (Animals 150, Fantasy 500, Mystery 600, Legendary 800 gems) so
  // buying just enough gems for one costs roughly $3 / $8 / $9 / $10 respectively -- expensive
  // enough to matter, never a windfall from a small pack.
  const gemPacks = [
    { id: 1, gems: 50, price: 0.99, popular: false },
    { id: 2, gems: 200, price: 2.99, popular: true },
    { id: 3, gems: 900, price: 9.99, popular: false },
    { id: 4, gems: 2000, price: 19.99, popular: false },
    { id: 5, gems: 6000, price: 49.99, popular: false },
    { id: 6, gems: 15000, price: 99.99, popular: false },
  ];

  // Gem shop offers (buy with gems). id values are the server's GEM_OFFERS keys — keep
  // them as-is even though they no longer match the amount (e.g. 'coins-5k' now gives
  // 750, not 5000); only amount/label describe what the offer actually gives.
  const gemOffers = [
    { id: 'coins-5k', type: 'coins', amount: 750, gemCost: 50, label: '750 Coins', popular: false },
    { id: 'coins-15k', type: 'coins', amount: 1500, gemCost: 100, label: '1.5K Coins', popular: false },
    // Same 15 coins-per-gem rate as the two offers above, one tier up.
    { id: 'coins-3000', type: 'coins', amount: 3000, gemCost: 200, label: '3K Coins', popular: false },
    // Swap tokens (Classic solo's discard-and-redeal resource) bought with gems. Rates
    // confirmed with Anatole (2026-09-02): 5/4/3.75 gems per token, cheaper with volume.
    { id: 'swap-3', type: 'swapTokens', amount: 10, gemCost: 50, label: '10 Swap Tokens', popular: false },
    { id: 'swap-6', type: 'swapTokens', amount: 25, gemCost: 100, label: '25 Swap Tokens', popular: false },
    { id: 'swap-12', type: 'swapTokens', amount: 40, gemCost: 150, label: '40 Swap Tokens', popular: false },
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

      // Update coins/swap tokens optimistically
      if (offer.type === 'coins') {
        const newCoins = (user.coins || 0) + offer.amount;
        updateUser({ coins: newCoins });
      } else if (offer.type === 'swapTokens') {
        const newSwapTokens = (user.swapTokens || 0) + offer.amount;
        updateUser({ swapTokens: newSwapTokens });
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
          ...(offer.type === 'swapTokens' ? { swapTokens: user.swapTokens || 0 } : {}),
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

  const confirmGemOfferPurchase = () => {
    if (!confirmOffer) return;
    const offer = confirmOffer;
    setConfirmOffer(null);
    handleGemOfferPurchase(offer);
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
      // Response shape: { chestTier, rewards: [{kind, amount}], cardBack, avatar, emote }.
      const response = await apiRequest("POST", "/api/chests/open", { tier });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to open chest");
      }

      const reward = data.reward as {
        rewards: ChestRewardItem[];
        cardBack: ChestRewardCardBack | null;
        avatar: ChestRewardAvatar | null;
        emote: ChestRewardEmote | null;
      };

      if (reward.cardBack || reward.avatar || reward.emote) {
        // Gems were spent, nothing else changes locally — the item itself lives server-side
        // until the relevant collection query is refetched.
        updateUser({ gems: (user.gems || 0) - cost });
        if (reward.cardBack) queryClient.invalidateQueries({ queryKey: ["/api/user/card-backs"] });
        if (reward.avatar) queryClient.invalidateQueries({ queryKey: ["/api/user/owned-avatars"] });
        if (reward.emote) queryClient.invalidateQueries({ queryKey: ["/api/user/emotes"] });
      } else {
        const updates: any = { gems: (user.gems || 0) - cost };
        for (const r of reward.rewards) {
          if (r.kind === 'coins') updates.coins = (user.coins || 0) + r.amount;
          if (r.kind === 'gems') updates.gems = updates.gems + r.amount;
          if (r.kind === 'swapTokens') updates.swapTokens = (user.swapTokens || 0) + r.amount;
        }
        updateUser(updates);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });

      setChestReward({ tier, rewards: reward.rewards, cardBack: reward.cardBack, avatar: reward.avatar, emote: reward.emote });
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

  const confirmOpenChest = () => {
    if (!confirmChestTier) return;
    const tier = confirmChestTier;
    setConfirmChestTier(null);
    handleOpenChest(tier);
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

          {/* Lucky Reels preview — the actual LuckyReelsMachine (see that file), rendered at a
              fixed reference width then shrunk down as a whole with a CSS transform so it's
              exactly the same design as the full-size page, just smaller. Plays its one-shot
              spin animation immediately (luckyReelsSpinId starts at 1, not 0) every time the
              Shop mounts, then rests on whatever it landed on. Navigates to the real page. */}
          <motion.div
            className="relative cursor-pointer overflow-hidden"
            style={{ width: LUCKY_REELS_MINI_TARGET_WIDTH, height: LUCKY_REELS_MINI_TARGET_HEIGHT }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/wheel-of-fortune")}
            data-testid="button-wheel-fortune"
          >
            <div
              style={{
                width: LUCKY_REELS_MINI_REFERENCE_WIDTH,
                transform: `scale(${LUCKY_REELS_MINI_SCALE})`,
                transformOrigin: "top left",
              }}
            >
              <LuckyReelsMachine
                spinId={luckyReelsSpinId}
                reelStrips={luckyReelsStrips}
                idleSymbolsPerReel={luckyReelsIdleSymbols}
                width={LUCKY_REELS_MINI_REFERENCE_WIDTH}
              />
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
        {/* Premium button: plain #1c1c1e card (same grey as every other card on this page),
            just the caption -- the reward icon row above it (coins/gem/swap/card back/avatar/
            emote) got dropped per Anatole, back to a single flat button. Opens the Premium
            page; hidden for users who are already Premium. */}
        {!isUserPremium && (
          <motion.button
            onClick={() => {
              triggerHapticTick();
              setShowPremium(true);
            }}
            className="w-full rounded-[24px] bg-[#1c1c1e] py-4 px-4 mb-8"
            style={{ touchAction: "manipulation" }}
            whileTap={{ scale: 0.98 }}
            data-testid="button-unlock-premium-rewards"
          >
            <p className="text-white font-bold text-base text-center">
              Unlock daily rewards and perks.
            </p>
          </motion.button>
        )}

        {/* Chests — bronze/silver spend gems for a random coins/gems reward; gold spends
            gems for a random card back instead (uniform odds, no rarity). */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="relative rounded-[20px] pt-14 pb-4 px-2">
            <div className="absolute -top-3 left-2 right-2 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
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
                    whileTap={!isBusy ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.2 }}
                    data-testid={`button-open-chest-${tier}`}
                    onClick={() => !isBusy && requestOpenChest(tier)}
                    style={{ cursor: isBusy ? 'not-allowed' : 'pointer' }}
                  >
                    <motion.img
                      src={CHEST_IMAGES[tier]}
                      alt={`${CHEST_DISPLAY_NAMES[tier]} chest`}
                      className="w-20 h-20 object-contain mx-auto mb-2"
                      animate={isOpening ? { rotate: [-4, 4, -4, 4, 0], scale: [1, 1.08, 1] } : {}}
                      transition={isOpening ? { duration: 0.6, repeat: Infinity } : {}}
                    />
                    <div className="text-white font-bold text-xl mb-1">{CHEST_DISPLAY_NAMES[tier]}</div>
                    <div className="flex items-center justify-center gap-0.5 text-accent-blue font-bold text-base">
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
            <div className="absolute -top-3 left-2 right-2 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Coin Packs</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {coinPacks.map((pack) => (
                <motion.div
                  key={pack.id}
                  className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`button-buy-coins-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'coins')}
                >
                  <div className="bg-accent-gold/20 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <img src={COIN_PACK_IMAGES[pack.id]} alt="Coins" className="w-20 h-20 object-contain" />
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
            <div className="absolute -top-3 left-2 right-2 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Gem Packs</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gemPacks.map((pack) => (
                <motion.div
                  key={pack.id}
                  className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  data-testid={`button-buy-gems-${pack.id}`}
                  onClick={() => handleSelectPack(pack, 'gems')}
                >
                  <div className="bg-accent-blue/20 w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <img src={GEM_PACK_IMAGES[pack.id]} alt="Gems" className="w-20 h-20 object-contain" />
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

        {/* Gem Offers Section -- last section on the page, so no mb-8 here: the container's
            own pb-6 plus the page's pb-nav-safe (5rem + safe area) already leave clearance
            above the bottom nav on their own, and stacking mb-8 on top of both left a slab of
            dead black space between these tiles and the nav bar. */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="relative rounded-[20px] pt-14 pb-4 px-2">
            <div className="absolute -top-3 left-2 right-2 bg-black border-2 border-white/15 rounded-xl py-4 text-center">
              <h2 className="text-sm font-medium text-white/90 whitespace-nowrap">Gem Exchange</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {gemOffers.map((offer) => {
                const isDisabled = isPurchasing === offer.id || !user || (user.gems || 0) < offer.gemCost;
                return (
                  <motion.div
                    key={offer.id}
                    className="bg-[#1c1c1e] rounded-[14px] p-3 text-center relative overflow-hidden cursor-pointer"
                    whileTap={!isDisabled ? { scale: 0.98 } : {}}
                    transition={{ duration: 0.2 }}
                    data-testid={`button-buy-${offer.id}`}
                    onClick={() => !isDisabled && requestGemOfferPurchase(offer)}
                    style={{
                      opacity: isDisabled ? 0.5 : 1,
                      cursor: isDisabled ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <div className={`${offer.type === 'swapTokens' ? 'bg-accent-purple/20' : 'bg-accent-gold/20'} w-20 h-20 rounded-xl flex items-center justify-center mx-auto mb-2`}>
                      {offer.type === 'swapTokens' ? (
                        <img src={GEM_EXCHANGE_SWAP_IMAGE[offer.id]} alt="Swap Tokens" className="w-20 h-20 object-contain" />
                      ) : (
                        <img src={GEM_EXCHANGE_COIN_IMAGE[offer.id]} alt="Coins" className="w-20 h-20 object-contain" />
                      )}
                    </div>
                    <div className="text-xl font-black mb-1 text-white">
                      {formatAmount(offer.amount)}
                    </div>
                    <div className="text-accent-blue font-bold text-base flex items-center justify-center gap-0.5">
                      {isPurchasing === offer.id ? (
                        <RotateCcw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Gem className="w-5 h-5" />
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

      {/* Chest purchase confirmation -- same bottom sheet as avatars.tsx's "Unlock {name}?"
          sheet, since a single tap opening a chest and spending gems immediately was easy to
          trigger by accident. */}
      <BottomSheet
        open={!!confirmChestTier}
        onClose={() => setConfirmChestTier(null)}
        height="auto"
        contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
      >
        {confirmChestTier && (
          <>
            <img
              src={CHEST_IMAGES[confirmChestTier]}
              alt={CHEST_DISPLAY_NAMES[confirmChestTier]}
              className="w-24 h-24 object-contain rounded-2xl"
            />
            <h2 className="mt-3 mb-6 text-xl font-bold text-white">
              Open {CHEST_DISPLAY_NAMES[confirmChestTier]} chest?
            </h2>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={confirmOpenChest}
                disabled={openingChestTier !== null}
                className="w-full h-11 rounded-[18px] bg-white hover:bg-gray-100 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                data-testid="button-confirm-open-chest"
              >
                {openingChestTier === confirmChestTier ? (
                  "Opening…"
                ) : (
                  <>
                    <Gem className="w-4 h-4" />
                    <span>{chestCostFor(confirmChestTier)}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setConfirmChestTier(null)}
                disabled={openingChestTier !== null}
                className="w-full h-11 rounded-[18px] bg-[#232227]/40 hover:bg-[#232227]/60 text-white font-medium disabled:opacity-50"
                data-testid="button-cancel-open-chest"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* Gem Exchange purchase confirmation -- same sheet, same reasoning. */}
      <BottomSheet
        open={!!confirmOffer}
        onClose={() => setConfirmOffer(null)}
        height="auto"
        contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
      >
        {confirmOffer && (
          <>
            {confirmOffer.type === 'swapTokens' ? (
              <img
                src={GEM_EXCHANGE_SWAP_IMAGE[confirmOffer.id]}
                alt={confirmOffer.label}
                className="w-24 h-24 object-contain rounded-2xl"
              />
            ) : (
              <img
                src={GEM_EXCHANGE_COIN_IMAGE[confirmOffer.id]}
                alt={confirmOffer.label}
                className="w-24 h-24 object-contain rounded-2xl"
              />
            )}
            <h2 className="mt-3 mb-6 text-xl font-bold text-white">Buy {confirmOffer.label}?</h2>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={confirmGemOfferPurchase}
                disabled={isPurchasing !== null}
                className="w-full h-11 rounded-[18px] bg-white hover:bg-gray-100 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                data-testid="button-confirm-buy-offer"
              >
                {isPurchasing === confirmOffer.id ? (
                  "Buying…"
                ) : (
                  <>
                    <Gem className="w-4 h-4" />
                    <span>{confirmOffer.gemCost}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setConfirmOffer(null)}
                disabled={isPurchasing !== null}
                className="w-full h-11 rounded-[18px] bg-[#232227]/40 hover:bg-[#232227]/60 text-white font-medium disabled:opacity-50"
                data-testid="button-cancel-buy-offer"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </BottomSheet>
      {/* Chest Reward Popup — same suspense-then-reveal component the Battle Pass uses, so a
          chest opened here plays out identically to one earned from a tier. No
          onExitComplete/overlay registration here on purpose: the nav bar stays visible under
          this the whole time (see the state declarations above). */}
      <AnimatePresence>
      {showChestReward && chestReward && (
        <ChestRewardReveal
          chestImage={CHEST_IMAGES[chestReward.tier]}
          rewards={chestReward.rewards}
          cardBack={chestReward.cardBack}
          avatar={chestReward.avatar}
          emote={chestReward.emote}
          onDismiss={() => setShowChestReward(false)}
        />
      )}
      </AnimatePresence>

      {/* Same slide-up/down sheet transition as battlepass.tsx's own Premium overlay. Also
          needs its own useOverlayVisibility registration (battlepass.tsx's copy doesn't --
          it relies on Battle Pass's own registration in home.tsx, since Premium there is
          nested inside that already-registered overlay). Opened directly from Shop, this one
          has no such parent, so without this the bottom nav stayed mounted underneath it. */}
      <AnimatePresence onExitComplete={onPremiumExitComplete}>
        {showPremium && (
          <motion.div
            className="fixed-safe-screen z-[80]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <Premium onClose={() => setShowPremium(false)} skipEntranceAnimation />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
