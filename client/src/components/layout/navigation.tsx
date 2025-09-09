import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import NotificationDot from "@/components/NotificationDot";

interface NavItem {
  icon: string;
  label: string;
  path: string;
  testId: string;
}

const navItems: NavItem[] = [
  { icon: "fas fa-home", label: "Home", path: "/", testId: "nav-home" },
  { icon: "fas fa-dumbbell", label: "Training", path: "/practice", testId: "nav-training" },
  { icon: "fas fa-shopping-bag", label: "Shop", path: "/shop", testId: "nav-shop" },
  { icon: "fas fa-user", label: "Profile", path: "/profile", testId: "nav-profile" },
];

export default function Navigation() {
  const [location, navigate] = useLocation();
  
  // Check if daily spin is available for shop notification
  const { data: canSpin = false } = useQuery({
    queryKey: ["/api/daily-spin/can-spin"],
  }) as { data: boolean };

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 navbar-blur z-50">
      <div className="flex items-center justify-around py-3">
        {navItems.map((item, index) => (
          <motion.button
            key={item.path}
            className={cn(
              "relative flex flex-col items-center space-y-1 px-4 py-2 transition-colors",
              isActive(item.path) 
                ? "text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => navigate(item.path)}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            data-testid={item.testId}
          >
            <div className="relative">
              <i className={cn(item.icon, "text-lg")} />
              {/* Notification dot for shop when daily spin is available */}
              {item.path === "/shop" && (
                <NotificationDot show={canSpin} />
              )}
            </div>
            <span className={cn(
              "text-xs",
              isActive(item.path) ? "font-medium" : ""
            )}>
              {item.label}
            </span>
          </motion.button>
        ))}
      </div>
    </nav>
  );
}
