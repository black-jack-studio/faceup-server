import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Gem from "@/icons/Gem";
import BottomSheet from "@/components/BottomSheet";
import {
  AVATAR_CATALOG,
  SKIN_TONES,
  SKIN_TONE_COLORS,
  avatarCost,
  isAvatarFree,
  avatarPurchaseId,
  buildSelectedAvatarId,
  type AvatarCategory,
  type AvatarEntry,
  type SkinTone,
} from "@/data/avatars";

const CATEGORIES: { id: AvatarCategory; label: string }[] = [
  { id: "people", label: "People" },
  { id: "animals", label: "Animals" },
  { id: "fantasy", label: "Fantasy" },
  { id: "legendary", label: "Legendary" },
  { id: "mystery", label: "Mystery" },
];

// Every category's own slice of the catalog, in display order — the grid below renders these
// as one continuous scroll (all categories stacked, not just the active one) so the top tabs
// can act as a scrollspy: which one lights up follows scroll position instead of gating what's
// rendered. Computed once at module scope since AVATAR_CATALOG/CATEGORIES are both static.
const SECTIONS = CATEGORIES.map((cat) => ({
  ...cat,
  entries: AVATAR_CATALOG.filter((entry) => entry.category === cat.id),
}));

interface OwnedAvatarsResponse {
  purchasedAvatars: string[];
}

// A tone avatar's currently selected head is highlighted regardless of which tone the swatch
// is browsing — the tone picker previews colors, it doesn't change what's "yours" until tapped.
function selectedBaseId(selectedAvatarId: string | null | undefined): string | undefined {
  if (!selectedAvatarId) return undefined;
  return selectedAvatarId.includes("::") ? selectedAvatarId.split("::")[0] : selectedAvatarId;
}

interface AvatarsProps {
  // Passed when rendered as Profile's slide-up overlay (see profile.tsx), same pattern as
  // BattlePassPage's onClose — lets the close animation play with Profile already mounted
  // behind it. Falls back to routing to /profile when reached directly as its own route.
  onClose?: () => void;
}

