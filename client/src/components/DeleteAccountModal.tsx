import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Eye, EyeOff } from "lucide-react";
import AnimatedModal from "@/components/AnimatedModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface DeleteAccountModalProps {
  children: React.ReactNode;
  onAccountDeleted: () => void;
}

export default function DeleteAccountModal({ children, onAccountDeleted }: DeleteAccountModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setPassword("");
    setShowPassword(false);
    setPasswordError("");
  };

  const handleClose = () => {
    if (isLoading) return;
    setIsOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/delete-account", { password });
      setIsOpen(false);
      resetForm();
      onAccountDeleted();
    } catch (error: any) {
      if (error.message && error.message.toLowerCase().includes("incorrect")) {
        setPasswordError("Password is incorrect");
      } else {
        toast({
          title: "Failed to Delete Account",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      {/* AnimatedModal, not Radix's Dialog — Radix locks `pointer-events` on <body> while open
          and only clears it once its own close animation finishes, but onAccountDeleted()
          logs out and swaps the whole authenticated tree on the very next render, tearing the
          dialog down mid-animation before that cleanup ever ran. That's what froze every click
          in the app until a reload, and no amount of sequencing around Radix's own timing fixed
          it reliably — this sidesteps the mechanism instead, same as Settings' Sign Out. */}
      <AnimatedModal
        open={isOpen}
        onClose={handleClose}
        className="w-[calc(100%-3rem)] max-w-sm bg-card-dark border border-white/10 rounded-3xl shadow-2xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Delete Account</h2>
          </div>

          <p className="text-white/70 text-sm text-center mb-6">
            This permanently deletes your account, stats, inventory, and progress. This cannot be undone.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="delete-password" className="text-white font-medium text-sm">
                Confirm your password
              </Label>
              <div className="relative">
                <Input
                  id="delete-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  className={`bg-white/10 text-white placeholder:text-white/50 pr-12 h-11 focus:bg-white/15 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 rounded-2xl ${
                    passwordError
                      ? "border-red-500 focus:border-red-400"
                      : "border-white/20 focus:border-accent-purple/60"
                  }`}
                  placeholder="Password"
                  data-testid="input-delete-account-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-200"
                  data-testid="button-toggle-delete-account-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {passwordError && (
                <motion.p
                  className="text-red-400 text-sm mt-2 font-medium"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="delete-account-password-error"
                >
                  {passwordError}
                </motion.p>
              )}
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1 h-11 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30 font-medium rounded-2xl transition-all duration-200"
                data-testid="button-cancel-delete-account"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                data-testid="button-confirm-delete-account"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </div>
                ) : (
                  "Delete My Account"
                )}
              </Button>
            </div>
          </form>
        </div>
      </AnimatedModal>
    </>
  );
}
