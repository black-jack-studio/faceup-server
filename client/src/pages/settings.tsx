import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
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
import { Switch } from "@/components/ui/switch";
import { isSoundEnabled, setSoundEnabled, unlockAudio, playSound } from "@/lib/sound";
import { isHapticsEnabled, setHapticsEnabled } from "@/lib/haptics";

export default function Settings() {
  const [, navigate] = useLocation();
  const logout = useUserStore((state) => state.logout);
  const isPremium = useUserStore((state) => state.isPremium());
  const { toast } = useToast();
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [showGameRules, setShowGameRules] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);

  useEffect(() => {
    setSoundEnabledState(isSoundEnabled());
    setHapticsEnabledState(isHapticsEnabled());
  }, []);

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabledState(checked);
    setSoundEnabled(checked);
    if (checked) {
      unlockAudio();
      playSound("buttonClick");
    }
  };

  const handleToggleHaptics = (checked: boolean) => {
    setHapticsEnabledState(checked);
    setHapticsEnabled(checked);
  };

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

  // Logging out swaps the whole authenticated tree for the Welcome screen on the very next
  // render (see Router() in App.tsx), which used to cut instantly with no transition at all.
  // Playing the slide-down first (same y: "100%" exit Classic 21 uses when leaving the table,
  // see home.tsx) and only calling logout()/navigate() once it's actually finished gives Sign
  // Out a real animation instead of racing an unmount against it.
  const handleLogout = () => {
    setShowSignOutConfirm(false);
    setIsSigningOut(true);
    setTimeout(() => {
      logout();
      navigate("/");
    }, 280);
  };


  return (
    <motion.div
      className="min-h-screen text-white p-6 overflow-hidden"
      style={{ backgroundColor: '#000000' }}
      animate={{ y: isSigningOut ? "100%" : 0 }}
      transition={{ duration: 0.28, ease: [0.55, 0, 0.85, 0.15] }}
    >
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-8"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
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
              className="w-full text-left py-4 border-b border-white/20 transition-colors"
              data-testid="button-change-username"
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-white font-bold">Change Username</span>
            </motion.button>
          </ChangeUsernameModal>

          <ChangePasswordModal>
            <motion.button
              className="w-full text-left py-4 border-b border-white/20 transition-colors"
              data-testid="button-change-password"
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-white font-bold">Change Password</span>
            </motion.button>
          </ChangePasswordModal>

          {isPremium && (
            <motion.button
              onClick={() => navigate("/manage-subscription")}
              className="w-full text-left py-4 border-b border-white/20 hover:border-white/50 transition-colors"
              data-testid="button-manage-subscription"
              whileTap={{ scale: 0.99 }}
            >
              <span className="text-white font-bold">Manage my subscription</span>
            </motion.button>
          )}

          <motion.button
            onClick={() => navigate("/legal-links")}
            className="w-full text-left py-4 border-b border-white/20 transition-colors"
            data-testid="button-privacy"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Privacy</span>
          </motion.button>

          <motion.button
            onClick={() => setShowGameRules(true)}
            className="w-full text-left py-4 border-b border-white/20 transition-colors"
            data-testid="button-game-rules"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Game Rules</span>
          </motion.button>

          <motion.button
            onClick={() => setShowCredits(true)}
            className="w-full text-left py-4 border-b border-white/20 transition-colors"
            data-testid="button-credits"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Credits</span>
          </motion.button>

          <div className="w-full flex items-center justify-between py-4 border-b border-white/20">
            <span className="text-white font-bold">Haptics</span>
            <Switch
              checked={hapticsEnabled}
              onCheckedChange={handleToggleHaptics}
              data-testid="switch-haptics"
            />
          </div>

          <div className="w-full flex items-center justify-between py-4 border-b border-white/20">
            <span className="text-white font-bold">Sound Effects</span>
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleToggleSound}
              data-testid="switch-sound-effects"
            />
          </div>

          {/* Separate from the Support contact in Legal Links, which is for account/purchase
              issues — this is specifically for bug reports and feature ideas. mailto: rather
              than an in-app form: opens the phone's own mail app with the subject/body
              pre-filled (app version + platform included so a bug report already carries that
              context), no backend needed to receive/store submissions. */}
          <motion.a
            href={`mailto:help.faceup@gmail.com?subject=${encodeURIComponent("FaceUp Feedback")}&body=${encodeURIComponent(
              `\n\n—\nVersion: ${appVersion ?? "web"} (${Capacitor.getPlatform()})`
            )}`}
            className="block w-full text-left py-4 border-b border-white/20 transition-colors"
            data-testid="button-feedback"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-white font-bold">Feedback &amp; Bug Reports</span>
          </motion.a>

          {Capacitor.isNativePlatform() && (
            <motion.button
              className="w-full text-left py-4 border-b border-white/20 transition-colors disabled:opacity-50"
              onClick={() => testPushMutation.mutate()}
              disabled={testPushMutation.isPending}
              data-testid="button-test-push"
            >
              <span className="text-white font-bold">
                {testPushMutation.isPending ? "Sending…" : "Send test notification"}
              </span>
            </motion.button>
          )}

          <motion.button
            onClick={() => setShowSignOutConfirm(true)}
            className="w-full text-left py-4 border-b border-red-500/30 transition-colors"
            data-testid="button-logout"
            whileTap={{ scale: 0.99 }}
          >
            <span className="text-red-400 font-bold">Sign Out</span>
          </motion.button>
        </div>

        {/* Same rising bottom sheet every other confirm popup in the app uses (Leave the
            table, Daily Streak, Player Stats, ...) instead of a centered modal — plain Framer
            Motion under the hood, not Radix's AlertDialog, so logging out (which swaps the
            whole authenticated tree on the very next render) can't tear it down mid-animation
            the way Radix's own body pointer-events lock used to leave every click dead until
            a reload. height="auto" since this content is short and fixed-size, same as Leave
            the table's own sheet. */}
        <BottomSheet
          open={showSignOutConfirm}
          onClose={() => setShowSignOutConfirm(false)}
          height="auto"
          contentClassName="px-6 pt-2 pb-8 flex flex-col items-center text-center"
        >
          <h2 className="mt-3 text-xl font-bold text-white">Sign out?</h2>
          <p className="mt-2 text-white/70 text-sm mb-6">
            You'll need to sign back in to continue playing.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleLogout}
              className="w-full h-11 rounded-[18px] bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50"
              data-testid="button-logout-confirm"
            >
              Sign Out
            </button>
            <button
              onClick={() => setShowSignOutConfirm(false)}
              className="w-full h-11 rounded-xl bg-[#232328] hover:bg-[#232328] border border-zinc-700 text-white font-medium disabled:opacity-50"
              data-testid="button-logout-cancel"
            >
              Cancel
            </button>
          </div>
        </BottomSheet>

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
    </motion.div>
  );
}
