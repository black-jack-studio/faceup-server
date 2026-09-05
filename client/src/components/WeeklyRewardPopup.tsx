import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import BottomSheet from "@/components/BottomSheet";
import Gem from "@/icons/Gem";
import { apiRequest } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import trophyIcon from "@assets/trophy_3d_1757365029428.png";
import medal1 from "@assets/1st-place-medal_1758416155392.png";
import medal2 from "@assets/2nd-place-medal_1758416155392.png";
import medal3 from "@assets/3rd-place-medal_1758416155392.png";

const MEDALS: Record<number, string> = { 1: medal1, 2: medal2, 3: medal3 };

interface PendingReward {
  rank: number;
  gemsAwarded: number;
}

interface WeeklyRewardPopupProps {
  open: boolean;
  onClose: () => void;
  pendingReward: PendingReward | null;
}

// Slides up from the bottom exactly like DailyStreakPopup — the previous week's leaderboard is
// over by the time this can even show (see getPendingWeeklyXpReward), so unlike that popup
// there's never a "come back later" state here, only "claim" or (once claimed) nothing at all,
// since the button that opens this unmounts itself the moment the reward's gone.
export default function WeeklyRewardPopup({ open, onClose, pendingReward }: WeeklyRewardPopupProps) {
  const { t } = useTranslation("weeklyRewardPopup");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const RANK_LABEL: Record<number, string> = { 1: t("rank1"), 2: t("rank2"), 3: t("rank3") };

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/leaderboard/weekly-xp/claim-reward", {});
      return await response.json();
    },
    onSuccess: (result: { claimed: boolean }) => {
      if (!result.claimed) return;
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard/weekly-xp/pending-reward"] });
      useUserStore.getState().loadUser();
      // Small beat so the "+gems" state is actually seen before the sheet closes itself,
      // rather than the claim and the close reading as one instant flash.
      setTimeout(onClose, 550);
    },
    onError: () => {
      toast({
        title: t("toasts.claimFailedTitle"),
        description: t("toasts.tryAgain"),
        variant: "destructive",
      });
    },
  });

  const rank = pendingReward?.rank ?? 1;
  const gemsAwarded = pendingReward?.gemsAwarded ?? 0;
  const claimed = claimMutation.isSuccess && (claimMutation.data as { claimed?: boolean } | undefined)?.claimed;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      height="auto"
      contentClassName="px-4 pt-3 pb-8 text-white flex flex-col items-center"
    >
      <motion.div
        animate={{ rotate: [-4, 4, -4], scale: [1, 1.08, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <img src={MEDALS[rank] ?? trophyIcon} alt="" className="w-16 h-16" />
      </motion.div>

      <h2 className="mt-2 text-2xl font-black text-white text-center" data-testid="text-weekly-reward-title">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-white/50 text-center">
        {t("finishedRank", { rank: RANK_LABEL[rank] ?? `#${rank}` })}
      </p>

      <motion.button
        onClick={() => {
          if (claimed || claimMutation.isPending) return;
          claimMutation.mutate();
        }}
        disabled={claimMutation.isPending || claimed}
        // h-14 + rounded-[23px] matches Profile's Friends/quick-access rows exactly (same
        // ~0.41 radius-to-height ratio, see that row's own comment) — rounded-2xl (16px) on
        // this button's ~52px content-driven height read as a near-full pill instead of the
        // rounded-rectangle look the rest of the app uses.
        className="mt-6 w-full h-14 rounded-[23px] font-bold flex items-center justify-center gap-2 disabled:opacity-60"
        style={{
          background: '#FFFFFF',
          color: '#15161A',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)'
        }}
        whileTap={{ scale: 0.98 }}
        data-testid="button-weekly-reward-claim"
      >
        {claimed ? t("claimed") : claimMutation.isPending ? t("claiming") : t("claim", { amount: gemsAwarded })}
        {!claimed && !claimMutation.isPending && <Gem className="w-5 h-5" />}
      </motion.button>
    </BottomSheet>
  );
}
