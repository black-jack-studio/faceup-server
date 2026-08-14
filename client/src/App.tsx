import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserStore } from "@/store/user-store";
import { useEffect } from "react";
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

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/">
          <div className="pb-nav-safe"><Home /></div>
        </Route>
        <Route path="/practice">
          <div className="pb-nav-safe"><Practice /></div>
        </Route>
        <Route path="/cash-games">
          <div className="pb-nav-safe"><CashGames /></div>
        </Route>
        <Route path="/counting">
          <div className="pb-nav-safe"><Counting /></div>
        </Route>
        <Route path="/shop">
          <div className="pb-nav-safe"><Shop /></div>
        </Route>
        <Route path="/premium">
          <Premium />
        </Route>
        <Route path="/battlepass">
          <BattlePassPage />
        </Route>
        <Route path="/profile">
          <div className="pb-nav-safe"><Profile /></div>
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
