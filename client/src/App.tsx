import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserStore } from "@/store/user-store";
import { useEffect } from "react";

// Pages
import Home from "@/pages/home";
import Practice from "@/pages/practice";
import CashGames from "@/pages/cash-games";
import Counting from "@/pages/counting";
import Shop from "@/pages/shop";
import Premium from "@/pages/premium";
import BattlePassPage from "@/pages/battlepass";
import Profile from "@/pages/profile";
import PrivacySettings from "@/pages/privacy-settings";
import Leaderboard from "@/pages/leaderboard";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import NotFound from "@/pages/not-found";

// Play modes
import ClassicMode from "@/pages/play/classic";
import GameMode from "@/pages/play/game";
import ClassicDirect from "@/pages/play/classic-direct";
import HighStakesMode from "@/pages/play/high-stakes";
import TournamentsMode from "@/pages/play/tournaments";
import ChallengesMode from "@/pages/play/challenges";

// Layout
// import Navigation from "@/components/layout/navigation"; // Replaced by BottomNav
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
        <Route path="/" component={Login} />
        <Route component={Login} />
      </Switch>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Switch>
        <Route path="/">
          <div className="pb-24"><Home /></div>
        </Route>
        <Route path="/practice">
          <div className="pb-24"><Practice /></div>
        </Route>
        <Route path="/cash-games">
          <div className="pb-24"><CashGames /></div>
        </Route>
        <Route path="/counting">
          <div className="pb-24"><Counting /></div>
        </Route>
        <Route path="/shop">
          <div className="pb-24"><Shop /></div>
        </Route>
        <Route path="/premium">
          <Premium />
        </Route>
        <Route path="/battlepass">
          <BattlePassPage />
        </Route>
        <Route path="/profile">
          <div className="pb-24"><Profile /></div>
        </Route>
        <Route path="/privacy-settings">
          <div className="pb-24"><PrivacySettings /></div>
        </Route>
        <Route path="/leaderboard">
          <div className="pb-24"><Leaderboard /></div>
        </Route>
        <Route path="/play/classic" component={ClassicMode} />
        <Route path="/play/game" component={GameMode} />
        <Route path="/play/classic-direct" component={ClassicDirect} />
        <Route path="/play/high-stakes" component={HighStakesMode} />
        <Route path="/play/tournaments" component={TournamentsMode} />
        <Route path="/play/challenges" component={ChallengesMode} />
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
  const loadUser = useUserStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

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
