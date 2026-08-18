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
          className="space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <ChangeUsernameModal>
            <motion.button
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
              data-testid="button-change-username"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold">Change Username</span>
              </div>
            </motion.button>
          </ChangeUsernameModal>

          <ChangePasswordModal>
            <motion.button
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
              data-testid="button-change-password"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-white font-bold">Change Password</span>
              </div>
            </motion.button>
          </ChangePasswordModal>

          <motion.button
            onClick={() => navigate("/legal-links")}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
            data-testid="button-privacy"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold">Privacy</span>
            </div>
          </motion.button>

          <motion.button
            onClick={() => navigate("/credits")}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-4 text-left transition-colors"
            data-testid="button-credits"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center space-x-2">
              <span className="text-white font-bold">Credits</span>
            </div>
          </motion.button>

          <motion.button
            className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl p-4 text-left transition-colors"
            onClick={handleLogout}
            data-testid="button-logout"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center space-x-2">
              <span className="text-red-400 font-bold">Sign Out</span>
            </div>
          </motion.button>

          <DeleteAccountModal onAccountDeleted={handleAccountDeleted}>
            <motion.button
              className="w-full bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 rounded-2xl p-4 text-left transition-colors"
              data-testid="button-delete-account"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center space-x-2">
                <span className="text-white/50 font-bold text-sm">Delete Account</span>
              </div>
            </motion.button>
          </DeleteAccountModal>
        </motion.div>
      </div>
    </div>
  );
}
