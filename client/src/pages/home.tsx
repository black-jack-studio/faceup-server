import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHapticTick } from "@/lib/haptics";
import { useUserStore } from "@/store/user-store";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useOverlayVisibility } from "@/hooks/use-overlay-visibility";
import { useQuery } from "@tanstack/react-query";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import Challenges from "@/components/challenges";
import DailyStreakPopup from "@/components/DailyStreakPopup";
import CreateGameSheet from "@/components/game/CreateGameSheet";
import TableTest from "@/pages/play/table-test";
import FriendsLobby from "@/pages/play/friends-lobby";
import BattlePassPage from "@/pages/battlepass";
import Leaderboard from "@/pages/leaderboard";
import NotificationDot from "@/components/NotificationDot";
import Flame from "@/icons/Flame";
import { useEnteredOnce } from "@/hooks/use-entered-once";
import { formatFullNumber } from "@/lib/formatUtils";

export default function Home() {
  const user = useUserStore((state) => state.user);
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

  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showClassic, setShowClassic] = useState(false);
  const [showBattlePass, setShowBattlePass] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [friendsLobbyTableId, setFriendsLobbyTableId] = useState<string | null>(null);

  const handleOpenBattlePass = () => {
    triggerHapticTick();
    setShowBattlePass(true);
  };

  // Locks the page's own scroll while any overlay is open — Home never unmounts underneath
  // them, so without this a swipe/scroll on the overlay (which doesn't otherwise stop it) fell
  // straight through to Home's scroll position, leaving Home scrolled somewhere else once the
  // overlay closed even though nothing about it was ever visible while that happened.
  // Reference-counted (see the hook) rather than each page hand-rolling its own set/reset:
  // a naive reset-to-"" on cleanup clobbers an *outer* lock still in effect when something
  // nested inside one of these overlays (e.g. a BottomSheet opened from within them) closes
  // first.
  useBodyScrollLock(showCreateGame || showClassic || showBattlePass || showLeaderboard || !!friendsLobbyTableId);

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
    <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000000' }}>
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

          <div className="text-3xl font-light text-white" style={{ opacity: headerBalanceOpacity }}>
            {formatFullNumber(user?.coins ?? 0)}
          </div>

          <div className="flex items-center">
            <div className="relative">
              <XPRing size={50} stroke={5} onClick={handleOpenBattlePass} />
              <NotificationDot show={hasUnclaimedTiers} className="-top-2 -right-2" />
            </div>
          </div>
        </motion.div>
      </header>
      {/* Spacer for the now-fixed header above, so content starts where it used to — grows
          by the same safe-area inset the header's own padding-top just gained. */}
      <div aria-hidden style={{ height: "calc(env(safe-area-inset-top) + 96px)" }} />
      {/* Coins Display */}
      <motion.div style={{ opacity: 1 - headerBalanceOpacity }}>
        <CoinsHero />
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
        <Challenges skipEntrance={skipEntrance} />
      </motion.section>

      <DailyStreakPopup open={showStreakPopup} onClose={() => setShowStreakPopup(false)} />

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
            <TableTest onClose={() => setShowClassic(false)} />
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
    </div>
  );
}
