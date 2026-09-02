import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { triggerHapticTick } from "@/lib/haptics";
import NotificationDot from "@/components/NotificationDot";
import { useUserStore } from "@/store/user-store";
import { RANKS } from "@shared/ranks";

interface NavItem {
  path: string;
  outlineIcon: React.ComponentType<{ className?: string }>;
  filledIcon: React.ComponentType<{ className?: string }>;
  label: string;
}

// Custom-designed house artwork (already colored — gray outline / solid white), not a
// currentColor icon font, so these just wrap <img> instead of drawing an SVG path.
function HomeOutlineIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-home-outline.png" alt="" className={`${className} object-contain`} />;
}

function HomeFilledIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-home-filled.png" alt="" className={`${className} object-contain`} />;
}

// Cropped to the bag glyph's bounding box (source art had large baked-in padding), same
// treatment as the person outline below — gets a slight scale bump to match Home's weight.
function ShopOutlineIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-shop-outline.png" alt="" className={`${className} object-contain scale-110`} />;
}

function ShopFilledIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-shop-filled.png" alt="" className={`${className} object-contain scale-110`} />;
}

// Same treatment as the cart artwork above — the person outline's stroke reads visually
// smaller than Home's solid shape at the same bounding box, so it gets the same scale bump.
function ProfileOutlineIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-profile-outline.png" alt="" className={`${className} object-contain scale-110`} />;
}

function ProfileFilledIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-profile-filled.png" alt="" className={`${className} object-contain scale-110`} />;
}

const navItems: NavItem[] = [
  { path: "/shop", outlineIcon: ShopOutlineIcon, filledIcon: ShopFilledIcon, label: "Shop" },
  { path: "/", outlineIcon: HomeOutlineIcon, filledIcon: HomeFilledIcon, label: "Home" },
  { path: "/profile", outlineIcon: ProfileOutlineIcon, filledIcon: ProfileFilledIcon, label: "Profile" },
];

