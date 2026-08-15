import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserStore } from "@/store/user-store";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  const prevTabIndexRef = useRef(TAB_ROUTES.indexOf(location));

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

  // 1 = sliding to a tab further right (Shop -> Home -> Profile), -1 = further left,
  // 0 = arriving at a tab from a non-tab page (fade only, no meaningful spatial direction).
  let direction = 0;
  if (isTabRoute && prevTabIndexRef.current !== -1) {
    direction = currentTabIndex > prevTabIndexRef.current ? 1 : currentTabIndex < prevTabIndexRef.current ? -1 : 0;
  }
  if (isTabRoute) {
    prevTabIndexRef.current = currentTabIndex;
  }

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#000000' }}>
      {isTabRoute ? (
        // The 3 bottom-nav tabs slide past each other in their left-to-right tab order — e.g.
        // Profile -> Shop visibly moves in Home's direction. Scoped to just these 3 (simple,
        // non-fixed-position page layouts) rather than every route in the app: some pages (the
        // game table, betting screens) rely on position:fixed internally, and both an absolutely
        // positioned *or* a transformed ancestor would break that (redefines their containing
        // block), so those keep rendering exactly as before, no wrapper at all. mode="wait"
        // (rather than overlapping the two pages) keeps this a plain in-flow block the whole
        // time too — no absolute positioning here either, so page height/scroll is untouched.
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location}
            initial={{ x: direction === 0 ? 0 : `${direction * 60}px`, opacity: direction === 0 ? 0 : 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction === 0 ? 0 : `${direction * -60}px`, opacity: 0 }}
            transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.28 }}
          >
            <Switch location={location}>
              <Route path="/">
                <div className="pb-nav-safe"><Home /></div>
              </Route>
              <Route path="/shop">
                <div className="pb-nav-safe"><Shop /></div>
              </Route>
              <Route path="/profile">
                <div className="pb-nav-safe"><Profile /></div>
              </Route>
            </Switch>
          </motion.div>
        </AnimatePresence>
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
