import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";

interface TrackingPermissionPopupProps {
  open: boolean;
  // Both "close without choosing" (backdrop tap, swipe-down) and the "Plus tard" button route
  // here — either way this is answered for good (see hasSeenTrackingPrompt on the schema), the
  // real OS ATT dialog is never touched by a decline.
  onDecline: () => void;
  onAccept: () => void;
}

export default function TrackingPermissionPopup({ open, onDecline, onAccept }: TrackingPermissionPopupProps) {
  const { t } = useTranslation("trackingPermissionPopup");

  return (
    <BottomSheet open={open} onClose={onDecline} height="auto" contentClassName="px-6 pt-2 pb-8 text-white flex flex-col items-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <Sparkles size={28} className="text-white" />
      </div>

      <h2 className="mt-5 text-xl font-black text-center" data-testid="text-tracking-permission-title">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm text-white/60 text-center leading-relaxed" data-testid="text-tracking-permission-body">
        {t("body")}
      </p>

      <motion.button
        onClick={onAccept}
        className="mt-6 w-full py-3.5 rounded-[24px] font-bold"
        style={{
          background: "#FFFFFF",
          color: "#15161A",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
        whileTap={{ scale: 0.98 }}
        data-testid="button-tracking-permission-accept"
      >
        {t("accept")}
      </motion.button>

      <button
        onClick={onDecline}
        className="mt-3 w-full py-3 text-sm font-semibold text-white/50"
        data-testid="button-tracking-permission-decline"
      >
        {t("decline")}
      </button>
    </BottomSheet>
  );
}
