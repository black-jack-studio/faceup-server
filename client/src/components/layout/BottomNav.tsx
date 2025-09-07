import { useLocation } from "wouter";
import { Cart, Home, User } from "@/icons";

interface NavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/shop", icon: Cart, label: "Shop" },
  { path: "/", icon: Home, label: "Home" },
  { path: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-ink/90 backdrop-blur-xl border-t border-white/10 px-3 pt-1 pb-4">
        <div className="flex items-center justify-center gap-8 max-w-md mx-auto">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path;
            
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center space-y-1 p-1 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? "transform scale-105" 
                    : "transform scale-100 hover:scale-105 active:scale-95"
                }`}
                data-testid={`nav-${label.toLowerCase()}`}
              >
                <div className={`p-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-accent-green/20 halo"
                    : "bg-white/5 hover:bg-white/10"
                }`}>
                  <Icon 
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive 
                        ? "text-accent-green" 
                        : "text-white/70 hover:text-white"
                    }`} 
                  />
                </div>
                <span className={`text-xs font-medium transition-colors duration-200 ${
                  isActive 
                    ? "text-accent-green" 
                    : "text-white/50"
                }`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}