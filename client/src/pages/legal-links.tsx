import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import BottomSheet from "@/components/BottomSheet";
import { PrivacyPolicyContent } from "@/pages/legal/privacy-policy";
import { LegalNoticeContent } from "@/pages/legal/legal-notice";
import { TermsOfServiceContent } from "@/pages/legal/terms-of-service";

// Support intentionally isn't listed here yet — coming back later.
export default function LegalLinks() {
  const [, navigate] = useLocation();
  const [openSheet, setOpenSheet] = useState<"privacy" | "notice" | "terms" | null>(null);

  return (
    <div className="min-h-screen text-white p-6 overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-md mx-auto">
        {/* Header — same layout as Settings' own header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Privacy</h1>
          <div className="w-10" />
        </div>

        {/* Content — same flat list style as Settings: no icons, no pills, no subtitles */}
        <div className="space-y-1">
          <motion.button
            onClick={() => setOpenSheet("privacy")}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="link-privacy-policy"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Privacy Policy</span>
          </motion.button>

          <motion.button
            onClick={() => setOpenSheet("notice")}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="link-legal-notice"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Legal Notice</span>
          </motion.button>

          <motion.button
            onClick={() => setOpenSheet("terms")}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="link-terms-of-service"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Terms of Service</span>
          </motion.button>
        </div>
      </div>

      <BottomSheet open={openSheet === "privacy"} onClose={() => setOpenSheet(null)}>
        <PrivacyPolicyContent />
      </BottomSheet>
      <BottomSheet open={openSheet === "notice"} onClose={() => setOpenSheet(null)}>
        <LegalNoticeContent />
      </BottomSheet>
      <BottomSheet open={openSheet === "terms"} onClose={() => setOpenSheet(null)}>
        <TermsOfServiceContent />
      </BottomSheet>
    </div>
  );
}
