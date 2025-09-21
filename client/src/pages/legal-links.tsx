import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, FileText, Scale, ScrollText } from "lucide-react";
import { useLocation } from "wouter";

export default function LegalLinks() {
  const [, navigate] = useLocation();

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
            <motion.a
              href="https://black-jack-studio.github.io/legal-page/privacy-policy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm transition-colors"
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
            </motion.a>

            {/* Legal Notice */}
            <motion.a
              href="https://black-jack-studio.github.io/legal-page/legal-notice.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm transition-colors"
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
            </motion.a>

            {/* Terms of Service */}
            <motion.a
              href="https://black-jack-studio.github.io/legal-page/terms-of-service.html"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white/5 hover:bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm transition-colors"
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
            </motion.a>
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
    </div>
  );
}