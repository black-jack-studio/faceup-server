import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChangePasswordModalProps {
  children: React.ReactNode;
}

// Slide-up sheet instead of a full sliding page — same component/animation/background as the
// Friends "Add Referral Code" sheet (see BottomSheet.tsx), which already tracks the on-screen
// keyboard and lifts itself above it. The old full-page version had no such handling, so on
// device the keyboard just overlaid on top of it instead of the sheet rising to stay clear.
export default function ChangePasswordModal({ children }: ChangePasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"code" | "confirm">("code");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const { toast } = useToast();

  const resetForm = () => {
    setStep("code");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setCodeError("");
    setNewPasswordError("");
    setConfirmPasswordError("");
  };

  const handleClose = () => {
    setIsOpen(false);
    resetForm();
  };

  // Optional/loosely-typed event: this doubles as the "Send Code" submit handler (a real
  // FormEvent) and the "Resend Code" link's click handler (a MouseEvent, and not inside its
  // own form submit) — both just need preventDefault() if it's there.
  const handleRequestCode = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/auth/request-password-change-code");
      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Couldn't send code",
          description: errorData.message || "Please try again",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Check your email",
        description: "We sent a code to your account's email address",
      });
    } catch (error: any) {
      toast({
        title: "Couldn't send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      setCodeError("Code is required");
      return;
    }

    setIsLoading(true);
    setCodeError("");

    try {
      const response = await apiRequest("POST", "/api/auth/verify-password-change-code", { code });
      if (!response.ok) {
        const errorData = await response.json();
        setCodeError(errorData.message || "Invalid or expired code");
        return;
      }
      setStep("confirm");
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setNewPasswordError("");
    setConfirmPasswordError("");

    let isValid = true;
    if (newPassword.length < 6) {
      setNewPasswordError("Password is too short");
      isValid = false;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    }
    if (!isValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/change-password", {
        code,
        newPassword,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.message?.toLowerCase().includes("code")) {
          setCodeError(errorData.message);
          setStep("code");
        } else {
          toast({
            title: "Failed to Change Password",
            description: errorData.message || "Please try again",
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });

      handleClose();
    } catch (error: any) {
      toast({
        title: "Failed to Change Password",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>
      <BottomSheet open={isOpen} onClose={handleClose} contentClassName="px-6 pb-10" height="auto">
        <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>

        {step === "code" ? (
          <form onSubmit={handleVerifyCode} className="space-y-5">
            <p className="text-white/70 text-sm">
              We'll send a code to your account's email to confirm it's you.
            </p>

            <div className="space-y-2">
              <Label htmlFor="change-password-code" className="text-white font-medium text-sm">
                Code
              </Label>
              <Input
                id="change-password-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (codeError) {
                    setCodeError("");
                  }
                }}
                className={`bg-white/10 text-white placeholder:text-white/50 h-14 focus:bg-white/15 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 rounded-xl tracking-widest text-center text-lg ${
                  codeError
                    ? "border-red-500 focus:border-red-400"
                    : "border-white/20 focus:border-white/40"
                }`}
                placeholder="Code"
                data-testid="input-change-password-code"
              />
              {codeError && (
                <motion.p
                  className="text-red-400 text-sm mt-2 font-medium"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="change-password-code-error"
                >
                  {codeError}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-base disabled:opacity-50"
              data-testid="button-verify-change-password-code"
              disabled={isLoading}
            >
              {isLoading ? "Verifying…" : "Confirm Code"}
            </button>

            <button
              type="button"
              onClick={handleRequestCode}
              className="w-full text-center text-white/60 text-sm underline disabled:opacity-50"
              disabled={isLoading}
              data-testid="button-send-change-password-code"
            >
              Send Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-white font-medium text-sm">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (newPasswordError) {
                      setNewPasswordError("");
                    }
                  }}
                  className={`bg-white/10 text-white placeholder:text-white/50 pr-12 h-14 focus:bg-white/15 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 rounded-xl ${
                    newPasswordError
                      ? "border-red-500 focus:border-red-400"
                      : "border-white/20 focus:border-white/40"
                  }`}
                  placeholder="New password"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-xl transition-colors"
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPasswordError && (
                <motion.p
                  className="text-red-400 text-sm mt-2 font-medium"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="new-password-error"
                >
                  {newPasswordError}
                </motion.p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-white font-medium text-sm">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) {
                      setConfirmPasswordError("");
                    }
                  }}
                  className={`bg-white/10 text-white placeholder:text-white/50 pr-12 h-14 focus:bg-white/15 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-200 rounded-xl ${
                    confirmPasswordError
                      ? "border-red-500 focus:border-red-400"
                      : "border-white/20 focus:border-white/40"
                  }`}
                  placeholder="Confirm password"
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white p-2 rounded-xl transition-colors"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPasswordError && (
                <motion.p
                  className="text-red-400 text-sm mt-2 font-medium"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="confirm-password-error"
                >
                  {confirmPasswordError}
                </motion.p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-white text-black font-bold text-base disabled:opacity-50"
              data-testid="button-change-password"
              disabled={isLoading}
            >
              {isLoading ? "Changing…" : "Confirm"}
            </button>
          </form>
        )}
      </BottomSheet>
    </>
  );
}
