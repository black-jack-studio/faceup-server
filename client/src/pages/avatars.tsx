import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Gem from "@/icons/Gem";
import {
  AVATAR_CATALOG,
  SKIN_TONES,
  SKIN_TONE_COLORS,
  isAvatarFree,
  avatarPurchaseId,
  buildSelectedAvatarId,
  type AvatarCategory,
  type AvatarEntry,
  type SkinTone,
} from "@/data/avatars";

const AVATAR_COST = 10;

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

export default function Avatars() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const updateUser = useUserStore((state) => state.updateUser);

  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("people");
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
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
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

    if (!user || (user.gems || 0) < AVATAR_COST) {
      toast({
        title: "Not enough gems",
        description: `You need ${AVATAR_COST} gems to unlock this avatar.`,
        variant: "destructive",
      });
      return;
    }

    purchaseMutation.mutate(purchaseId, {
      onSuccess: () => selectEntry(entry),
    });
  };

  const cycleTone = () => {
    const currentIndex = SKIN_TONES.indexOf(tone);
    setTone(SKIN_TONES[(currentIndex + 1) % SKIN_TONES.length]);
  };

  return (
    <div className="min-h-screen text-white pb-24" style={{ backgroundColor: "#000000" }}>
      <div className="max-w-md mx-auto px-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6 pt-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => navigate("/profile")}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
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
        </motion.div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 overflow-x-auto mb-8 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
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
                    } ${isSelected ? "ring-2 ring-[#38bdf8]" : ""}`}
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
                    <span className="text-sm font-semibold text-[#38bdf8]">{AVATAR_COST}</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
