import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { IoPersonOutline, IoPerson } from "react-icons/io5";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
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

function ShopOutlineIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-shop-outline.png" alt="" className={`${className} object-contain`} />;
}

function ShopFilledIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-shop-filled.png" alt="" className={`${className} object-contain`} />;
}

const navItems: NavItem[] = [
  { path: "/shop", outlineIcon: ShopOutlineIcon, filledIcon: ShopFilledIcon, label: "Shop" },
  { path: "/", outlineIcon: HomeOutlineIcon, filledIcon: HomeFilledIcon, label: "Home" },
  { path: "/profile", outlineIcon: IoPersonOutline, filledIcon: IoPerson, label: "Profile" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  const user = useUserStore((state) => state.user);

  // Same queries/cache as the pages themselves (Challenges, Friends, RankBadge,
  // WheelOfFortune) — claiming/accepting/spinning there invalidates these keys, which
  // clears the dot here too.
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/user"] });
  const { data: friendRequests } = useQuery<any[]>({ queryKey: ["/api/friends/requests"] });
  const { data: claimedRankRewards } = useQuery<{ rankKey: string }[]>({ queryKey: ["/api/ranks/claimed-rewards"] });
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean }>({ queryKey: ["/api/daily-spin/free/can-spin"] });
  const { data: claimedTiersData, isLoading: isLoadingClaimedTiers } = useQuery({ queryKey: ["/api/battlepass/claimed-tiers"] });
  const { data: streakStatus } = useQuery<{ claimableReward: unknown | null }>({ queryKey: ["/api/daily-streak"] });

  const hasClaimableChallenge = (userChallenges ?? []).some((uc: any) => uc.isCompleted && !uc.rewardClaimed);
  const hasClaimableStreak = !!streakStatus?.claimableReward;
  const hasPendingFriendRequest = (friendRequests ?? []).length > 0;
  const seasonHandsWon = (user as any)?.seasonHandsWon || 0;
  const hasUnclaimedRankReward = RANKS.some((rank) =>
    seasonHandsWon >= rank.min &&
    (rank.gemReward ?? 0) > 0 &&
    !(claimedRankRewards ?? []).some((claimed) => claimed.rankKey === rank.key)
  );
  const hasFreeSpin = freeSpinStatus?.canSpin === true;
  // Same "just reached this level" check as the dot on Home's own XP ring (home.tsx) — gated
  // on isLoading so it doesn't flash on for every level > 1 before the real claimed-tiers data
  // arrives (claimedTiers defaults to [] while loading, which would make every level look unclaimed).
  const claimedTiers = (claimedTiersData as any)?.freeTiers || [];
  const currentLevel = (user as any)?.level ?? 1;
  const hasUnclaimedLevelChest = !isLoadingClaimedTiers && currentLevel > 1 && !claimedTiers.includes(currentLevel);

  const notifications: Record<string, boolean> = {
    "/": hasClaimableChallenge || hasUnclaimedLevelChest || hasClaimableStreak,
    "/profile": hasPendingFriendRequest || hasUnclaimedRankReward,
    "/shop": hasFreeSpin,
  };

  const handleNavigate = (path: string) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    navigate(path);
  };

  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-ink/90 backdrop-blur-xl border-t border-white/10 shadow-xl shadow-black/40"
      style={{
        // Mirrored on top purely for visual symmetry (there's no notch/home-indicator up
        // there) — without it the icons sat high, with all the safe-area space piling up
        // as empty room underneath them instead of framing them evenly.
        paddingTop: "env(safe-area-inset-bottom)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="px-3 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map(({ path, outlineIcon: OutlineIcon, filledIcon: FilledIcon, label }) => {
            const isActive = location === path;
            const Icon = isActive ? FilledIcon : OutlineIcon;

            return (
              <motion.button
                key={path}
                onClick={() => handleNavigate(path)}
                whileTap={{ scale: 0.85 }}
                className={`flex flex-col items-center space-y-1 p-2.5 rounded-xl transition-transform duration-200 ${
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
                        className={`w-7 h-7 transition-colors duration-200 ${
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