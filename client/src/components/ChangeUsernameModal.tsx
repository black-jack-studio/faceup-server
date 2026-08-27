import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft } from "@/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUserStore } from "@/store/user-store";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useOverlayVisibility } from "@/hooks/use-overlay-visibility";

interface ChangeUsernameModalProps {
  children: React.ReactNode;
}

// A full sliding page (right-to-left in, left-to-right out — same direction as Settings and
// Legal Links) instead of a centered popup dialog. The back arrow is the only way to dismiss
// it now — a separate "Cancel" button next to Confirm stopped making sense once this stopped
// being a modal sitting on top of the page you were already looking at.
export default function ChangeUsernameModal({ children }: ChangeUsernameModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const { user, updateUser } = useUserStore();

  // Reference-counted (see the hook): a plain reset-to-"" on close used to clobber an outer
  // sheet's lock too when this was opened nested inside one (it's reached from Settings).
  useBodyScrollLock(isOpen);
  // Tells ConditionalBottomNav (App.tsx) to unmount the nav bar the instant this opens, and
  // remount it only once its own exit animation has genuinely finished — see
  // hooks/use-overlay-visibility.ts.
  const onModalExitComplete = useOverlayVisibility(isOpen);

  const resetForm = () => {
    setNewUsername("");
    setErrorMessage("");
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUsername) {
      setErrorMessage("Please enter a username");
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setErrorMessage("Username must be between 3 and 20 characters");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(newUsername)) {
      setErrorMessage("Username can only contain letters, numbers, and underscores");
      return;
    }

    if (newUsername === user?.username) {
      setErrorMessage("This is already your username");
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/change-username", {
        newUsername,
      });

      const data = await response.json();

      if (data.user) {
        updateUser({ username: data.user.username });
      }

      handleClose();
    } catch (error: any) {
      if (error.message?.includes("Username is already") || error.message?.includes("already taken") || error.message?.includes("already exists")) {
        setErrorMessage("Username already taken");
      } else {
        setErrorMessage(error.message || "Something went wrong, please try again");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <AnimatePresence onExitComplete={onModalExitComplete}>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[70] text-white flex flex-col overflow-hidden"
            style={{ backgroundColor: "#000000" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
          >
            {/* relative z-10: the centered block below is pulled up with a negative margin to
                sit in the middle of the remaining space, which put its (invisible but still
                click-catching) box right over this row — the arrow looked fine but taps never
                reached it. */}
            <div className="relative z-10 px-6 pt-4">
              <button
                onClick={handleClose}
                className="p-2 rounded-full transition-colors"
                style={{ WebkitTapHighlightColor: "transparent" }}
                data-testid="button-back"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Title + form centered together in the remaining space — separate from the back
                arrow's own row, instead of both crammed into the same header line. */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 -mt-16">
              <h1 className="text-2xl font-bold text-white">Change Username</h1>
              <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-username" className="text-white font-medium text-sm">
                    New Username
                  </Label>
                  <Input
                    id="new-username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value);
                      setErrorMessage("");
                    }}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 h-14 focus:border-white/40 focus:bg-white/15 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 rounded-xl"
                    placeholder="Your new username"
                    data-testid="input-new-username"
                    maxLength={20}
                  />
                  {errorMessage && (
                    <p className="text-red-400 text-sm mt-1" data-testid="error-message">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-white text-black font-bold text-base disabled:opacity-50"
                  data-testid="button-validate"
                  disabled={isLoading}
                >
                  {isLoading ? "Changing…" : "Confirm"}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
