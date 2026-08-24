import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";
import { useUserStore } from "@/store/user-store";
import { useQuery } from "@tanstack/react-query";
import CoinsHero from "@/components/CoinsHero";
import XPRing from "@/components/XPRing";
import ModesCarousel from "@/components/ModesCarousel";
import HomeLeaderboard from "@/components/HomeLeaderboard";
import Challenges from "@/components/challenges";
import DailyStreakPopup from "@/components/DailyStreakPopup";
import CreateGameSheet from "@/components/game/CreateGameSheet";
import TableTest from "@/pages/play/table-test";
import BattlePassPage from "@/pages/battlepass";
import { useLocation } from "wouter";
import NotificationDot from "@/components/NotificationDot";
import Flame from "@/icons/Flame";
import { useEnteredOnce } from "@/hooks/use-entered-once";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [, navigate] = useLocation();
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

  // Drives the notification dot on the flame — same query the popup itself reads once open,
  // and the one BottomNav reads to light up the Home tab too.
  const { data: streakStatus } = useQuery<{ claimableReward: unknown | null }>({
    queryKey: ["/api/daily-streak"],
  });
  const [showStreakPopup, setShowStreakPopup] = useState(false);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showClassic, setShowClassic] = useState(false);
  const [showBattlePass, setShowBattlePass] = useState(false);

  const handleOpenBattlePass = () => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    }
    setShowBattlePass(true);
  };

  // Locks the page's own scroll while either overlay is open — Home never unmounts underneath
  // them, so without this a swipe/scroll on the overlay (which doesn't otherwise stop it) fell
  // straight through to Home's scroll position, leaving Home scrolled somewhere else once the
  // overlay closed even though nothing about it was ever visible while that happened.
  // body{overflow:hidden} alone (what AnimatedModal's popups get away with) turned out not
  // enough here — Classic 21 is tall/dense enough that iOS WebView still let touches drag the
  // page underneath despite it. Pinning body with position:fixed at its current scroll offset
  // is the more forceful, iOS-reliable version of the same lock: there's no scrollable
  // position left for a touch to drag, so restoring the exact offset on close is what puts
  // Home back where it was instead of leaving it at 0.
  useEffect(() => {
    if (!showCreateGame && !showClassic && !showBattlePass) return;
    const scrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [showCreateGame, showClassic, showBattlePass]);

  const claimedTiers = (claimedTiersData as any)?.freeTiers || [];

  const currentLevel = user?.level ?? 1;
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const levelProgress = (currentLevelXP / 100) * 100; // Progress percentage
  const xpToNextLevel = 100 - currentLevelXP;
  // Only show notification if the current level specifically hasn't been claimed
  // This ensures it only appears when the user just reached this level.
  // Gated on !isLoadingClaimedTiers: before that query resolves, claimedTiers defaults to
  // [], which made `!claimedTiers.includes(currentLevel)` true for EVERY level > 1 — the dot
  // flashed on for anyone past level 1 on every cold start, then vanished once the real
  // (already-claimed) data arrived a moment later.
  const hasUnclaimedTiers = !isLoadingClaimedTiers && currentLevel > 1 && !claimedTiers.includes(currentLevel);

  return (
    <div className="min-h-screen text-white overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Header with level/gems and XP ring */}
      <header className="px-6 pt-12 pb-6">
        <motion.div
          className="flex items-center justify-between"
          initial={skipEntrance ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
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

          <div className="flex items-center">
            <div className="relative">
              <XPRing size={50} stroke={5} onClick={handleOpenBattlePass} />
              <NotificationDot show={hasUnclaimedTiers} className="-top-2 -right-2" />
            </div>
          </div>
        </motion.div>
      </header>
      {/* Coins Display */}
      <CoinsHero />
      {/* Game Modes Carousel */}
      <ModesCarousel
        onSelectFriends={() => setShowCreateGame(true)}
        onSelectClassic={() => setShowClassic(true)}
        skipEntrance={skipEntrance}
      />
      {/* Leaderboard */}
      <motion.section
        className="px-6 mb-8"
        initial={skipEntrance ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <HomeLeaderboard skipEntrance={skipEntrance} />
      </motion.section>
      {/* Daily Challenges */}
      <motion.section
        className="px-6 mb-8"
        initial={skipEntrance ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Challenges skipEntrance={skipEntrance} />
      </motion.section>

      <DailyStreakPopup open={showStreakPopup} onClose={() => setShowStreakPopup(false)} />

      {/* Shown in place instead of routing to /play/friends — Home stays mounted underneath
          the sheet the whole time, so it slides up over (and back down off) the actual Home
          content instead of a route swap leaving a black gap while neither page is in place. */}
      <AnimatePresence>
        {showCreateGame && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <CreateGameSheet
              onBack={() => setShowCreateGame(false)}
              onEnterLobby={(tableId) => {
                setShowCreateGame(false);
                navigate(`/play/friends-lobby/${tableId}`);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same reasoning as the Create Game overlay above, for Classic 21. */}
      <AnimatePresence>
        {showClassic && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <TableTest onClose={() => setShowClassic(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same reasoning as the Create Game overlay above, for the Battle Pass. */}
      <AnimatePresence>
        {showBattlePass && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.2, ease: "easeOut" } }}
            // Closing eases in instead of matching the entrance's easeOut: a slow start that
            // builds speed and only really takes off right at the end, instead of the abrupt
            // full-speed-immediately snap easeOut gave it here.
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <BattlePassPage onClose={() => setShowBattlePass(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
