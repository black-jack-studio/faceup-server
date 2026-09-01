import { useMemo, useState } from "react";
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
];

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

  const entries = useMemo(
    () => AVATAR_CATALOG.filter((entry) => entry.category === activeCategory),
    [activeCategory]
  );

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

        {/* Category tabs */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto mb-8 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.id ? "bg-white/15 text-white" : "text-white/50"
              }`}
              data-testid={`tab-${cat.id}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10">
          {entries.map((entry) => {
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
                className="w-full h-11 rounded-[18px] bg-black hover:bg-black text-white font-medium disabled:opacity-50"
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