export default function BottomNav({ hidden = false }: { hidden?: boolean }) {
  const [location, navigate] = useLocation();

  const user = useUserStore((state) => state.user);

  // Same queries/cache as the pages themselves (Challenges, Friends, RankBadge,
  // WheelOfFortune) — claiming/accepting/spinning there invalidates these keys, which
  // clears the dot here too.
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/user"] });
  // Polled (not just left to other mounted queries on the same key to refresh it) since
  // BottomNav is up the whole time — an incoming request otherwise only surfaced here once
  // something else (e.g. AddFriendModal) happened to be open and refetch this key, which in
  // practice meant a full app reload to see the dot. Same 15s cadence as that query.
  const { data: friendRequestsData } = useQuery<{ requests: any[] }>({ queryKey: ["/api/friends/requests"], refetchInterval: 15000 });
  const { data: claimedRankRewards, isLoading: isLoadingClaimedRankRewards } = useQuery<{ rankKey: string }[]>({ queryKey: ["/api/ranks/claimed-rewards"] });
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean }>({ queryKey: ["/api/daily-spin/free/can-spin"] });
  const { data: claimedTiersData, isLoading: isLoadingClaimedTiers } = useQuery({ queryKey: ["/api/battlepass/claimed-tiers"] });
  // Needed to know whether premium chests count toward the notification too — same query
  // battlepass.tsx itself uses to gate premium claims.
  const { data: subscriptionData } = useQuery({ queryKey: ["/api/subscription/status"] });
  const { data: streakStatus } = useQuery<{ claimableReward: unknown | null }>({ queryKey: ["/api/daily-streak"] });
  // Same key HomeLeaderboard/leaderboard.tsx read and WeeklyRewardPopup's claim mutation
  // invalidates on success, so this dot clears in lockstep with theirs automatically.
  const { data: pendingLeaderboardReward } = useQuery<{ rank: number; gemsAwarded: number } | null>({
    queryKey: ["/api/leaderboard/weekly-xp/pending-reward"],
  });

  const hasClaimableChallenge = (userChallenges ?? []).some((uc: any) => uc.isCompleted && !uc.rewardClaimed);
  const hasClaimableStreak = !!streakStatus?.claimableReward;
  // The endpoint returns { requests: [...] }, not a bare array — this was reading .length
  // off the wrapper object itself (always undefined), so the dot never lit up at all,
  // reload or not.
  const hasPendingFriendRequest = (friendRequestsData?.requests ?? []).length > 0;
  const seasonHandsWon = (user as any)?.seasonHandsWon || 0;
  // Gated on !isLoading, same as hasUnclaimedLevelChest below: claimedRankRewards defaults to
  // [] while its query is in flight, which made every rank the user qualifies for look
  // unclaimed for a frame on cold start, flashing the dot on before the real data arrived.
  const hasUnclaimedRankReward = !isLoadingClaimedRankRewards && RANKS.some((rank) =>
    seasonHandsWon >= rank.min &&
    (rank.gemReward ?? 0) > 0 &&
    !(claimedRankRewards ?? []).some((claimed) => claimed.rankKey === rank.key)
  );
  const hasFreeSpin = freeSpinStatus?.canSpin === true;
  // Same check as the dot on Home's own XP ring (home.tsx): true as long as ANY tier the
  // player has already reached still has an unclaimed chest — free or premium — not just the
  // current level's own tier. Levels can jump by more than one at a time, so catching up on
  // just the current tier used to clear the dot while older unopened chests sat below it. Free
  // rewards only go up to tier 30, premium up to tier 50 (see BATTLE_PASS_TIERS in
  // battlepass.tsx); premium tiers only count for premium subscribers. Gated on isLoading so it
  // doesn't flash on for every level > 0 before the real claimed-tiers data arrives (claimed
  // tiers default to [] while loading, which would make every level look unclaimed).
  const claimedFreeTiers = (claimedTiersData as any)?.freeTiers || [];
  const claimedPremiumTiers = (claimedTiersData as any)?.premiumTiers || [];
  const isUserPremium = (subscriptionData as any)?.isActive || (user as any)?.membershipType === 'premium' || false;
  const currentLevel = (user as any)?.level ?? 0;
  const maxClaimableFreeTier = Math.min(currentLevel, 30);
  const hasUnclaimedFreeTier = Array.from({ length: maxClaimableFreeTier }, (_, i) => i + 1)
    .some((tier) => !claimedFreeTiers.includes(tier));
  const maxClaimablePremiumTier = Math.min(currentLevel, 50);
  const hasUnclaimedPremiumTier = isUserPremium && Array.from({ length: maxClaimablePremiumTier }, (_, i) => i + 1)
    .some((tier) => !claimedPremiumTiers.includes(tier));
  const hasUnclaimedLevelChest = !isLoadingClaimedTiers && currentLevel > 0 &&
    (hasUnclaimedFreeTier || hasUnclaimedPremiumTier);

  const notifications: Record<string, boolean> = {
    "/": hasClaimableChallenge || hasUnclaimedLevelChest || hasClaimableStreak || !!pendingLeaderboardReward,
    "/profile": hasPendingFriendRequest || hasUnclaimedRankReward,
    "/shop": hasFreeSpin,
  };

  const handleNavigate = (path: string) => {
    triggerHapticTick();
    navigate(path);
  };

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-ink/95 backdrop-blur-xl border-t border-white/5 shadow-xl shadow-black/40"
      style={{
        // Biased toward the bottom (not an even split) — an even split still reads as too
        // low on iPhones with a home indicator, since that whole inset sits below the icons
        // as dead space either way. Keeping the same total keeps the bar's overall height
        // (and its top edge) unchanged; shifting more of it below the icons is what moves
        // the icon row itself further up.
        paddingTop: "calc(env(safe-area-inset-bottom) * 0.25)",
        paddingBottom: "calc(env(safe-area-inset-bottom) * 0.75)",
        // Hidden via visibility rather than unmounted by the caller while a local sheet/modal
        // covers the base tabs -- see ConditionalBottomNav in App.tsx. Stronger than relying on
        // z-index stacking (that approach previously let the bar bleed through on-device) and,
        // unlike unmounting, never destroys/recreates this element, so there's no fresh paint
        // for the reappearance to read as a "pop".
        visibility: hidden ? "hidden" : "visible",
        pointerEvents: hidden ? "none" : "auto",
      }}
    >
      <div className="px-3 py-1.5">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map(({ path, outlineIcon: OutlineIcon, filledIcon: FilledIcon, label }) => {
            const isActive = location === path;
            const Icon = isActive ? FilledIcon : OutlineIcon;

            return (
              <motion.button
                key={path}
                onClick={() => handleNavigate(path)}
                whileTap={{ scale: 0.85 }}
                className={`flex flex-col items-center space-y-1 p-1.5 rounded-xl transition-transform duration-200 ${
                  isActive ? "scale-105" : "scale-100 hover:scale-105"
                }`}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <div className="relative">
                  {/* The pop on tap is what sells the "pressed" feeling — a plain color
                      crossfade reads as static since nothing in the icon itself actually moves. */}
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                      key={isActive ? "active" : "inactive"}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    >
                      <Icon
                        className={`w-6 h-6 transition-colors duration-200 ${
                          isActive ? "text-white" : "text-white/30 hover:text-white/60"
                        }`}
                      />
                    </motion.div>
                  </AnimatePresence>
                  <NotificationDot show={notifications[path] ?? false} />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}