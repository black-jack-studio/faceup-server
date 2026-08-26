import { Switch, Route, useLocation, Router as WouterRouter } from "wouter";
import { useReplaceOnlyLocation } from "@/lib/replaceOnlyLocation";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUserStore } from "@/store/user-store";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { initAdMob } from "@/lib/admob";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import { unlockAudio } from "@/lib/sound";
import { initGameSounds } from "@/lib/game-sounds";

// Pages
import Home from "@/pages/home";
import Practice from "@/pages/practice";
import CashGames from "@/pages/cash-games";
import Counting from "@/pages/counting";
import Shop from "@/pages/shop";
import Premium from "@/pages/premium";
import BattlePassPage from "@/pages/battlepass";
import WheelOfFortunePage from "@/pages/wheel-of-fortune";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import LegalLinks from "@/pages/legal-links";
import PrivacyPolicy from "@/pages/legal/privacy-policy";
import TermsOfService from "@/pages/legal/terms-of-service";
import LegalNotice from "@/pages/legal/legal-notice";
import Support from "@/pages/support";
import Credits from "@/pages/credits";
import GameRules from "@/pages/game-rules";
import Settings from "@/pages/settings";
import Avatars from "@/pages/avatars";
import Friends from "@/pages/friends";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Welcome from "@/pages/auth/welcome";
import VerifyEmail from "@/pages/auth/verify-email";
import NotFound from "@/pages/not-found";

// Play modes
import ClassicMode from "@/pages/play/classic";
import GameMode from "@/pages/play/game";
import PlayWithFriends from "@/pages/play/friends";
import FriendsLobby from "@/pages/play/friends-lobby";
import TableTest from "@/pages/play/table-test";

// Layout
import BottomNav from "@/components/layout/BottomNav";

// Left-to-right order of the bottom nav tabs — swiping between them slides in that same
// spatial direction (Shop -> Home -> Profile), rather than every navigation looking identical.
const TAB_ROUTES = ["/shop", "/", "/profile"];

