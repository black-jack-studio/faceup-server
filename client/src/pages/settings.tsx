import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ChangeUsernameModal from "@/components/ChangeUsernameModal";
import DeleteAccountModal from "@/components/DeleteAccountModal";

export default function Settings() {
  const [, navigate] = useLocation();
  const logout = useUserStore((state) => state.logout);
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleAccountDeleted = () => {
    logout();
    navigate("/");
    toast({
      title: "Account Deleted",
      description: "Your account has been permanently deleted.",
    });
  };

  return (
    <div className="min-h-screen text-white p-6 overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div
          className="flex items-center mb-8 pt-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <button
            onClick={() => navigate("/profile")}
            className="mr-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
        </motion.div>

        {/* Content */}
        <motion.div
          className="space-y-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ChangeUsernameModal>
            <motion.button
              className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
              data-testid="button-change-username"
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-white font-bold">Change Username</span>
            </motion.button>
          </ChangeUsernameModal>

          <ChangePasswordModal>
            <motion.button
              className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
              data-testid="button-change-password"
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-white font-bold">Change Password</span>
            </motion.button>
          </ChangePasswordModal>

          <motion.button
            onClick={() => navigate("/legal-links")}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="button-privacy"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Privacy</span>
          </motion.button>

          <motion.button
            onClick={() => navigate("/credits")}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="button-credits"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Credits</span>
          </motion.button>

          <motion.button
            className="w-full text-left py-4 border-b border-red-500/30 hover:border-red-500/60 transition-colors"
            onClick={handleLogout}
            data-testid="button-logout"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-red-400 font-bold">Sign Out</span>
          </motion.button>

          <DeleteAccountModal onAccountDeleted={handleAccountDeleted}>
            <motion.button
              className="w-full text-left py-4 border-b border-white/10 hover:border-red-500/40 transition-colors"
              data-testid="button-delete-account"
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-white/50 font-bold text-sm">Delete Account</span>
            </motion.button>
          </DeleteAccountModal>
        </motion.div>
      </div>
    </div>
  );
}
