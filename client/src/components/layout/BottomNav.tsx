import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Home, User } from "lucide-react";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import NotificationDot from "@/components/NotificationDot";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/shop", icon: ShoppingCart, label: "Shop" },
  { path: "/", icon: Home, label: "Home" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  // Same queries/cache as the pages themselves (Challenges, Friends, WheelOfFortune) —
  // claiming/accepting/spinning there invalidates these keys, which clears the dot here too.
  const { data: userChallenges } = useQuery<any[]>({ queryKey: ["/api/challenges/user"] });
  const { data: friendRequests } = useQuery<any[]>({ queryKey: ["/api/friends/requests"] });
  const { data: freeSpinStatus } = useQuery<{ canSpin: boolean }>({ queryKey: ["/api/daily-spin/free/can-spin"] });

  const hasClaimableChallenge = (userChallenges ?? []).some((uc: any) => uc.isCompleted && !uc.rewardClaimed);
  const hasPendingFriendRequest = (friendRequests ?? []).length > 0;
  const hasFreeSpin = freeSpinStatus?.canSpin === true;

  const notifications: Record<string, boolean> = {
    "/": hasClaimableChallenge,
    "/profile": hasPendingFriendRequest,
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
      className="fixed left-4 right-4 z-50"
      style={{ bottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
    >
      <div className="bg-ink/90 backdrop-blur-xl border border-white/10 px-3 py-2 rounded-full overflow-hidden shadow-xl shadow-black/40">
        <div className="flex items-center justify-around max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path;
            
            return (
              <button
                key={path}
                onClick={() => handleNavigate(path)}
                className={`flex flex-col items-center space-y-1 p-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "transform scale-105" 
                    : "transform scale-100 hover:scale-105 active:scale-95"
                }`}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive
                        ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                        : "text-white/30 hover:text-white/60"
                    }`}
                  />
                  <NotificationDot show={notifications[path] ?? false} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}