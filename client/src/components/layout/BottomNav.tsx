import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
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

// The cart artwork's thin outline strokes and open wheel gaps read visually smaller than
// the other two icons' solid shapes at the same bounding box, so it gets a slight scale
// bump on top of the shared sizing class to match their weight.
function ShopOutlineIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-shop-outline.png" alt="" className={`${className} object-contain scale-125`} />;
}

function ShopFilledIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-shop-filled.png" alt="" className={`${className} object-contain scale-125`} />;
}

// Same treatment as the cart artwork above — the person outline's stroke reads visually
// smaller than Home's solid shape at the same bounding box, so it gets the same scale bump.
function ProfileOutlineIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-profile-outline.png" alt="" className={`${className} object-contain scale-125`} />;
}

function ProfileFilledIcon({ className }: { className?: string }) {
  return <img src="/icons/nav-profile-filled.png" alt="" className={`${className} object-contain scale-125`} />;
}

const navItems: NavItem[] = [
  { path: "/shop", outlineIcon: ShopOutlineIcon, filledIcon: ShopFilledIcon, label: "Shop" },
  { path: "/", outlineIcon: HomeOutlineIcon, filledIcon: HomeFilledIcon, label: "Home" },
  { path: "/profile", outlineIcon: ProfileOutlineIcon, filledIcon: ProfileFilledIcon, label: "Profile" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  const user = useUserStore((state) => state.user);

  // Same queries/cache as the pages themselves (Challenges, Friends, RankBadge,
  // WheelOfFortune) — claiming/accepting/spinning there invalidates these keys, which
  // clears the dot here too.
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/user"] });
  const { data: friendRequests } = useQuery<any[]>({ queryKey: ["/api/friends/requests"] });
  const { data: claimedRankRewards, isLoading: isLoadingClaimedRankRewards } = useQuery<{ rankKey: string }[]>({ queryKey: ["/api/ranks/claimed-rewards"] });
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean }>({ queryKey: ["/api/daily-spin/free/can-spin"] });
  const { data: claimedTiersData, isLoading: isLoadingClaimedTiers } = useQuery({ queryKey: ["/api/battlepass/claimed-tiers"] });
  const { data: streakStatus } = useQuery<{ claimableReward: unknown | null }>({ queryKey: ["/api/daily-streak"] });

  const hasClaimableChallenge = (userChallenges ?? []).some((uc: any) => uc.isCompleted && !uc.rewardClaimed);
  const hasClaimableStreak = !!streakStatus?.claimableReward;
  const hasPendingFriendRequest = (friendRequests ?? []).length > 0;
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
        // Split the home-indicator inset evenly above and below the icon row instead of
        // dumping it all below — otherwise that dead space only grows the bar underneath
        // the icons, pushing them visibly off-center within it.
        paddingTop: "calc(env(safe-area-inset-bottom) / 2)",
        paddingBottom: "calc(env(safe-area-inset-bottom) / 2)",
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
                        className={`w-5 h-5 transition-colors duration-200 ${
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