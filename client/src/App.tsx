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

// Shop, Home, and Profile are all *always* mounted (stacked in the same spot via CSS grid), so
// switching between them never replays each page's own entrance animations — those only ever
// play once, the first time this carousel mounts. Deliberately a plain opacity crossfade, not a
// translateX slide: a CSS transform on an ancestor (even "translateX(0)" at rest — framer-motion
// doesn't clear the property, just parks it at identity) redefines the containing block for any
// position:fixed descendant, which broke position:fixed things nested inside these pages (e.g.
// the Settings/Avatar popups on Profile). Opacity doesn't have that effect, so it's safe here.
function TabCarousel({ location }: { location: string }) {
  return (
    // Explicit column/row sizing is required here: with none set, an implicit CSS grid track
    // auto-sizes to the *widest natural content* among everything sharing that cell — if any
    // one of the 3 pages has something intrinsically wider than the viewport anywhere in its
    // tree, the whole grid cell (and so every "100%"-width panel in it) inherits that width and
    // overflows to the right, clipped by the parent's overflow-x-hidden instead of ever
    // reaching 100vw at the left edge. Pinning both to 100% forces exactly viewport size.
    <div style={{ display: "grid", gridTemplateColumns: "100%", gridTemplateRows: "100%", width: "100%" }}>
      {[
        { path: "/shop", Component: Shop },
        { path: "/", Component: Home },
        { path: "/profile", Component: Profile },
      ].map(({ path, Component }) => {
        const isActive = path === location;
        return (
          <motion.div
            key={path}
            style={{ gridArea: "1 / 1", width: "100%", minWidth: 0, overflowX: "hidden", pointerEvents: isActive ? "auto" : "none" }}
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="pb-nav-safe"><Component /></div>
          </motion.div>
        );
      })}
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
