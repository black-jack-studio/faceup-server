import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Settings } from "lucide-react";
import { BiSolidPencil } from "react-icons/bi";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Gem, User } from "@/icons";
import CoinsBadge from "@/components/CoinsBadge";
import { getAvatarById, getDefaultAvatar } from "@/data/avatars";
import { UserCardBack, sortCardBacksByRarity } from "@/lib/card-backs";
import AnimatedModal from "@/components/AnimatedModal";
import OffsuitCard from "@/components/PlayingCard";
import AddFriendModal from "@/components/AddFriendModal";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import keyIcon from "@assets/key_3d_1757364033839.png";
import shieldIcon from "@assets/shield_3d_1757364125393.png";
import signOutIcon from "@assets/outbox_tray_3d_1757364387965.png";
import barChartIcon from "@assets/bar_chart_3d_1757364609374.png";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import chartIcon from "@assets/chart_increasing_3d_1757365668417.png";
import bullseyeIcon from "@assets/bullseye_3d_1757365889861.png";
import spadeIcon from "@assets/spade_suit_3d_1757365941334.png";
import bicepsIcon from "@assets/flexed_biceps_3d_default.png";
import { RankBadge } from "@/ranks/RankBadge";
import Avatars from "@/pages/avatars";

export default function Profile() {
  const [, navigate] = useLocation();
  const [isCardBackDialogOpen, setIsCardBackDialogOpen] = useState(false);
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false);
  const [showAvatars, setShowAvatars] = useState(false);
  const [selectedCardBackId, setSelectedCardBackId] = useState<string | null>(null);
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats = {} } = useQuery({
    queryKey: ["/api/stats/summary"],
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Query pour récupérer la collection de dos de cartes
  const { data: userCardBacks = [], isLoading: isLoadingCardBacks } = useQuery({
    queryKey: ["/api/user/card-backs"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  // Query pour le nombre total de dos de cartes existant dans le jeu (pas seulement ceux
  // possédés) — utilisé pour le compteur "X/Y" du sélecteur.
  const { data: allCardBacks = [] } = useQuery({
    queryKey: ["/api/card-backs"],
    enabled: !!user,
    select: (response: any) => response?.data || [],
  });

  // Query pour récupérer le dos de carte sélectionné
  const { data: selectedCardBack } = useQuery({
    queryKey: ["/api/user/selected-card-back"],
    enabled: !!user,
    select: (response: any) => response?.data || null,
  });

  // Query pour récupérer la liste d'amis — polled rather than left to the default 5min
  // staleTime so an accepted friend request shows up here without a full app relaunch, since
  // the acceptance happens on the *other* person's device with nothing to push-invalidate
  // this client's cache.
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery<any[]>({
    queryKey: ["/api/friends"],
    enabled: !!user,
    select: (response: any) => response?.friends || [],
    refetchInterval: 15000,
  });

  // Mutation pour changer le dos de carte sélectionné
  const updateSelectedCardBackMutation = useMutation({
    mutationFn: async (cardBackId: string) => {
      return await apiRequest("PATCH", "/api/user/selected-card-back", { 
        cardBackId 
      });
    },
    onSuccess: (_, cardBackId) => {
      // Mettre à jour le store local
      updateUser({ selectedCardBackId: cardBackId });
      
      // Invalider les caches
      queryClient.invalidateQueries({ queryKey: ["/api/user/selected-card-back"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      setSelectedCardBackId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update card back",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setSelectedCardBackId(null);
    },
  });

  const handleSelectCardBack = (cardBackId: string) => {
    const currentSelectedId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId;
    if (cardBackId === currentSelectedId) return;
    
    setSelectedCardBackId(cardBackId);
    updateSelectedCardBackMutation.mutate(cardBackId);
  };

  const handleCardBackModalSelect = (cardBackId: string) => {
    const currentSelectedId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId;
    
    // Handle default card back selection
    if (cardBackId === 'default') {
      if (!currentSelectedId || currentSelectedId === 'default') return;
      setSelectedCardBackId('default');
      updateSelectedCardBackMutation.mutate('default');
      setIsCardBackDialogOpen(false);
      return;
    }
    
    if (cardBackId === currentSelectedId) return;
    
    setSelectedCardBackId(cardBackId);
    updateSelectedCardBackMutation.mutate(cardBackId);
    setIsCardBackDialogOpen(false); // Fermer le modal après sélection
  };

  // Same lock as Home uses for its own overlays (Battle Pass, Classic 21, ...) — Profile stays
  // mounted underneath the Avatars overlay the whole time, so without this a swipe/scroll on
  // it fell straight through to Profile's own scroll position.
  useEffect(() => {
    if (!showAvatars) return;
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
  }, [showAvatars]);

  const currentLevel = user?.level ?? 1;
  const currentLevelXP = user?.currentLevelXP ?? 0;
  const levelProgress = (currentLevelXP / 100) * 100; // Progress percentage
  const xpToNextLevel = 100 - currentLevelXP;
  
  const currentAvatar = user?.selectedAvatarId ? 
    getAvatarById(user.selectedAvatarId) : 
    getDefaultAvatar();
    
  // Obtenir le dos de carte actuellement sélectionné
  const currentCardBackId = selectedCardBack?.selectedCardBackId || user?.selectedCardBackId;
  const currentCardBack = currentCardBackId && currentCardBackId !== 'default' 
    ? userCardBacks.find((ucb: UserCardBack) => ucb.cardBack?.id === currentCardBackId)?.cardBack
    : null;

  // Shared look for the Friends/Emotes/Card back quick-access rows below the username —
  // thin outline, transparent fill, pill-ish radius (matches the reference Anatole sent,
  // 2026-08-25), as opposed to the filled black cards used elsewhere on this page. Fixed
  // height (not just matching padding) so all four stay pixel-identical regardless of content
  // — Card back's stacked-cards graphic was taller than Emotes' single emoji glyph, which grid
  // auto-sizing stretched into a visibly bigger row than Friends/Add Friends above it.
  // No hover: — same iOS WebView double-tap issue as everywhere else on this page (a tap can
  // trigger :hover first, and the real click then needs a second tap); active: + whileTap
  // give tactile feedback without it.
  // Rank's 28px radius is on a ~68px-tall row (28/68 ≈ 0.41 of its height) — the same 28px on
  // these shorter h-14 (56px) rows is exactly half their height, which is a full stadium/pill
  // shape rather than a rounded rectangle. Scaling proportionally (~0.41 × 56 ≈ 23px) keeps the
  // same rounding "feel" as Rank without these turning into pills.
  // border-2, matching the Game Stats tiles' own border thickness below.
  const quickAccessRowClass = "flex items-center gap-2.5 h-14 rounded-[23px] border-2 border-white/15 active:bg-white/5 transition-colors px-4 w-full text-left";
  const quickAccessCtaClass = "flex items-center justify-center h-14 rounded-[23px] border-2 border-white/60 active:bg-white/5 transition-colors px-4 w-full";

  // z-10 is plenty to sit above Profile's own content — it doesn't need to (and shouldn't)
  // outrank the Settings overlay that slides over this same page at z-40 (see App.tsx). At
  // z-[9999] this button rendered on top of that overlay instead of underneath it, which is
  // why it visibly kept showing up on the Settings screen itself.
  const SettingsButton = () => {
    return (
      <div
        className="absolute top-6 right-6 z-10"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
        }}
      >
        <button
          onClick={() => navigate("/settings")}
          className="p-3 rounded-full bg-transparent border-none cursor-pointer"
          style={{
            padding: '12px',
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer'
          }}
          data-testid="button-settings"
        >
          <Settings 
            className="w-6 h-6 text-gray-400" 
            style={{
              width: '24px',
              height: '24px',
              color: '#9CA3AF'
            }}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="text-white p-6 overflow-hidden relative" style={{ backgroundColor: '#000000' }}>
      <SettingsButton />
      <div className="max-w-md mx-auto">

        {/* User Info */}
        <motion.div
          className="text-center mb-8 pt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {/* Avatar */}
          <div className="flex items-center justify-center mb-3">
            {/* Avatar Selection */}
            <div className="relative inline-block">
              <button
                className="group relative"
                data-testid="button-change-avatar"
                onClick={() => setShowAvatars(true)}
              >
                <div className="w-28 h-28 rounded-3xl bg-black flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-200">
                  {currentAvatar ? (
                    <img
                      src={currentAvatar.image}
                      alt={currentAvatar.name}
                      className="w-20 h-20 object-contain rounded-2xl"
                    />
                  ) : (
                    <span className="text-4xl font-black text-white">
                      {user?.username?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-lg group-hover:scale-110 transition-transform">
                  <BiSolidPencil className="w-3 h-3 text-[#15161A]" />
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center mb-2">
            <h2 className="text-2xl font-bold text-white" data-testid="profile-username">
              {user?.username}
            </h2>
          </div>
          
          
        </motion.div>

        {/* Friends / Add Friends / Emotes / Card backs / Rank progress — quick-access rows.
            Everything below the username was restructured to match the reference screenshot
            Anatole sent (2026-08-25): thin-outline pill rows instead of filled black cards,
            Friends+Add Friends first, then Emotes+Card backs, then Rank progress full-width. */}
        <motion.section
          className="mb-8 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              onClick={() => navigate("/friends")}
              className={quickAccessRowClass}
              whileTap={{ scale: 0.98 }}
              data-testid="button-friends-section"
            >
              <img src={bicepsIcon} alt="" className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-extrabold text-sm leading-none" data-testid="text-friends-count">
                  {isLoadingFriends ? '–' : friends.length}
                </p>
                <p className="text-white/45 text-[10px] font-semibold mt-0.5">Friends</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/35 flex-shrink-0" />
            </motion.button>

            <motion.button
              onClick={() => setIsAddFriendModalOpen(true)}
              className={quickAccessCtaClass}
              whileTap={{ scale: 0.98 }}
              data-testid="button-add-friend"
            >
              <span className="text-white font-extrabold text-[11px] tracking-[0.06em]">ADD FRIENDS</span>
            </motion.button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Emotes: new row, no wardrobe built yet (no assets/unlock system to back it) —
                surfaces the entry point without pretending a feature exists that doesn't. */}
            <motion.button
              onClick={() => toast({ title: "Emotes", description: "Coming soon." })}
              className={quickAccessRowClass}
              whileTap={{ scale: 0.98 }}
              data-testid="button-emotes-section"
            >
              <span className="text-base flex-shrink-0">👋</span>
              <div className="flex-1 min-w-0">
                {/* Hardcoded 0/0 — no emotes exist yet (no assets/unlock system). Once real
                    ones ship, swap in the same owned/total pattern as Card backs below. */}
                <p className="text-white font-extrabold text-sm leading-none">0/0</p>
                <p className="text-white/45 text-[10px] font-semibold mt-0.5">Emotes</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/35 flex-shrink-0" />
            </motion.button>

            <motion.button
              onClick={() => setIsCardBackDialogOpen(true)}
              className={quickAccessRowClass}
              whileTap={{ scale: 0.98 }}
              data-testid="button-card-back-selector"
            >
              {/* OffsuitCard ignores its wrapper's size (it renders at each size preset's own
                  fixed px width/height, not 100%/100%) — even "xs" (40x58) is too tall for this
                  now-h-14 row, so each card is scaled down further with a CSS transform on top
                  of the "xs" preset, centered in a small fixed box. Two, fanned, to read as a
                  card-back collection rather than a single stray card.
                  radius={8}: "xs"'s own preset radius (12) is a 12/40 = 0.3 corner-to-width
                  ratio, notably rounder than the "sm" cards actually seen everywhere else in
                  the game (client/src/components/game/card.tsx defaults to "sm", radius 16/80 =
                  0.2) — these read as visibly different card shapes side by side otherwise.
                  8 = 0.2 × 40, matching "sm"'s ratio at "xs"'s width (same override mechanism
                  HandCards/SplitHandsDisplay already use to keep mixed sizes consistent). */}
              <div className="relative w-8 h-8 flex-shrink-0">
                <div className="absolute left-0 top-1 origin-top-left" style={{ transform: "scale(0.55) rotate(-6deg)" }}>
                  <OffsuitCard
                    rank="A"
                    suit="spades"
                    faceDown={true}
                    size="xs"
                    radius={8}
                    cardBackUrl={currentCardBack?.imageUrl || null}
                  />
                </div>
                <div className="absolute left-2 top-0 origin-top-left" style={{ transform: "scale(0.55) rotate(6deg)" }}>
                  <OffsuitCard
                    rank="A"
                    suit="spades"
                    faceDown={true}
                    size="xs"
                    radius={8}
                    cardBackUrl={currentCardBack?.imageUrl || null}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                {/* +1/+1: the always-owned default design, same counting as the modal's own
                    badge below (userCardBacks.length + 1 / allCardBacks.length + 1). */}
                <p className="text-white font-extrabold text-sm leading-none">
                  {userCardBacks.length + 1}/{allCardBacks.length + 1}
                </p>
                <p className="text-white/45 text-[10px] font-semibold mt-0.5">Card backs</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/35 flex-shrink-0" />
            </motion.button>
          </div>

          <RankBadge wins={(user as any)?.seasonHandsWon || 0} />
        </motion.section>

        <Dialog open={isAddFriendModalOpen} onOpenChange={setIsAddFriendModalOpen}>
          <DialogContent className="bg-ink border-white/20 rounded-3xl">
            <DialogTitle className="text-white">Add Friend</DialogTitle>
            <AddFriendModal onClose={() => setIsAddFriendModalOpen(false)} />
          </DialogContent>
        </Dialog>

        <AnimatedModal
          open={isCardBackDialogOpen}
          onClose={() => setIsCardBackDialogOpen(false)}
          className="bg-white/5 border border-white/10 rounded-3xl p-6 max-w-md w-full backdrop-blur-xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5">
              <span className="text-white text-sm font-bold">
                {userCardBacks.length + 1}/{allCardBacks.length + 1}
              </span>
            </div>
            <h2 className="text-white font-bold text-lg text-center flex-1">Select Card Back</h2>
            <div className="w-16"></div> {/* Spacer pour centrer le titre */}
          </div>

              {isLoadingCardBacks ? (
                <div className="flex justify-center items-center py-12">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-accent-green rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 max-h-80 overflow-y-auto p-2">
                  {/* Option par défaut */}
                  {(() => {
                    const isSelected = !(selectedCardBack?.selectedCardBackId || user?.selectedCardBackId) || (selectedCardBack?.selectedCardBackId || user?.selectedCardBackId) === 'default';
                    return (
                      <motion.button
                        key="default"
                        className={`relative p-0.5 rounded-xl transition-all aspect-[3/4] flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#60A5FA]/30 border-2 border-[#60A5FA] shadow-[0_0_0_2px_rgba(96,165,250,0.5)] ring-2 ring-[#60A5FA]/50 ring-offset-2 ring-offset-gray-900' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                        onClick={() => handleCardBackModalSelect('default')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid={`modal-card-back-default`}
                      >
                        {/* Use the same OffsuitCard component for consistency */}
                        <div className="w-full h-full rounded-lg flex items-center justify-center">
                          <OffsuitCard
                            rank="A"
                            suit="spades"
                            faceDown={true}
                            size="sm"
                            cardBackUrl={null}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </motion.button>
                    );
                  })()}
                  
                  {/* Cartes achetées */}
                  {sortCardBacksByRarity(userCardBacks).map((userCardBack: UserCardBack) => {
                    const isSelected = 
                      (selectedCardBack?.selectedCardBackId || user?.selectedCardBackId) === userCardBack.cardBack.id;
                    
                    return (
                      <motion.button
                        key={userCardBack.cardBack.id}
                        className={`relative p-0.5 rounded-xl transition-all aspect-[3/4] flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#60A5FA]/30 border-2 border-[#60A5FA] shadow-[0_0_0_2px_rgba(96,165,250,0.5)] ring-2 ring-[#60A5FA]/50 ring-offset-2 ring-offset-gray-900' 
                            : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }`}
                        onClick={() => handleCardBackModalSelect(userCardBack.cardBack.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        data-testid={`modal-card-back-${userCardBack.cardBack.id}`}
                      >
                        {/* Use the same OffsuitCard component for consistency */}
                        <div className="w-full h-full rounded-lg flex items-center justify-center">
                          <OffsuitCard
                            rank="A"
                            suit="spades"
                            faceDown={true}
                            size="sm"
                            cardBackUrl={userCardBack.cardBack.imageUrl}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
        </AnimatedModal>

        {/* Stats Cards */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
            <img src={barChartIcon} alt="Bar Chart" className="w-6 h-6 mr-3" />
            Game Stats
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black rounded-xl p-5 border-2 border-white/10 flex flex-col items-center justify-center text-center">
              <img src={trophyIcon} alt="Trophy" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-white mb-2" data-testid="stat-wins">
                {(stats as any)?.handsWon || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Hands Won</p>
            </div>
            
            <div className="bg-black rounded-xl p-5 border-2 border-white/10 flex flex-col items-center justify-center text-center">
              <img src={chartIcon} alt="Chart" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-white mb-2" data-testid="stat-winrate">
                {(stats as any)?.handsWon ? (((stats as any).handsWon / ((stats as any).handsPlayed || 1)) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-sm text-white/80 font-semibold">Win Rate</p>
            </div>
            
            <div className="bg-black rounded-xl p-5 border-2 border-white/10 flex flex-col items-center justify-center text-center">
              <img src={bullseyeIcon} alt="Bullseye" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-white mb-2" data-testid="stat-games-played">
                {(stats as any)?.handsPlayed || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Total Games Played</p>
            </div>
            
            <div className="bg-black rounded-xl p-5 border-2 border-white/10 flex flex-col items-center justify-center text-center">
              <img src={spadeIcon} alt="Spade" className="w-8 h-8 mb-3" />
              <p className="text-3xl font-black text-white mb-2" data-testid="stat-blackjacks">
                {(stats as any)?.blackjacks || 0}
              </p>
              <p className="text-sm text-white/80 font-semibold">Blackjacks</p>
            </div>
          </div>
        </motion.section>

      </div>

      {/* Avatars overlay — same slide up/down as Home's Battle Pass/Classic 21/Play with
          Friends overlays (see home.tsx): entrance eases in over 0.32s, exit eases out over
          0.28s with a slow-start-then-fast curve. overflowY: auto because Avatars is a
          genuinely tall scrolling grid, same reason Battle Pass needed it — .fixed-safe-screen's
          overflow:hidden would otherwise trap everything below the fold. */}
      <AnimatePresence>
        {showAvatars && (
          <motion.div
            className="fixed-safe-screen z-[60]"
            style={{ background: "#000000", overflowY: "auto" }}
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { duration: 0.32, ease: [0.32, 0.72, 0, 1] } }}
            exit={{ y: "100%", transition: { duration: 0.28, ease: [0.55, 0, 0.85, 0.15] } }}
          >
            <Avatars onClose={() => setShowAvatars(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}