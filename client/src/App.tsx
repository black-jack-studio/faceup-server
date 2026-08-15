import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserStore } from "@/store/user-store";
import { useEffect } from "react";
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

  const currentTabIndex = TAB_ROUTES.indexOf(location);
  const isTabRoute = currentTabIndex !== -1;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#000000' }}>
      {isTabRoute ? (
        // A real carousel, not a mount/unmount transition: Shop, Home, and Profile are all
        // *always* mounted side by side (each exactly one viewport wide, in that left-to-right
        // order), and switching tabs just pans this row to the matching panel. That's what
        // makes Shop <-> Profile visibly cross Home's panel along the way, and it's also what
        // stops each page's own entrance animations from replaying on every tab switch — they
        // only ever mount once, the first time this carousel itself mounts. Scoped to just these
        // 3 routes (rather than every page) because several other pages (the game table, betting
        // screens) rely on position:fixed internally, which a transformed ancestor would break
        // (it becomes the containing block for fixed descendants instead of the viewport).
        <div className="overflow-x-hidden">
          <motion.div
            className="flex"
            style={{ width: "300%" }}
            animate={{ x: `${-currentTabIndex * (100 / 3)}%` }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.35 }}
          >
            <div className="flex-shrink-0" style={{ width: "33.3333%" }}>
              <div className="pb-nav-safe"><Shop /></div>
            </div>
            <div className="flex-shrink-0" style={{ width: "33.3333%" }}>
              <div className="pb-nav-safe"><Home /></div>
            </div>
            <div className="flex-shrink-0" style={{ width: "33.3333%" }}>
              <div className="pb-nav-safe"><Profile /></div>
            </div>
          </motion.div>
        </div>
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