// Shop, Home, and Profile are all *always* mounted, so switching between them never replays
// each page's own entrance animations — those only ever play once, the first time this
// carousel mounts. Switching is instant (transition duration 0) — no crossfade. Still an
// opacity toggle rather than display:none/a translateX slide: a CSS transform on an ancestor
// (even "translateX(0)" at rest — framer-motion doesn't clear the property, just parks it at
// identity) redefines the containing block for any position:fixed descendant, which broke
// position:fixed things nested inside these pages (e.g. the Settings/Avatar popups on
// Profile). Opacity doesn't have that effect, so it's safe here.
function TabCarousel({ location }: { location: string }) {
  return (
    // overflow: hidden is load-bearing here, not decorative: an absolutely positioned child
    // taller than this container doesn't affect this container's own layout height, but it
    // *does* still extend the page's scrollable area unless something actually clips it — so
    // without this, an inactive tab with more content than the active one (e.g. Shop, if it's
    // taller than Profile) kept the page scrollable past the active tab's real content, even
    // though that inactive tab was invisible (opacity: 0) the whole time.
    <div style={{ position: "relative", width: "100%", overflow: "hidden" }}>
      {[
        { path: "/shop", Component: Shop },
        { path: "/", Component: Home },
        { path: "/profile", Component: Profile },
      ].map(({ path, Component }) => {
        const isActive = path === location;
        return (
          <motion.div
            key={path}
            // Only the active panel is ever in normal flow — inactive ones are pulled out via
            // position:absolute so they stop contributing their own height. With all 3 sharing
            // one box (e.g. via CSS grid stacking), the container was always exactly as tall as
            // whichever page had the *most* content, so shorter pages had a huge empty
            // (but still scrollable) gap below their real content. Absolute doesn't touch fixed
            // descendants' containing block the way transform does, so this stays safe.
            style={
              isActive
                ? { position: "static", width: "100%", minWidth: 0, overflowX: "hidden", pointerEvents: "auto" }
                : { position: "absolute", top: 0, left: 0, right: 0, width: "100%", minWidth: 0, overflowX: "hidden", pointerEvents: "none" }
            }
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0 }}
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
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/legal/privacy-policy" component={PrivacyPolicy} />
        <Route path="/legal/terms-of-service" component={TermsOfService} />
        <Route path="/legal/legal-notice" component={LegalNotice} />
        <Route path="/support" component={Support} />
        <Route path="/" component={Welcome} />
        <Route component={Welcome} />
      </Switch>
    );
  }

  const isTabRoute = TAB_ROUTES.includes(location);
  // Settings slides over Profile rather than replacing it, so Profile (and Shop/Home,
  // sharing the same TabCarousel instance) stays mounted the whole time Settings is open —
  // otherwise it would remount on the way back and replay its own entrance animations.
  const isSettingsRoute = location === "/settings";
  // Legal Links slides over Settings the same way — reached by tapping "Privacy" there. It
  // used to be its own unrelated route, animating in on its own while Settings' AnimatePresence
  // *also* played Settings' own exit at the same time (them being on the same route was what
  // unmounted it) — two uncoordinated slides overlapping read as one broken, glitchy motion.
  // Keeping Settings mounted and stationary underneath, like Profile is under Settings, leaves
  // only the one intentional slide on screen.
  const isLegalLinksRoute = location === "/legal-links";
  const keepSettingsMounted = isSettingsRoute || isLegalLinksRoute;

  return (
    <div className="overflow-x-hidden" style={{ backgroundColor: '#000000' }}>
      {/* While Settings (or Legal Links, over it) is open, Profile must stay the active
          (opaque) panel underneath — neither route matches any of the three tabs, which would
          otherwise fade Profile to transparent and flash black through the gap before the
          sliding overlay covers it. */}
      {(isTabRoute || keepSettingsMounted) && <TabCarousel location={keepSettingsMounted ? "/profile" : location} />}
      <AnimatePresence>
        {keepSettingsMounted && (
          <motion.div
            key="settings-overlay"
            // Above BottomNav's z-50 on purpose: the nav bar stays mounted underneath (see
            // ConditionalBottomNav) instead of unmounting the instant this route opens, so
            // this needs to actually slide over and cover it, not sit behind it.
            className="fixed inset-0 z-[55]"
            style={{ backgroundColor: '#000000' }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
          >
            {/* No pb-nav-safe here: that padding exists to keep content clear of the *visible*
                floating nav pill, but this sheet now covers it entirely (z-[55] above its
                z-50) instead of leaving it showing underneath. */}
            <div className="h-full overflow-hidden"><Settings /></div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isLegalLinksRoute && (
          <motion.div
            key="legal-links-overlay"
            className="fixed inset-0 z-[56]"
            style={{ backgroundColor: '#000000' }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
          >
            <div className="h-full overflow-hidden"><LegalLinks /></div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isTabRoute && !keepSettingsMounted && (
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
          <Route path="/wheel-of-fortune">
            <WheelOfFortunePage />
          </Route>
          <Route path="/friends">
            <div className="pb-nav-safe"><Friends /></div>
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
          <Route path="/game-rules">
            <div className="pb-nav-safe"><GameRules /></div>
          </Route>
          <Route path="/avatars">
            <Avatars />
          </Route>
          <Route path="/leaderboard">
            <div className="pb-nav-safe"><Leaderboard /></div>
          </Route>
          <Route path="/play/classic" component={ClassicMode} />
          <Route path="/play/game" component={GameMode} />
          <Route path="/play/friends" component={PlayWithFriends} />
          <Route path="/play/friends-lobby/:tableId">
            <FriendsLobby />
          </Route>
          {/* Prototype: single-page table with the bet wheel in place of the betting screen —
              testing locally before deciding whether to replace /play/classic with this. Direct-
              link fallback only now — the Home entry point shows this as an overlay instead
              (see home.tsx), so TableTest itself no longer owns its own fixed positioning. */}
          <Route path="/play/table-test">
            <div className="fixed-safe-screen">
              <TableTest />
            </div>
          </Route>
          <Route component={NotFound} />
        </Switch>
      )}
      <ConditionalBottomNav />
    </div>
  );
}

function ConditionalBottomNav() {
  const [location] = useLocation();
  
  // Hide bottom nav on game pages, battlepass, and premium pages — NOT settings: that one stays
  // mounted and simply gets covered by the sliding Settings sheet (see its z-index below),
  // so the nav bar is still there through the slide-over animation instead of instantly
  // vanishing the moment you tap the gear icon.
  const hideOnPaths = ['/play', '/battlepass', '/premium', '/avatars', '/wheel-of-fortune', '/friends'];
  const shouldHide = hideOnPaths.some(path => location.startsWith(path));
  
  return !shouldHide ? <BottomNav /> : null;
}

function App() {
  const initializeAuth = useUserStore((state) => state.initializeAuth);
  const user = useUserStore((state) => state.user);
  const hasRegisteredPush = useRef(false);

  useEffect(() => {
    initializeAuth();
    initAdMob();
    initGameSounds();
    // Sounds triggered outside a tap (dealer draws, server-synced results) are blocked by
    // WebView autoplay restrictions until *some* user gesture has played audio first — see
    // unlockAudio's own comment. `once: true` is enough since it only needs to happen once
    // per app session.
    window.addEventListener("pointerdown", unlockAudio, { once: true });
  }, [initializeAuth]);

  useEffect(() => {
    // /api/push/register-token is authenticated, so this can't run until initializeAuth
    // above has resolved with a signed-in user — only fires once per app session.
    if (user && !hasRegisteredPush.current) {
      hasRegisteredPush.current = true;
      registerForPushNotifications();
    }
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <WouterRouter hook={useReplaceOnlyLocation}>
            <Router />
          </WouterRouter>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
