import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useLocation, Link } from "wouter";
import { LogIn, User, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { FaApple } from "react-icons/fa";
import BottomSheet from "@/components/BottomSheet";
import { PrivacyPolicyContent } from "@/pages/legal/privacy-policy";
import { TermsOfServiceContent } from "@/pages/legal/terms-of-service";

// Import 3D assets to match app style
import heartIcon from "@assets/heart_suit_3d_1757353734994.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  // Reset password modal states — two steps: request a code by email, then enter the
  // code + new password. Replaces the old email+username-only flow, which let anyone
  // reset anyone's password without proving they own the email inbox.
  const [legalSheet, setLegalSheet] = useState<"privacy" | "terms" | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"request" | "verify" | "confirm">("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [resetEmailError, setResetEmailError] = useState("");
  const [resetCodeError, setResetCodeError] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");

  const [, navigate] = useLocation();
  const { toast } = useToast();
  const login = useUserStore((state) => state.login);
  const loginWithApple = useUserStore((state) => state.loginWithApple);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      const { response } = await SignInWithApple.authorize({
        clientId: "com.beaudoin.faceup",
        redirectURI: "https://faceup-server.onrender.com",
        scopes: "email name",
      });
      await loginWithApple(response.identityToken);
      navigate("/");
    } catch (error: any) {
      // Apple returns error 1001 when the user dismisses the sheet themselves — not a
      // real failure, nothing to show.
      if (error?.code === "1001" || error?.message?.includes("1001")) return;
      toast({
        title: "Apple sign-in failed",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsAppleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await login(username, password);
      navigate("/");
    } catch (error: any) {
      // Clear previous errors
      setUsernameError("");
      setPasswordError("");
      setNeedsEmailVerification(false);

      // Check error type to show appropriate field error
      if (error.errorType === "user_not_found") {
        setUsernameError("Username or password is incorrect");
      } else if (error.errorType === "wrong_password") {
        setPasswordError("Password incorrect");
      } else if (error.errorType === "email_not_verified") {
        setNeedsEmailVerification(true);
      } else {
        // Unknown/network error — don't imply the credentials themselves were wrong
        toast({
          title: "Couldn't sign in",
          description: error?.message || "Please check your connection and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResendingVerification(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { username });
      toast({
        title: "Email sent",
        description: "Check your inbox for a new verification link.",
      });
    } catch (error: any) {
      toast({
        title: "Couldn't resend email",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResendingVerification(false);
    }
  };

  const resetModalClose = () => {
    setIsResetModalOpen(false);
    setResetStep("request");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetEmailError("");
    setResetCodeError("");
    setNewPasswordError("");
  };

  const handleRequestResetCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail.trim()) {
      setResetEmailError("Email is required");
      return;
    }

    setIsResetLoading(true);
    setResetEmailError("");

    try {
      await apiRequest('POST', '/api/auth/forgot-password', { email: resetEmail });
      // Always the same response/step regardless of whether the account exists — the
      // server intentionally doesn't reveal that, see forgot-password's comment.
      toast({
        title: "Check your email",
        description: "If that email is registered, a reset code has been sent.",
      });
      setResetStep("verify");
    } catch (error: any) {
      toast({
        title: "Something went wrong",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleVerifyResetCode = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetCode.trim()) {
      setResetCodeError("Code is required");
      return;
    }

    setIsResetLoading(true);
    setResetCodeError("");

    try {
      await apiRequest('POST', '/api/auth/verify-reset-code', {
        email: resetEmail,
        code: resetCode,
      });

      setResetStep("confirm");
    } catch (error: any) {
      setResetCodeError(error?.message || "Invalid or expired code");
    } finally {
      setIsResetLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      setNewPasswordError("Password is too short");
      return;
    }

    if (newPassword !== confirmPassword) {
      setNewPasswordError("Passwords do not match");
      return;
    }

    setIsResetLoading(true);

    // Clear previous errors
    setResetCodeError("");
    setNewPasswordError("");

    try {
      await apiRequest('POST', '/api/auth/reset-password', {
        email: resetEmail,
        code: resetCode,
        newPassword: newPassword,
      });

      toast({
        title: "Password Reset Successful",
        description: "Your password has been successfully reset. You can now log in with your new password.",
      });

      resetModalClose();

    } catch (error: any) {
      if (error?.message?.toLowerCase().includes("code")) {
        setResetCodeError(error.message);
      } else {
        toast({
          title: "Reset Failed",
          description: error?.message || "Failed to reset password",
          variant: "destructive",
        });
      }
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="fixed-safe-screen text-white" style={{ backgroundColor: '#000000' }}>
      <div className="flex items-center justify-center h-full p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="bg-black rounded-3xl p-6 relative overflow-hidden"
          >
            {/* Black overlay */}
            <div className="absolute inset-0 bg-black rounded-3xl" />

            {/* 3D Icon */}
            <motion.div
              className="w-16 h-16 mx-auto mb-5 relative flex items-center justify-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.6 }}
            >
              <img
                src={heartIcon}
                alt="Login"
                className="w-16 h-16 object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Header */}
            <motion.div
              className="text-center mb-6 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h1 className="text-3xl font-normal text-white mb-2 tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text">
                Welcome Back
              </h1>
              <p className="text-white/70 text-base font-normal">
                Sign in to keep playing modern blackjack
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div>
                <label className="flex items-center gap-3 text-white font-normal text-base mb-2">
                  <User className="w-5 h-5 text-white" />
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    // Clear username error when user types
                    if (usernameError) {
                      setUsernameError("");
                    }
                  }}
                  className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-2.5 appearance-none !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${usernameError
                    ? "border-red-500"
                    : "border-white/20"
                    }`}
                  data-testid="input-username"
                  style={{ outline: "none" }}
                />
                {usernameError && (
                  <motion.p
                    className="text-red-400 text-sm mt-2 font-normal"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    data-testid="username-error"
                  >
                    {usernameError}
                  </motion.p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-3 text-white font-normal text-base mb-2">
                  <Lock className="w-5 h-5 text-white" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Clear password error when user types
                      if (passwordError) {
                        setPasswordError("");
                      }
                    }}
                    className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-2.5 pr-12 appearance-none !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${passwordError
                      ? "border-red-500"
                      : "border-white/20"
                      }`}
                    data-testid="input-password"
                    style={{ outline: "none" }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-transparent p-2 transition-all duration-200"
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {passwordError && (
                  <motion.p
                    className="text-red-400 text-sm mt-2 font-normal"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    data-testid="password-error"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </div>

              {needsEmailVerification && (
                <motion.div
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="email-not-verified-notice"
                >
                  <p className="text-yellow-400 text-sm font-normal">
                    Please verify your email before signing in.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="text-white font-normal text-sm underline disabled:opacity-50"
                    data-testid="button-resend-verification"
                  >
                    {isResendingVerification ? "Sending..." : "Resend verification email"}
                  </button>
                </motion.div>
              )}

              <div
                className="pt-2"
              >
                <Button
                  type="submit"
                  className="w-full h-[46px] bg-gradient-to-r from-white to-gray-200 text-black font-normal text-xl py-0 rounded-[18px] shadow-2xl border border-white/20 relative overflow-hidden group"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0" />
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></div>
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </motion.form>

            {/* Apple Sign-In — native platforms only; there's no web fallback configured
                (would need a Services ID + redirect flow), so it's hidden on the browser
                build rather than shown broken. */}
            {Capacitor.isNativePlatform() && (
              <motion.div
                className="mt-6 relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-white/20" />
                  <span className="text-white/50 text-sm">or</span>
                  <div className="h-px flex-1 bg-white/20" />
                </div>
                <Button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={isAppleLoading}
                  className="w-full h-[46px] bg-gradient-to-r from-white to-gray-200 text-black font-normal text-lg py-0 rounded-[18px] shadow-2xl border border-white/20 relative overflow-hidden group"
                  data-testid="button-apple-signin"
                >
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {isAppleLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-ink/30 border-t-ink rounded-full animate-spin"></div>
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <FaApple className="w-5 h-5" />
                        <span>Continue with Apple</span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Footer */}
            <motion.div
              className="mt-5 text-center relative z-10 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Link href="/register" className="block">
                <p className="text-white/70 text-lg underline">
                  Don't have an account?
                </p>
              </Link>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="block w-full"
                data-testid="button-forgot-password"
              >
                <p className="text-white/70 text-sm underline">
                  Forgot your password?
                </p>
              </button>
              <p className="text-white/40 text-xs">
                <button type="button" onClick={() => setLegalSheet("privacy")} className="underline hover:text-white/70">
                  Privacy Policy
                </button>
                {" "}·{" "}
                <button type="button" onClick={() => setLegalSheet("terms")} className="underline hover:text-white/70">
                  Terms of Service
                </button>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Rendered as a sibling of the whole card, not nested inside the form — a fixed-
          position sheet nested inside an ancestor that establishes its own stacking context
          (the form and footer above both carry "relative z-10") gets its z-index scoped to
          that ancestor's own rank among ITS siblings, not compared globally. Nested here, the
          sheet's high z-index couldn't beat the footer's later-in-DOM z-10, so the footer text
          showed through on top of it. */}
      <BottomSheet
        open={isResetModalOpen}
        onClose={resetModalClose}
        height="auto"
        contentClassName="px-6 pt-2 pb-10"
      >
        <h2 className="text-2xl font-normal text-center text-white mb-6">
          Reset Password
        </h2>

        {resetStep === "request" ? (
          <form onSubmit={handleRequestResetCode} className="space-y-4">
            <p className="text-white/70 text-sm text-center">
              Enter your account email and we'll send you a code to reset your password.
            </p>
            {/* Email field */}
            <div>
              <label className="flex items-center gap-2 text-white font-normal text-sm mb-2">
                <Mail className="w-4 h-4 text-white" />
                Email
              </label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={resetEmail}
                onChange={(e) => {
                  setResetEmail(e.target.value);
                  if (resetEmailError) {
                    setResetEmailError("");
                  }
                }}
                className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 appearance-none !text-white placeholder:text-white/60 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ${resetEmailError
                  ? "border-red-500"
                  : "border-white/20"
                  }`}
                data-testid="input-reset-email"
                style={{ outline: "none" }}
                required
              />
              {resetEmailError && (
                <p className="text-red-400 text-sm mt-2 font-normal" data-testid="reset-email-error">
                  {resetEmailError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-auto bg-gradient-to-r from-white to-gray-200 text-black font-normal py-3 rounded-[18px] mt-6"
              disabled={isResetLoading}
              data-testid="button-request-reset-code"
            >
              {isResetLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Sending...
                </>
              ) : (
                "Send Code"
              )}
            </Button>
          </form>
        ) : resetStep === "verify" ? (
          <form onSubmit={handleVerifyResetCode} className="space-y-4">
            <p className="text-white/70 text-sm text-center">
              Enter the code sent to {resetEmail}.
            </p>

            {/* Code field */}
            <div>
              <label className="flex items-center gap-2 text-white font-normal text-sm mb-2">
                <Lock className="w-4 h-4 text-white" />
                Reset Code
              </label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="6 digit code"
                value={resetCode}
                onChange={(e) => {
                  setResetCode(e.target.value);
                  if (resetCodeError) {
                    setResetCodeError("");
                  }
                }}
                className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 appearance-none !text-white placeholder:text-white/60 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 tracking-widest text-center text-lg ${resetCodeError
                  ? "border-red-500"
                  : "border-white/20"
                  }`}
                data-testid="input-reset-code"
                style={{ outline: "none" }}
                maxLength={6}
                required
                autoFocus
              />
              {resetCodeError && (
                <p className="text-red-400 text-sm mt-2 font-normal" data-testid="reset-code-error">
                  {resetCodeError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-auto bg-gradient-to-r from-white to-gray-200 text-black font-normal py-3 rounded-[18px] mt-6"
              disabled={isResetLoading}
              data-testid="button-verify-reset-code"
            >
              {isResetLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Verifying...
                </>
              ) : (
                "Confirm Code"
              )}
            </Button>

            <button
              type="button"
              onClick={() => setResetStep("request")}
              className="w-full text-white/60 text-sm underline"
              data-testid="button-reset-back"
            >
              Use a different email
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-white/70 text-sm text-center">
              Choose a new password for {resetEmail}.
            </p>

            {/* New password field */}
            <div>
              <label className="flex items-center gap-2 text-white font-normal text-sm mb-2">
                <Lock className="w-4 h-4 text-white" />
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewPassword(value);

                    // Real-time validation
                    if (value.length > 0 && value.length < 6) {
                      setNewPasswordError("Password is too short");
                    } else {
                      setNewPasswordError("");
                    }
                  }}
                  className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 pr-12 appearance-none !text-white placeholder:text-white/60 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ${newPasswordError
                    ? "border-red-500"
                    : "border-white/20"
                    }`}
                  data-testid="input-new-password"
                  style={{ outline: "none" }}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-transparent p-2 transition-all duration-200"
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {newPasswordError && (
                <p className="text-red-400 text-sm mt-2 font-normal" data-testid="new-password-error">
                  {newPasswordError}
                </p>
              )}
            </div>

            {/* Confirm password field */}
            <div>
              <label className="flex items-center gap-2 text-white font-normal text-sm mb-2">
                <Lock className="w-4 h-4 text-white" />
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  type={showConfirmNewPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-auto bg-white/5 border-white/20 rounded-[18px] px-4 py-3 pr-12 appearance-none !text-white placeholder:text-white/60 border-white/20 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-confirm-password"
                  style={{ outline: "none" }}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-transparent p-2 transition-all duration-200"
                  data-testid="button-toggle-confirm-new-password"
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-auto bg-gradient-to-r from-white to-gray-200 text-black font-normal py-3 rounded-[18px] mt-6"
              disabled={isResetLoading}
              data-testid="button-reset-submit"
            >
              {isResetLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <button
              type="button"
              onClick={() => setResetStep("request")}
              className="w-full text-white/60 text-sm underline"
              data-testid="button-reset-back"
            >
              Use a different email
            </button>
          </form>
        )}
      </BottomSheet>

      <BottomSheet open={legalSheet === "privacy"} onClose={() => setLegalSheet(null)}>
        <PrivacyPolicyContent />
      </BottomSheet>
      <BottomSheet open={legalSheet === "terms"} onClose={() => setLegalSheet(null)}>
        <TermsOfServiceContent />
      </BottomSheet>
    </div>
  );
}
