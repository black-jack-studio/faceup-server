import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserStore } from "@/store/user-store";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { initAdMob } from "@/lib/admob";

// Pages
import Home from "@/pages/home";
import Practice from "@/pages/practice";
import CashGames from "@/pages/cash-games";
import Counting from "@/pages/counting";
import Shop from "@/pages/shop";
import Premium from "@/pages/premium";
import BattlePassPage from "@/pages/battlepass";
import Profile from "@/pages/profile";
import LegalLinks from "@/pages/legal-links";
import PrivacyPolicy from "@/pages/legal/privacy-policy";
import TermsOfService from "@/pages/legal/terms-of-service";
import LegalNotice from "@/pages/legal/legal-notice";
import Support from "@/pages/support";
import Credits from "@/pages/credits";
import Leaderboard from "@/pages/leaderboard";
import Friends from "@/pages/friends";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import AuthCallback from "@/pages/auth/callback";
import NotFound from "@/pages/not-found";

// Play modes
import ClassicMode from "@/pages/play/classic";
import GameMode from "@/pages/play/game";
import HighStakesMode from "@/pages/play/high-stakes";
import AllInMode from "@/pages/play/all-in";

// Layout
import BottomNav from "@/components/layout/BottomNav";

// Left-to-right order of the bottom nav tabs — swiping between them slides in that same
// spatial direction (Shop -> Home -> Profile), rather than every navigation looking identical.
const TAB_ROUTES = ["/shop", "/", "/profile"];

type Side = "left" | "center" | "right";
const sideToX: Record<Side, string> = { left: "-100%", center: "0%", right: "100%" };

// Shop, Home, and Profile are all *always* mounted (stacked in the same spot via CSS grid, not
// position:absolute — grid siblings still contribute their own height to the row, so nothing
// collapses the page's natural scroll height the way absolute positioning would've). Only the
// tab actually being left and the tab actually being entered ever move; an uninvolved third tab
// just keeps sitting wherever it already was, so e.g. Profile -> Shop is a direct transition —
// Home never appears, because its stored resting side never changes when it isn't involved.
// Keeping every tab mounted (rather than the previous mount/unmount-per-route Switch) is what
// stops each page's own entrance animations from replaying every time you switch tabs — they
// only ever play once, the first time this carousel itself mounts.
function TabCarousel({ location }: { location: string }) {
  const [sides, setSides] = useState<Record<string, Side>>(() => {
    const activeIndex = TAB_ROUTES.indexOf(location);
    const initial: Record<string, Side> = {};
    TAB_ROUTES.forEach((path, i) => {
      initial[path] = i === activeIndex ? "center" : i < activeIndex ? "left" : "right";
    });
    return initial;
  });
  const prevLocationRef = useRef(location);

  useEffect(() => {
    const prevLocation = prevLocationRef.current;
    if (prevLocation === location) return;
    const prevIndex = TAB_ROUTES.indexOf(prevLocation);
    const newIndex = TAB_ROUTES.indexOf(location);
    setSides((prev) => {
      const next = { ...prev, [location]: "center" as Side };
      if (prevIndex !== -1) {
        next[prevLocation] = newIndex > prevIndex ? "left" : "right";
      }
      return next;
    });
    prevLocationRef.current = location;
  }, [location, prevLocationRef]);

  return (
    <div style={{ display: "grid" }}>
      {[
        { path: "/shop", Component: Shop },
        { path: "/", Component: Home },
        { path: "/profile", Component: Profile },
      ].map(({ path, Component }) => (
        <motion.div
          key={path}
          style={{ gridArea: "1 / 1", width: "100%" }}
          animate={{ x: sideToX[sides[path]] }}
          transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
        >
          <div className="pb-nav-safe"><Component /></div>
        </motion.div>
      ))}
    </div>
  );
}

function Router() {
  const user = useUserStore((state) => state.user);
  const [location] = useLocation();

  // Scroll to top on route changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <Switch>
        <Route path="/register" component={Register} />
        <Route path="/login" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/legal/privacy-policy" component={PrivacyPolicy} />
        <Route path="/legal/terms-of-service" component={TermsOfService} />
        <Route path="/legal/legal-notice" component={LegalNotice} />
        <Route path="/support" component={Support} />
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  const isTabRoute = TAB_ROUTES.includes(location);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#000000' }}>
      {isTabRoute ? (
        <TabCarousel location={location} />
      ) : (
        <Switch>
          <Route path="/practice">
            <div className="pb-nav-safe"><Practice /></div>
          </Route>
          <Route path="/cash-games">
            <div className="pb-nav-safe"><CashGames /></div>
          </Route>
          <Route path="/counting">
            <div className="pb-nav-safe"><Counting /></div>
          </Route>
          <Route path="/premium">
            <Premium />
          </Route>
          <Route path="/battlepass">
            <BattlePassPage />
          </Route>
          <Route path="/friends">
            <div className="pb-nav-safe"><Friends /></div>
          </Route>
          <Route path="/legal-links">
            <div className="pb-nav-safe"><LegalLinks /></div>
          </Route>
          <Route path="/legal/privacy-policy">
            <div className="pb-nav-safe"><PrivacyPolicy /></div>
          </Route>
          <Route path="/legal/terms-of-service">
            <div className="pb-nav-safe"><TermsOfService /></div>
          </Route>
          <Route path="/legal/legal-notice">
            <div className="pb-nav-safe"><LegalNotice /></div>
          </Route>
          <Route path="/support">
            <div className="pb-nav-safe"><Support /></div>
          </Route>
          <Route path="/credits">
            <div className="pb-nav-safe"><Credits /></div>
          </Route>
          <Route path="/leaderboard">
            <div className="pb-nav-safe"><Leaderboard /></div>
          </Route>
          <Route path="/play/classic" component={ClassicMode} />
          <Route path="/play/game" component={GameMode} />
          <Route path="/play/high-stakes" component={HighStakesMode} />
          <Route path="/play/all-in" component={AllInMode} />
          <Route component={NotFound} />
        </Switch>
      )}
      <ConditionalBottomNav />
    </div>
  );
}

function ConditionalBottomNav() {
  const [location] = useLocation();
  
  // Hide bottom nav on game pages, battlepass, and premium pages
  const hideOnPaths = ['/play', '/battlepass', '/premium'];
  const shouldHide = hideOnPaths.some(path => location.startsWith(path));
  
  return !shouldHide ? <BottomNav /> : null;
}

function App() {
  const initializeAuth = useUserStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
    initAdMob();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
