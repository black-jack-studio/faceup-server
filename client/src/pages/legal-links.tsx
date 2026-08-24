import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Scale, ScrollText, LifeBuoy } from "lucide-react";
import { useLocation } from "wouter";
import BottomSheet from "@/components/BottomSheet";
import { PrivacyPolicyContent } from "@/pages/legal/privacy-policy";
import { LegalNoticeContent } from "@/pages/legal/legal-notice";
import { TermsOfServiceContent } from "@/pages/legal/terms-of-service";
import { SupportContent } from "@/pages/support";

export default function LegalLinks() {
  const [, navigate] = useLocation();
  const [openSheet, setOpenSheet] = useState<"privacy" | "notice" | "terms" | "support" | null>(null);

  return (
    <div className="min-h-screen bg-ink text-white p-6 overflow-hidden">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="mr-3 text-white hover:bg-white/10 rounded-xl p-2"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-black text-white tracking-tight">Legal</h1>
          </div>
        </motion.div>

        {/* Legal Links Section */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center mb-6">
            <Shield className="w-6 h-6 text-accent-purple mr-3" />
            <h2 className="text-2xl font-bold text-white">Legal Information</h2>
          </div>
          
          <div className="space-y-4">
            {/* Privacy Policy */}
            <motion.button
              onClick={() => setOpenSheet("privacy")}
              className="w-full text-left block bg-[#0B0B0F] hover:bg-[#0B0B0F] rounded-xl p-4 border border-zinc-700 transition-none"
              data-testid="link-privacy-policy"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-accent-purple" />
                <div>
                  <p className="text-white font-semibold">Privacy Policy</p>
                  <p className="text-white/60 text-sm">Learn how we protect your data</p>
                </div>
              </div>
            </motion.button>

            {/* Legal Notice */}
            <motion.button
              onClick={() => setOpenSheet("notice")}
              className="w-full text-left block bg-[#0B0B0F] hover:bg-[#0B0B0F] rounded-xl p-4 border border-zinc-700 transition-none"
              data-testid="link-legal-notice"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <Scale className="w-5 h-5 text-accent-purple" />
                <div>
                  <p className="text-white font-semibold">Legal Notice</p>
                  <p className="text-white/60 text-sm">Important legal information</p>
                </div>
              </div>
            </motion.button>

            {/* Terms of Service */}
            <motion.button
              onClick={() => setOpenSheet("terms")}
              className="w-full text-left block bg-[#0B0B0F] hover:bg-[#0B0B0F] rounded-xl p-4 border border-zinc-700 transition-none"
              data-testid="link-terms-of-service"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <ScrollText className="w-5 h-5 text-accent-purple" />
                <div>
                  <p className="text-white font-semibold">Terms of Service</p>
                  <p className="text-white/60 text-sm">Our terms and conditions</p>
                </div>
              </div>
            </motion.button>

            {/* Support */}
            <motion.button
              onClick={() => setOpenSheet("support")}
              className="w-full text-left block bg-[#0B0B0F] hover:bg-[#0B0B0F] rounded-xl p-4 border border-zinc-700 transition-none"
              data-testid="link-support"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <LifeBuoy className="w-5 h-5 text-accent-purple" />
                <div>
                  <p className="text-white font-semibold">Support</p>
                  <p className="text-white/60 text-sm">Get help or contact us</p>
                </div>
              </div>
            </motion.button>
          </div>
        </motion.section>

        {/* Information Notice */}
        <motion.div
          className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <p className="text-white/70 text-sm text-center leading-relaxed">
            These documents contain important information about your rights, 
            our responsibilities, and how we handle your data. 
            Please take the time to review them.
          </p>
        </motion.div>
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
      <BottomSheet open={openSheet === "support"} onClose={() => setOpenSheet(null)}>
        <SupportContent />
      </BottomSheet>
    </div>
  );
}