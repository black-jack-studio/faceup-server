import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { triggerHapticTick } from "@/lib/haptics";
import { useUserStore } from "@/store/user-store";
import { useGameStore } from "@/store/game-store";
import { requestAppReview } from "@/lib/rating";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useOverlayVisibility } from "@/hooks/use-overlay-visibility";
import { useQuery } from "@tanstack/react-query";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import Challenges from "@/components/challenges";
import DailyStreakPopup from "@/components/DailyStreakPopup";
import NotificationPermissionPopup from "@/components/NotificationPermissionPopup";
import TrackingPermissionPopup from "@/components/TrackingPermissionPopup";
import CreateGameSheet from "@/components/game/CreateGameSheet";
import { registerForPushNotifications } from "@/lib/pushNotifications";
import { peekTrackingAuthorizationStatus, requestTrackingAuthorization } from "@/lib/tracking-authorization";
import { syncAnalyticsTrackingConsent, identifyAnalyticsUser } from "@/lib/analytics";
import { RANKS } from "@/ranks/data";
import { getRankForWins } from "@/ranks/useRank";
import OnboardingWalkthrough from "@/components/onboarding/OnboardingWalkthrough";
import OnboardingTutorial from "@/components/onboarding/OnboardingTutorial";
import ClassicMode from "@/pages/play/classic";
import FriendsLobby from "@/pages/play/friends-lobby";
import BattlePassPage from "@/pages/battlepass";
import Leaderboard from "@/pages/leaderboard";
import NotificationDot from "@/components/NotificationDot";
import Flame from "@/icons/Flame";
import { useEnteredOnce } from "@/hooks/use-entered-once";
import { trackOnboardingSkipped } from "@/lib/analytics";
import CoinBurst from "@/components/game/play/CoinBurst";
import CountingBalance from "@/components/game/CountingBalance";
import { COIN_STAGGER, COIN_FLIGHT_DURATION } from "@/lib/coinFlightTiming";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  // Home unmounts and remounts fresh every time you leave to a full-screen page (Classic 21,
  // Cash Games, Practice, ...) and come back — without this, its fade/slide-in replayed on
  // every single return trip, which read as an odd extra animation stacked right on top of
  // whatever closing transition the page you just left was already playing.
  const skipEntrance = useEnteredOnce("home");

  // Check if user has unclaimed Battle Pass tiers
  const { data: claimedTiersData, isLoading: isLoadingClaimedTiers } = useQuery({
    queryKey: ['/api/battlepass/claimed-tiers'],
    enabled: !!user,
  });

  // Needed to know whether premium chests count toward the notification too — same query
  // battlepass.tsx itself uses to gate premium claims.
  const { data: subscriptionData } = useQuery({
    queryKey: ['/api/subscription/status'],
    enabled: !!user,
  });

  // Drives the notification dot on the flame — same query the popup itself reads once open,
  // and the one BottomNav reads to light up the Home tab too.
  const { data: streakStatus } = useQuery<{ claimableReward: unknown | null }>({
    queryKey: ["/api/daily-streak"],
  });
  // Crossfades the big hero balance for a small one pinned in the header as the page
  // scrolls — mirrors the reference recording: the header row itself never moves, only
  // the balance number's opacity is tied to scroll distance.
  const [headerBalanceOpacity, setHeaderBalanceOpacity] = useState(0);
  useEffect(() => {
    const FADE_DISTANCE = 80;
    const onScroll = () => {
      setHeaderBalanceOpacity(Math.min(window.scrollY / FADE_DISTANCE, 1));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Coins-flying-into-the-balance celebration for a claimed challenge (Anatole, 2026-09-13:
  // "comme en game" — the same CoinBurst/CountingBalance combo classic.tsx uses for a win).
  // homeRootRef is CoinBurst's own required position:relative ancestor (see its own props);
  // coinsHeaderRef is where the coins fly TO (the fixed header balance, not CoinsHero's
  // scroll-revealed one — "en haut de l'écran" is specifically the pinned one). claimSourceRef
  // holds whichever card's own DOM node was just claimed (see challenges.tsx's onClaimed) —
  // a plain ref, not state, since CoinBurst only ever reads it at the instant `active` flips
  // true and nothing here needs a re-render when it's set.
  const homeRootRef = useRef<HTMLDivElement>(null);
  const coinsHeaderRef = useRef<HTMLSpanElement>(null);
  const claimSourceRef = useRef<HTMLElement | null>(null);
  // A fixed, generous count regardless of the reward's own size — unlike a hand's win, there's
  // no "table max bet" to scale against here, and a couple of coins for a small reward would
  // read as sparse ("je veux pas qu'il y ait deux coins" — Anatole, 2026-09-13) rather than the
  // same full celebration every time.
  const CHALLENGE_CLAIM_COIN_COUNT = 10;
  const [claimCoinAnim, setClaimCoinAnim] = useState<{ from: number; to: number } | null>(null);
  const handleChallengeClaimed = (cardEl: HTMLElement | null, reward: number) => {
    if (!cardEl) return;
    claimSourceRef.current = cardEl;
    const from = user?.coins ?? 0;
    setClaimCoinAnim({ from, to: from + reward });
    // Same per-coin stagger/flight duration CoinBurst always uses (see coinFlightTiming) —
    // "je veux pas que les coins y partent trop vite" — reusing it rather than a guessed
    // number is what actually keeps this identical to the game's own version, not just similar.
    const totalMs = (CHALLENGE_CLAIM_COIN_COUNT - 1) * COIN_STAGGER * 1000 + COIN_FLIGHT_DURATION * 1000 + 250;
    setTimeout(() => setClaimCoinAnim(null), totalMs);
  };

  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showClassic, setShowClassic] = useState(false);
  const [showBattlePass, setShowBattlePass] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [friendsLobbyTableId, setFriendsLobbyTableId] = useState<string | null>(null);

  // First-run onboarding (new accounts only) — read once at mount, same "decide once, not via
  // an effect" approach as skipEntrance/useEnteredOnce above. Home only ever mounts once per
  // authenticated session (see App.tsx's TabCarousel), so this always sees a real, settled user.
  const [onboardingPhase, setOnboardingPhase] = useState<"walkthrough" | "tutorial" | null>(
    () => (user?.hasCompletedOnboarding === false ? "walkthrough" : null)
  );
  const finishOnboarding = () => {
    setOnboardingPhase(null);
    updateUser({ hasCompletedOnboarding: true });
  };
  const skipOnboarding = () => {
    trackOnboardingSkipped(onboardingPhase ?? "walkthrough");
    finishOnboarding();
  };

  const handleOpenBattlePass = () => {
    triggerHapticTick();
    setShowBattlePass(true);
  };

  // In-app "enable notifications" ask — replaces asking the OS directly the moment the user
  // shows up (an instant native prompt from someone who hasn't even seen the app yet reads as
  // hostile and tends to get an instinctive "no", which burns the one native ask iOS gives us
  // per install). Shown only from Home (never the table, shop, or profile) once the player has
  // actually won something: first after their first-ever won hand, then again on every
  // subsequent rank-up for as long as they keep declining our own popup — declining it never
  // touches the real OS permission, so it costs us nothing to ask again later. Stops for good
  // once pushToken is set (they accepted and the native prompt granted).
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const seasonHandsWon = user?.seasonHandsWon ?? 0;
  const currentRankIndex = RANKS.findIndex((r) => r.key === getRankForWins(seasonHandsWon).key);
  const lastPromptedRankIndex = user?.pushPromptRankIndex ?? -1;

  // Same idea as the notification popup above, for iOS App Tracking Transparency: a custom
  // in-app ask instead of letting the native ATT dialog fire the instant a fresh account lands
  // here (or worse, mid-login/register — identifyAnalyticsUser used to trigger it from there
  // too; see tracking-authorization.ts). Shown once, 5s after arriving on Home, only while ATT
  // is still genuinely undetermined (an existing user who already answered it in a previous
  // app version never sees this). Unlike the notification popup there's no rank-up retry here —
  // ATT is a one-shot native dialog with no "ask again" concept, so a decline just marks it
  // permanently answered (hasSeenTrackingPrompt) and ads keep working non-personalized.
  const [showTrackingPopup, setShowTrackingPopup] = useState(false);
  const [trackingPromptReady, setTrackingPromptReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTrackingPromptReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Whether Home is actually covered by one of its own full-screen overlays right now, even
  // though it never unmounts underneath them. Drives both the scroll lock below and CoinsHero's
  // isVisible prop (see CoinsHero.tsx) — its balance count-up animation needs to skip playing
  // while hidden behind one of these, or it finishes off-screen before the player ever sees it.
  const isHomeCovered =
    showCreateGame || showClassic || showBattlePass || showLeaderboard || !!friendsLobbyTableId ||
    onboardingPhase !== null || showNotificationPopup || showTrackingPopup;

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return; // web has no native permission to ask for
    if (user.pushToken) return; // already granted and registered
    if (seasonHandsWon < 1) return; // wait for their first won hand
    if (currentRankIndex <= lastPromptedRankIndex) return; // already asked at (or past) this rank
    if (isHomeCovered || showNotificationPopup) return; // don't stack over onboarding/other sheets
    setShowNotificationPopup(true);
    // isHomeCovered intentionally omitted: it already includes showNotificationPopup, which
    // would immediately re-run and re-block this effect the instant it opens the popup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, seasonHandsWon, currentRankIndex, lastPromptedRankIndex, onboardingPhase, showCreateGame, showClassic, showBattlePass, showLeaderboard, friendsLobbyTableId]);

  useEffect(() => {
    if (!user || !trackingPromptReady) return;
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return; // ATT is iOS-only
    if (user.hasSeenTrackingPrompt) return;
    if (isHomeCovered || showTrackingPopup) return; // don't stack over onboarding/other sheets
    let cancelled = false;
    peekTrackingAuthorizationStatus().then((status) => {
      if (!cancelled && status === "notDetermined") setShowTrackingPopup(true);
    });
    return () => {
      cancelled = true;
    };
    // isHomeCovered intentionally omitted, same reasoning as the notification effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, trackingPromptReady, onboardingPhase, showCreateGame, showClassic, showBattlePass, showLeaderboard, friendsLobbyTableId, showNotificationPopup]);

  // Native App Store / Play Store review ask — fired once a player has actually played enough
  // to have an opinion (a review prompt on someone's very first hand reads as desperate and
  // wastes one of the OS's limited yearly slots on a player with nothing to judge yet). Unlike
  // the notification/ATT asks above there's no custom in-app sheet here: the OS prompt is
  // already the whole UI, and it silently no-ops once its own quota is spent, so we just fire it
  // and mark it done — no accept/decline branch to track.
  const handsPlayed = useGameStore((state) => state.handsPlayed);
  const RATING_PROMPT_HANDS_THRESHOLD = 5;
  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return; // no store review sheet on web
    if (user.hasSeenRatingPrompt) return;
    if (handsPlayed < RATING_PROMPT_HANDS_THRESHOLD) return;
    if (isHomeCovered) return; // don't fire the OS sheet over onboarding/other sheets
    updateUser({ hasSeenRatingPrompt: true });
    requestAppReview();
  }, [user, handsPlayed, isHomeCovered]);

  // Marks this rank tier as answered either way — accepting or declining our own popup both
  // stop it from reappearing until the next rank-up, only the native call differs.
  const answerNotificationPrompt = (accepted: boolean) => {
    setShowNotificationPopup(false);
    updateUser({ pushPromptRankIndex: currentRankIndex });
    if (accepted) registerForPushNotifications();
  };

  // Marks the ATT ask as permanently answered either way. Only on accept do we actually touch
  // the native dialog, then immediately re-sync analytics/ads so a same-session grant applies
  // right away instead of waiting for the next app launch.
  const answerTrackingPrompt = async (accepted: boolean) => {
    setShowTrackingPopup(false);
    updateUser({ hasSeenTrackingPrompt: true });
    if (!accepted) return;
    await requestTrackingAuthorization();
    syncAnalyticsTrackingConsent();
    if (user) identifyAnalyticsUser(user.id);
  };

  // Locks the page's own scroll while any overlay is open — Home never unmounts underneath
  // them, so without this a swipe/scroll on the overlay (which doesn't otherwise stop it) fell
  // straight through to Home's scroll position, leaving Home scrolled somewhere else once the
  // overlay closed even though nothing about it was ever visible while that happened.
  // Reference-counted (see the hook) rather than each page hand-rolling its own set/reset:
  // a naive reset-to-"" on cleanup clobbers an *outer* lock still in effect when something
  // nested inside one of these overlays (e.g. a BottomSheet opened from within them) closes
  // first.
  useBodyScrollLock(isHomeCovered);

  // Tells ConditionalBottomNav (App.tsx) to unmount the nav bar the instant each of these
  // opens, and to remount it only once its own exit animation has genuinely finished (the
  // returned handler goes on that overlay's <AnimatePresence onExitComplete={...}> below) —
  // see hooks/use-overlay-visibility.ts for why that has to be driven by the real animation
  // completion rather than the `showX` boolean flipping.
  const onCreateGameExitComplete = useOverlayVisibility(showCreateGame);
  const onClassicExitComplete = useOverlayVisibility(showClassic);
  const onFriendsLobbyExitComplete = useOverlayVisibility(!!friendsLobbyTableId);
  const onBattlePassExitComplete = useOverlayVisibility(showBattlePass);
  const onLeaderboardExitComplete = useOverlayVisibility(showLeaderboard);
  const onOnboardingWalkthroughExitComplete = useOverlayVisibility(onboardingPhase === "walkthrough");
  const onOnboardingTutorialExitComplete = useOverlayVisibility(onboardingPhase === "tutorial");

  const claimedFreeTiers = (claimedTiersData as any)?.freeTiers || [];
  const claimedPremiumTiers = (claimedTiersData as any)?.premiumTiers || [];
  const isUserPremium = (subscriptionData as any)?.isActive || user?.membershipType === 'premium' || false;

  const currentLevel = user?.level ?? 0;
  // Show the notification as long as ANY tier the player has already reached (levels can jump
  // by more than one at a time, e.g. several XP-earning games played before opening the pass)
  // still has an unclaimed chest — free or premium — not just the current level's own tier.
  // Otherwise catching up on the current tier's chest cleared the dot while older unopened
  // chests sat below it. Free rewards only go up to tier 30, premium up to tier 50 (see
  // BATTLE_PASS_TIERS in battlepass.tsx); premium tiers only count for premium subscribers.
  // Gated on !isLoadingClaimedTiers: before that query resolves, claimed tiers default to [],
  // which made every level > 0 look unclaimed — the dot flashed on for anyone past level 0 on
  // every cold start, then vanished once the real (already-claimed) data arrived a moment later.
  const maxClaimableFreeTier = Math.min(currentLevel, 30);
  const hasUnclaimedFreeTier = Array.from({ length: maxClaimableFreeTier }, (_, i) => i + 1)
    .some((tier) => !claimedFreeTiers.includes(tier));
  const maxClaimablePremiumTier = Math.min(currentLevel, 50);
  const hasUnclaimedPremiumTier = isUserPremium && Array.from({ length: maxClaimablePremiumTier }, (_, i) => i + 1)
    .some((tier) => !claimedPremiumTiers.includes(tier));
  const hasUnclaimedTiers = !isLoadingClaimedTiers && currentLevel > 0 &&
    (hasUnclaimedFreeTier || hasUnclaimedPremiumTier);

  return (
    <div ref={homeRootRef} className="relative min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Header with level/gems and XP ring — pinned in place while the page scrolls
          underneath it; the balance crossfades in here as CoinsHero's own number fades out. */}
      {/* Fixed elements ignore body's own safe-area padding-top (see index.css), so unlike
          Profile's icons — which sit in normal flow and inherit it "for free" via a plain
          top-6/24px offset on top of that inherited clearance — this needs the inset added
          back in explicitly, or it reads flush against the status bar/notch. Matches Profile's
          same env(safe-area-inset-top) + 24px total. */}
      <header className="fixed top-0 inset-x-0 z-20 bg-black px-6 pb-6" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}>
        <motion.div
          className="flex items-center justify-between"
          initial={skipEntrance ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.button
            className="relative flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowStreakPopup(true)}
            data-testid="button-header-daily-streak"
          >
            <Flame size={48} />
            <NotificationDot show={!!streakStatus?.claimableReward} className="-top-1 -right-1" />
          </motion.button>

          <div
            className="text-3xl font-light"
            style={{ opacity: headerBalanceOpacity, color: claimCoinAnim ? "#34d399" : "#ffffff" }}
          >
            <span ref={coinsHeaderRef} data-testid="text-home-header-balance">
              <CountingBalance
                from={claimCoinAnim?.from ?? (user?.coins ?? 0)}
                to={claimCoinAnim?.to ?? (user?.coins ?? 0)}
                active={!!claimCoinAnim}
                impactCount={claimCoinAnim ? CHALLENGE_CLAIM_COIN_COUNT : undefined}
                showSign={false}
              />
            </span>
          </div>

          <div className="flex items-center">
            <div className="relative">
              <XPRing size={50} stroke={5} onClick={handleOpenBattlePass} />
              <NotificationDot show={hasUnclaimedTiers} className="-top-2 -right-2" />
            </div>
          </div>
        </motion.div>
      </header>
      {/* Spacer for the now-fixed header above, so content starts where it used to. No safe-area
          inset in this calc: unlike the fixed header (which ignores body's padding and needs
          the inset added back explicitly), this spacer is normal-flow content inside body,
          which already shifted it down by that same inset via body's own padding-top (see
          index.css) — adding it again here double-counted it, showing up as extra empty space
          below the header on any device with a nonzero inset (native, notch/Dynamic Island)
          while being invisible on web (inset is 0 there). */}
      <div aria-hidden style={{ height: "96px" }} />
      {/* Coins Display */}
      <motion.div style={{ opacity: 1 - headerBalanceOpacity }}>
        <CoinsHero isVisible={!isHomeCovered} />
      </motion.div>
      {/* Game Modes Carousel */}
      <ModesCarousel
        onSelectFriends={() => setShowCreateGame(true)}
        onSelectClassic={() => setShowClassic(true)}
        skipEntrance={skipEntrance}
      />
      {/* Leaderboard */}
      <motion.section
        className="px-6 mb-8"
        initial={skipEntrance ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <HomeLeaderboard skipEntrance={skipEntrance} onOpen={() => setShowLeaderboard(true)} />
      </motion.section>
      {/* Daily Challenges */}
      <motion.section
        className="px-6 mb-8 pt-6 border-t border-white/10"
        initial={skipEntrance ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Challenges skipEntrance={skipEntrance} onClaimed={handleChallengeClaimed} />
      </motion.section>

      <CoinBurst
        active={!!claimCoinAnim}
        sourceRef={claimSourceRef}
        targetRef={coinsHeaderRef}
        containerRef={homeRootRef}
        count={CHALLENGE_CLAIM_COIN_COUNT}
      />

      <DailyStreakPopup open={showStreakPopup} onClose={() => setShowStreakPopup(false)} />

      <NotificationPermissionPopup
        open={showNotificationPopup}
        onDecline={() => answerNotificationPrompt(false)}
        onAccept={() => answerNotificationPrompt(true)}
      />

      <TrackingPermissionPopup
        open={showTrackingPopup}
        onDecline={() => answerTrackingPrompt(false)}
        onAccept={() => answerTrackingPrompt(true)}
      />

      {/* Shown in place instead of routing to /play/friends — Home stays mounted underneath
          the sheet the whole time, so it slides up over (and back down off) the actual Home
          content instead of a route swap leaving a black gap while neither page is in place.
          A "hold in place, then swap" exit (an object identical to the resting position) isn't
          actually an option here: Framer Motion treats a from===to animation as a no-op and
          resolves it near-instantly regardless of its transition's duration, so AnimatePresence
          removed this the moment onEnterLobby fired — flashing Home through underneath for a
          frame before the Lobby overlay's own slide had caught up to actually cover it. Instead
          onEnterLobby (below) delays setShowCreateGame(false) itself, so this sheet just sits
          here completely untouched — same "down" exit as ever, unconditionally — until after
          the Lobby overlay (also below) has fully finished sliding over and hiding it; whatever
          this does once it's finally removed happens invisibly underneath that by then. */}
      <AnimatePresence onExitComplete={onCreateGameExitComplete}>
        {showCreateGame && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            // Smooth, natural deceleration (the iOS sheet-presentation curve) instead of the
            // plain easeOut this used to share with the exit — at 0.2s/easeOut this read as a
            // slightly rough, mechanical snap rather than a fluid glide.
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <CreateGameSheet
              onBack={() => setShowCreateGame(false)}
              onEnterLobby={(tableId) => {
                setFriendsLobbyTableId(tableId);
                // Matches the Lobby overlay's own 0.28s entrance below, plus a small buffer —
                // see the block comment above for why this can't just be an in-place "exit"
                // instead.
                setTimeout(() => setShowCreateGame(false), 320);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same reasoning as the Create Game overlay above, for Classic 21. */}
      <AnimatePresence onExitComplete={onClassicExitComplete}>
        {showClassic && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            // Smooth, natural deceleration (the iOS sheet-presentation curve) instead of the
            // plain easeOut this used to share with the exit — at 0.2s/easeOut this read as a
            // slightly rough, mechanical snap rather than a fluid glide.
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <ClassicMode onClose={() => setShowClassic(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same reasoning as the Create Game overlay above, for the Play with Friends table
          itself — reached from the Create Game overlay's onEnterLobby, above, instead of
          routing to /play/friends-lobby/:tableId. Keeps Home mounted underneath through the
          whole betting/table flow so leaving it slides down onto an already-visible Home
          instead of a black gap until the route swap lands.
          Entrance is x: "100%" -> 0 (same 0.28s easeInOut tween as Settings sliding over
          Profile in App.tsx), not the y-axis slide Create Game itself uses — deliberately a
          different axis so this doesn't visually race against Create Game's own y-axis exit
          happening at the same time underneath (both used to move the same way, which read as
          one lurching down-then-up-then-sideways motion instead of two distinct transitions).
          The Create Game sheet stays visible along the trailing edge for the ~0.28s both are
          mid-transition, same as Profile staying visible along Settings' trailing edge — that's
          the transition being seen, not a bug to hide. */}
      <AnimatePresence onExitComplete={onFriendsLobbyExitComplete}>
        {friendsLobbyTableId && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ x: "100%" }}
            animate={{ x: 0, transition: { type: "tween", duration: 0.28, ease: "easeInOut" } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <FriendsLobby tableId={friendsLobbyTableId} onClose={() => setFriendsLobbyTableId(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same reasoning as the Create Game overlay above, for the Battle Pass. */}
      <AnimatePresence onExitComplete={onBattlePassExitComplete}>
        {showBattlePass && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            // Battle Pass is a genuinely tall scrolling page (50 tiers), but the scrolling now
            // happens *inside* BattlePassPage itself (its own flex-1 overflow-y-auto section,
            // with the header/footer as sibling flex items around it) rather than here. This
            // wrapper used to be the scroll container instead — but it's also the element
            // Framer Motion transforms to slide the whole page open/closed, and once a
            // position:fixed descendant's containing block is a transformed ancestor, browsers
            // position it relative to that ancestor's *scrolled* content, not its visible box.
            // BattlePassPage's old fixed header/footer would scroll out of that box's visible
            // area and appear to vanish partway through the close animation whenever the page
            // was scrolled down. Plain overflow:hidden here (from .fixed-safe-screen) is fine
            // now that this element itself never scrolls.
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            // Smooth, natural deceleration (the iOS sheet-presentation curve) instead of the
            // plain easeOut this used to share with the exit — at 0.2s/easeOut this read as a
            // slightly rough, mechanical snap rather than a fluid glide.
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            // Closing uses its own separate curve, opposite in shape from the entrance above: a
            // slow start that builds speed and only really takes off right at the end.
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <BattlePassPage onClose={() => setShowBattlePass(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same reasoning as the Create Game overlay above, for the Leaderboard — same
          slide-up/slide-down motion and easing as Classic 21, with Battle Pass's
          overflowY: auto since the player list scrolls rather than fitting one screen. */}
      <AnimatePresence onExitComplete={onLeaderboardExitComplete}>
        {showLeaderboard && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000", overflowY: "auto" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <Leaderboard onClose={() => setShowLeaderboard(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-run onboarding, Part A: a tall-but-not-full sheet rather than fixed-safe-screen
          like the overlays above — Home's own header/carousel stay visible (but inert: the
          backdrop below blocks every tap to them) above it. 68vh (not 50vh) is what actually
          fits the phone mockup at full height (see PhoneMockupFrame) plus caption/dots/CTA
          without cramming. Same #232328/rounded-t-[28px] as every other popup in the app
          (BottomSheet, DailyStreakPopup, WeeklyRewardPopup). No onClick on the backdrop and no
          drag — the only sanctioned way out before finishing is the "Passer" link inside. */}
      <AnimatePresence onExitComplete={onOnboardingWalkthroughExitComplete}>
        {onboardingPhase === "walkthrough" && (
          <>
            <motion.div
              className="fixed inset-0 z-[59] bg-black/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="fixed inset-x-0 bottom-0 z-[60] rounded-t-[28px] overflow-hidden"
              style={{ height: "68vh", backgroundColor: "#232328", paddingBottom: "env(safe-area-inset-bottom)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
              exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
            >
              <OnboardingWalkthrough onCommencer={() => setOnboardingPhase("tutorial")} onSkip={skipOnboarding} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* First-run onboarding, Part B — same full-screen treatment as Classic 21 above. */}
      <AnimatePresence onExitComplete={onOnboardingTutorialExitComplete}>
        {onboardingPhase === "tutorial" && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <OnboardingTutorial onFinish={finishOnboarding} onSkip={skipOnboarding} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