export default function Avatars({ onClose }: AvatarsProps = {}) {
  const [, navigate] = useLocation();
  const close = onClose ?? (() => navigate("/profile"));
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("people");
  const [confirmEntry, setConfirmEntry] = useState<AvatarEntry | null>(null);
  const [tone, setTone] = useState<SkinTone>(() => {
    const id = user?.selectedAvatarId;
    if (id?.includes("::")) {
      const [, savedTone] = id.split("::") as [string, SkinTone];
      if (SKIN_TONES.includes(savedTone)) return savedTone;
    }
    return "medium";
  });

  const { data: ownedData } = useQuery<OwnedAvatarsResponse>({
    queryKey: ["/api/user/owned-avatars"],
    enabled: !!user,
  });
  const purchasedAvatars = ownedData?.purchasedAvatars ?? [];

  const purchaseMutation = useMutation({
    mutationFn: async (avatarId: string) => {
      const response = await apiRequest("POST", "/api/avatars/purchase", { avatarId });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to purchase avatar");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/owned-avatars"] });
      // Gems live in the Zustand user store, not react-query -- invalidating a query key
      // here did nothing, since nothing reads "/api/user/profile" through useQuery. The
      // server did debit the gems correctly, but the displayed balance (top bar, profile,
      // this page's own header) never refreshed. Same loadUser() every other gem/coin-
      // spending spot uses (shop.tsx, game.tsx, DailyStreakPopup.tsx, ...).
      useUserStore.getState().loadUser();
    },
    onError: (error: any) => {
      toast({
        title: "Couldn't buy that avatar",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const selectedId = selectedBaseId(user?.selectedAvatarId);

  // Measured so section headings know how much to offset scrollIntoView by (via scroll-margin-
  // top below) — otherwise a tapped tab would land a section's top right underneath the sticky
  // header/tabs bar instead of just below it.
  const stickyRef = useRef<HTMLDivElement>(null);
  const [stickyHeight, setStickyHeight] = useState(0);
  useEffect(() => {
    const measure = () => setStickyHeight(stickyRef.current?.offsetHeight ?? 0);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Scrollspy: which section is "current" follows scroll position instead of gating what's
  // rendered (see SECTIONS above) — the observed band starts right below the sticky bar and
  // covers the next 30% of the viewport, so whichever section's top has just cleared the sticky
  // bar is the one that lights up, same idea as a typical sticky-nav scrollspy.
  const sectionRefs = useRef<Partial<Record<AvatarCategory, HTMLDivElement | null>>>({});
  useEffect(() => {
    if (!stickyHeight) return;
    const observer = new IntersectionObserver(
      (observedEntries) => {
        const visible = observedEntries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        const id = (topMost.target as HTMLElement).dataset.category as AvatarCategory | undefined;
        if (id) setActiveCategory(id);
      },
      { rootMargin: `-${stickyHeight}px 0px -70% 0px`, threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [stickyHeight]);

  // Keeps the tab row's own horizontal scroll in sync with whichever category is active, no
  // matter how it got that way -- a direct tap (see the tab's own onClick) or the scrollspy
  // above catching up as the grid scrolls past a new section. Without this, scrolling down into
  // Legendary/Mystery left their tab sitting off-screen, cut off, since only a tap used to slide
  // the row over.
  const tabRefs = useRef<Partial<Record<AvatarCategory, HTMLButtonElement | null>>>({});
  useEffect(() => {
    tabRefs.current[activeCategory]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeCategory]);

  const selectEntry = (entry: AvatarEntry) => {
    updateUser({ selectedAvatarId: buildSelectedAvatarId(entry, tone) });
  };

  const handleClick = (entry: AvatarEntry) => {
    const purchaseId = avatarPurchaseId(entry);
    const owned = isAvatarFree(entry) || purchasedAvatars.includes(purchaseId);

    if (owned) {
      selectEntry(entry);
      return;
    }

    const cost = avatarCost(entry);
    if (!user || (user.gems || 0) < cost) {
      toast({
        title: "Not enough gems",
        description: `You need ${cost} gems to unlock this avatar.`,
        variant: "destructive",
      });
      return;
    }

    // A single tap used to purchase immediately -- easy to spend gems on an avatar by
    // accident. Now it just opens a confirm sheet; the actual purchase only fires once the
    // player taps "Unlock" there (see the BottomSheet below).
    setConfirmEntry(entry);
  };

  const confirmPurchase = () => {
    if (!confirmEntry) return;
    const entry = confirmEntry;
    const purchaseId = avatarPurchaseId(entry);
    purchaseMutation.mutate(purchaseId, {
      onSuccess: () => selectEntry(entry),
    });
    setConfirmEntry(null);
  };

  const cycleTone = () => {
    const currentIndex = SKIN_TONES.indexOf(tone);
    setTone(SKIN_TONES[(currentIndex + 1) % SKIN_TONES.length]);
  };

  return (
    <div className="min-h-screen text-white pb-24" style={{ backgroundColor: "#000000" }}>
      {/* Header + category tabs stay pinned to the top while the grid below scrolls underneath —
          sticky rather than fixed since the scrolling element here is profile.tsx's own
          motion.div (overflowY: auto on .fixed-safe-screen), which Framer Motion also applies a
          transform to for the slide animation; a fixed child of that would anchor to its
          scrolled content box instead of the visible viewport (see BattlePassPage's header/
          footer for the same trap). Sticky has no such issue -- it just sticks to its nearest
          scrolling ancestor's scrollport, transform or not. */}
      {/* pb-3 is the tab row's only bottom spacing now (its own mb-8 was dropped -- padding
          here doesn't let a child's margin collapse through it, so the two were stacking into a
          much bigger gap than either looked like alone). Real padding, not margin, so it's part
          of this box's own painted background -- without it, scrolled-up content's top row
          butts straight against the tabs with no breathing room, reading as clipped/hidden
          underneath rather than scrolled below a clean bar. */}
      <div ref={stickyRef} className="sticky top-0 z-10 pb-3" style={{ backgroundColor: "#000000" }}>
        <div className="max-w-md mx-auto px-6">
          {/* Header — no entrance animation: this page now opens/closes as a whole via the
              slide overlay in profile.tsx, so its own content shouldn't also fade/slide in on
              top of that. */}
          <div className="flex items-center justify-between mb-6 pt-4">
            <button
              onClick={close}
              className="p-2 rounded-full transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Avatars</h1>
            <button
              onClick={cycleTone}
              className="w-10 h-10 rounded-full border-2 border-white/20 transition-transform active:scale-90"
              style={{ backgroundColor: SKIN_TONE_COLORS[tone] }}
              data-testid="button-cycle-skin-tone"
              aria-label="Change skin tone"
            />
          </div>

          {/* Category tabs — left-aligned (not centered) so with 5 categories there's always a
              consistent starting point: People fully visible, Legendary/Mystery trailing off
              the edge as a hint there's more to scroll to, instead of justify-center cutting
              off People on the left and Mystery on the right from the very first render.
              Highlighted tab follows scroll position (see the IntersectionObserver above), and
              the row's own horizontal scroll follows right along with it (see the tabRefs effect
              above) whether that happened via a tap or the grid scrolling past a new section on
              its own. Tapping one additionally scrolls the grid down to its section. */}
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                ref={(el) => { tabRefs.current[cat.id] = el; }}
                onClick={() => {
                  setActiveCategory(cat.id);
                  sectionRefs.current[cat.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id ? "bg-white/15 text-white" : "text-white/50"
                }`}
                data-testid={`tab-${cat.id}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6">
        {/* Every category's section, stacked in one continuous scroll — see SECTIONS above and
            the IntersectionObserver that watches these against the sticky tabs bar. */}
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            ref={(el) => { sectionRefs.current[section.id] = el; }}
            data-category={section.id}
            style={{ scrollMarginTop: stickyHeight }}
            className="mb-10 last:mb-0"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-10">
              {section.entries.map((entry) => {
                const image = entry.kind === "tone" ? entry.images[tone] : entry.image;
                const entryKey = entry.kind === "tone" ? entry.baseId : entry.id;
                const purchaseId = avatarPurchaseId(entry);
                const free = isAvatarFree(entry);
                const owned = free || purchasedAvatars.includes(purchaseId);
                const isSelected = selectedId === entryKey;
                const isPurchasing = purchaseMutation.isPending && purchaseMutation.variables === purchaseId;

                return (
                  <motion.button
                    key={entryKey}
                    onClick={() => handleClick(entry)}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-2"
                    data-testid={`avatar-option-${entryKey}`}
                  >
                    <div className="relative w-32 h-32">
                      <img
                        src={image}
                        alt={entry.name}
                        className={`w-full h-full object-contain rounded-2xl transition-all ${
                          !owned ? "opacity-60" : ""
                        } ${isSelected ? "ring-2 ring-white" : ""}`}
                      />
                      {isPurchasing && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {!owned && (
                      <div className="flex items-center gap-1">
                        <Gem className="w-4 h-4" />
                        <span className="text-sm font-semibold text-white">{avatarCost(entry)}</span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Same bottom sheet style as the rest of the app (e.g. "Leave the table?" in
          friends-lobby.tsx/table-test.tsx) -- a single tap used to spend gems immediately,
          which was easy to trigger by accident. */}
      <BottomSheet
        open={!!confirmEntry}
        onClose={() => setConfirmEntry(null)}
        height="auto"
        contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
      >
        {confirmEntry && (
          <>
            <img
              src={confirmEntry.kind === "tone" ? confirmEntry.images[tone] : confirmEntry.image}
              alt={confirmEntry.name}
              className="w-24 h-24 object-contain rounded-2xl"
            />
            <h2 className="mt-3 mb-6 text-xl font-bold text-white">Unlock {confirmEntry.name}?</h2>
            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={confirmPurchase}
                disabled={purchaseMutation.isPending}
                className="w-full h-11 rounded-[18px] bg-white hover:bg-gray-100 text-black font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
                data-testid="button-confirm-purchase-avatar"
              >
                {purchaseMutation.isPending ? (
                  "Unlocking…"
                ) : (
                  <>
                    <Gem className="w-4 h-4" />
                    <span>{avatarCost(confirmEntry)}</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setConfirmEntry(null)}
                disabled={purchaseMutation.isPending}
                className="w-full h-11 rounded-[18px] bg-[#232227]/40 hover:bg-[#232227]/60 text-white font-medium disabled:opacity-50"
                data-testid="button-cancel-purchase-avatar"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}
