import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { useUserStore } from "@/store/user-store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import ChangeUsernameModal from "@/components/ChangeUsernameModal";
import BottomSheet from "@/components/BottomSheet";
import { GameRulesContent } from "@/pages/game-rules";
import { CreditsContent } from "@/pages/credits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const [, navigate] = useLocation();
  const logout = useUserStore((state) => state.logout);
  const { toast } = useToast();
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [showGameRules, setShowGameRules] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const testPushMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/push/test");
    },
    onSuccess: () => {
      toast({ title: "Sent", description: "Check your notifications." });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't send it", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  useEffect(() => {
    // getInfo() reads the real installed build's version (Info.plist/build.gradle) — not
    // implemented on web, so there's nothing meaningful to show there.
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.getInfo()
        .then((info) => setAppVersion(info.version))
        .catch(() => {});
    }
  }, []);

  // AlertDialogAction closes the dialog itself (via onOpenChange, since it's now controlled
  // below) the instant it's clicked — but Radix keeps its portal mounted for ~200ms after that
  // to play its own closing CSS animation, and only *then* runs the cleanup that un-locks
  // `pointer-events` on <body> (locked while the dialog is open). logout() clears the user,
  // which swaps the whole authenticated tree for the logged-out one on the very next render —
  // tearing the dialog's portal down immediately, mid-animation, before that cleanup ever got
  // to run. That's what left every click in the app dead until a reload. Waiting for the close
  // animation to actually finish before logging out avoids the race instead of guessing at
  // which of Radix's internals broke.
  const handleLogout = () => {
    setTimeout(() => {
      logout();
      navigate("/");
    }, 250);
  };


  return (
    <div className="min-h-screen text-white p-6 overflow-hidden" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-4">
          {/* No hover background: on touch devices `:hover` sticks after the tap instead of
              clearing, which showed as a dark circle stuck around the arrow. Tap highlight is
              killed too — WebKit draws its own by default regardless of any CSS :hover. */}
          <button
            onClick={() => navigate("/profile")}
            className="p-2 rounded-full transition-colors"
            style={{ WebkitTapHighlightColor: "transparent" }}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="space-y-1">
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
            onClick={() => setShowGameRules(true)}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="button-game-rules"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Game Rules</span>
          </motion.button>

          <motion.button
            onClick={() => setShowCredits(true)}
            className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
            data-testid="button-credits"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Credits</span>
          </motion.button>

          {Capacitor.isNativePlatform() && (
            <motion.button
              className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors disabled:opacity-50"
              onClick={() => testPushMutation.mutate()}
              disabled={testPushMutation.isPending}
              data-testid="button-test-push"
            >
              <span className="text-white font-bold">
                {testPushMutation.isPending ? "Sending…" : "Send test notification"}
              </span>
            </motion.button>
          )}

          <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
            <AlertDialogTrigger asChild>
              <motion.button
                className="w-full text-left py-4 border-b border-red-500/30 hover:border-red-500/60 transition-colors"
                data-testid="button-logout"
                whileTap={{ scale: 0.99 }}
              >
                <span className="text-red-400 font-bold">Sign Out</span>
              </motion.button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card-dark border-white/10 rounded-3xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  You'll need to sign back in to continue playing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-logout-cancel">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} data-testid="button-logout-confirm">
                  Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {appVersion && (
          <p className="text-white/30 text-xs text-center mt-10 pb-4">Version {appVersion}</p>
        )}
      </div>

      <BottomSheet open={showGameRules} onClose={() => setShowGameRules(false)}>
        <GameRulesContent />
      </BottomSheet>
      <BottomSheet open={showCredits} onClose={() => setShowCredits(false)}>
        <CreditsContent />
      </BottomSheet>
    </div>
  );
}
