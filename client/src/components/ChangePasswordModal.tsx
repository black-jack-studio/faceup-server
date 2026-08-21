import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import keyIcon from "@assets/key_3d_1757359537218.png";

interface ChangePasswordModalProps {
  children: React.ReactNode;
}

export default function ChangePasswordModal({ children }: ChangePasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"request" | "verify" | "confirm">("request");
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
    setStep("request");
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

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setIsOpen(true);
    } else {
      handleClose();
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setStep("verify");
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
          setStep("verify");
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-sm bg-card-dark border-white/10 shadow-2xl rounded-3xl">
        <DialogTitle className="sr-only">Change Password</DialogTitle>

        <div className="p-6">
          {/* Simplified header */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple/30 to-accent-blue/30 flex items-center justify-center mr-3">
              <img src={keyIcon} alt="Key" className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-white">Change Password</h2>
          </div>

          {step === "request" ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <p className="text-white/70 text-sm text-center">
                We'll send a code to your account's email to confirm it's you before changing your password.
              </p>

              <div className="flex space-x-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11 bg-[#0B0B0F] hover:bg-[#0B0B0F] border-zinc-700 text-white font-medium rounded-xl transition-none"
                  data-testid="button-cancel"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  data-testid="button-send-change-password-code"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    "Send Code"
                  )}
                </Button>
              </div>
            </form>
          ) : step === "verify" ? (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <p className="text-white/70 text-sm text-center">
                Enter the code we sent to your email to confirm it's you.
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
                  autoFocus
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (codeError) {
                      setCodeError("");
                    }
                  }}
                  className={`bg-white/10 text-white placeholder:text-white/50 h-11 focus:bg-white/15 transition-all duration-200 rounded-2xl tracking-widest text-center text-lg ${
                    codeError
                      ? "border-red-500 focus:border-red-400"
                      : "border-white/20 focus:border-accent-purple/60"
                  }`}
                  placeholder="6-digit code"
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

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11 bg-[#0B0B0F] hover:bg-[#0B0B0F] border-zinc-700 text-white font-medium rounded-xl transition-none"
                  data-testid="button-cancel"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  data-testid="button-verify-change-password-code"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Confirm Code"
                  )}
                </Button>
              </div>
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
                    className={`bg-white/10 text-white placeholder:text-white/50 pr-12 h-11 focus:bg-white/15 transition-all duration-200 rounded-2xl ${
                      newPasswordError
                        ? "border-red-500 focus:border-red-400"
                        : "border-white/20 focus:border-accent-purple/60"
                    }`}
                    placeholder="New password"
                    data-testid="input-new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-200"
                    data-testid="button-toggle-new-password"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
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
                    className={`bg-white/10 text-white placeholder:text-white/50 pr-12 h-11 focus:bg-white/15 transition-all duration-200 rounded-2xl ${
                      confirmPasswordError
                        ? "border-red-500 focus:border-red-400"
                        : "border-white/20 focus:border-accent-purple/60"
                    }`}
                    placeholder="Confirm password"
                    data-testid="input-confirm-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-200"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
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

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 h-11 bg-[#0B0B0F] hover:bg-[#0B0B0F] border-zinc-700 text-white font-medium rounded-xl transition-none"
                  data-testid="button-cancel"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-11 bg-[#60A5FA] hover:bg-[#60A5FA]/90 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                  data-testid="button-change-password"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Changing...</span>
                    </div>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
