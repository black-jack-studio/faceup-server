import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useLocation, Link } from "wouter";
import { LogIn, User, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../../lib/queryClient";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { FaApple } from "react-icons/fa";

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
    <div className="min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Gradient background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-96 h-96 bg-accent-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
      </div>


      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="bg-black rounded-3xl p-8 relative overflow-hidden"
          >
            {/* Black overlay */}
            <div className="absolute inset-0 bg-black rounded-3xl" />

            {/* 3D Icon */}
            <motion.div
              className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center"
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
              className="text-center mb-10 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h1 className="text-4xl font-black text-white mb-4 tracking-tight bg-gradient-to-r from-white to-white/80 bg-clip-text">
                Welcome Back
              </h1>
              <p className="text-white/70 text-lg font-medium">
                Sign in to keep playing modern blackjack
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-6 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <div>
                <label className="flex items-center gap-3 text-white font-bold text-lg mb-3">
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
                  className={`w-full h-auto bg-white/5 rounded-[23px] px-5 py-4 appearance-none !text-white placeholder:text-white/60 text-lg focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${usernameError
                    ? "border-red-500"
                    : "border-white/20"
                    }`}
                  data-testid="input-username"
                  style={{ outline: "none" }}
                />
                {usernameError && (
                  <motion.p
                    className="text-red-400 text-sm mt-2 font-medium"
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
                <label className="flex items-center gap-3 text-white font-bold text-lg mb-3">
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
                    className={`w-full h-auto bg-white/5 rounded-[23px] px-5 py-4 pr-12 appearance-none !text-white placeholder:text-white/60 text-lg focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${passwordError
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
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 rounded-xl p-2"
                    data-testid="button-toggle-password"
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
                    data-testid="password-error"
                  >
                    {passwordError}
                  </motion.p>
                )}
                <p className="text-white/50 text-sm mt-3 text-left">
                  Forgot your password?{" "}
                  <Dialog open={isResetModalOpen} onOpenChange={(open) => open ? setIsResetModalOpen(true) : resetModalClose()}>
                    <DialogTrigger asChild>
                      <button
                        className="text-white font-bold"
                        data-testid="button-forgot-password"
                      >
                        Reset Password
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-white/10 backdrop-blur-xl border-white/20 text-white max-w-md !rounded-[23px]">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center text-white">
                          Reset Password
                        </DialogTitle>
                      </DialogHeader>

                      {resetStep === "request" ? (
                        <form onSubmit={handleRequestResetCode} className="space-y-4 mt-6">
                          <p className="text-white/70 text-sm text-center">
                            Enter your account email and we'll send you a code to reset your password.
                          </p>
                          {/* Email field */}
                          <div>
                            <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
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
                              className={`w-full h-auto bg-white/5 rounded-[23px] px-4 py-4 appearance-none !text-white placeholder:text-white/60 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ${resetEmailError
                                ? "border-red-500"
                                : "border-white/20"
                                }`}
                              data-testid="input-reset-email"
                              style={{ outline: "none" }}
                              required
                            />
                            {resetEmailError && (
                              <p className="text-red-400 text-sm mt-2 font-medium" data-testid="reset-email-error">
                                {resetEmailError}
                              </p>
                            )}
                          </div>

                          <Button
                            type="submit"
                            className="w-full h-auto bg-gradient-to-r from-white to-gray-200 text-black font-bold py-4 rounded-[23px] mt-6"
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
                        <form onSubmit={handleVerifyResetCode} className="space-y-4 mt-6">
                          <p className="text-white/70 text-sm text-center">
                            Enter the code sent to {resetEmail}.
                          </p>

                          {/* Code field */}
                          <div>
                            <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
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
                              className={`w-full h-auto bg-white/5 rounded-[23px] px-4 py-4 appearance-none !text-white placeholder:text-white/60 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 tracking-widest text-center text-lg ${resetCodeError
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
                              <p className="text-red-400 text-sm mt-2 font-medium" data-testid="reset-code-error">
                                {resetCodeError}
                              </p>
                            )}
                          </div>

                          <Button
                            type="submit"
                            className="w-full h-auto bg-gradient-to-r from-white to-gray-200 text-black font-bold py-4 rounded-[23px] mt-6"
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
                        <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
                          <p className="text-white/70 text-sm text-center">
                            Choose a new password for {resetEmail}.
                          </p>

                          {/* New password field */}
                          <div>
                            <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
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
                                className={`w-full h-auto bg-white/5 rounded-[23px] px-4 py-4 pr-12 appearance-none !text-white placeholder:text-white/60 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 ${newPasswordError
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
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 rounded-xl p-2"
                                data-testid="button-toggle-new-password"
                              >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </div>
                            {newPasswordError && (
                              <p className="text-red-400 text-sm mt-2 font-medium" data-testid="new-password-error">
                                {newPasswordError}
                              </p>
                            )}
                          </div>

                          {/* Confirm password field */}
                          <div>
                            <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                              <Lock className="w-4 h-4 text-white" />
                              Confirm New Password
                            </label>
                            <div className="relative">
                              <Input
                                type={showConfirmNewPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full h-auto bg-white/5 border-white/20 rounded-[23px] px-4 py-4 pr-12 appearance-none !text-white placeholder:text-white/60 border-white/20 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
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
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 rounded-xl p-2"
                                data-testid="button-toggle-confirm-new-password"
                              >
                                {showConfirmNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>

                          {/* Submit button */}
                          <Button
                            type="submit"
                            className="w-full h-auto bg-gradient-to-r from-white to-gray-200 text-black font-bold py-4 rounded-[23px] mt-6"
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
                    </DialogContent>
                  </Dialog>
                </p>
              </div>

              {needsEmailVerification && (
                <motion.div
                  className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-2"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="email-not-verified-notice"
                >
                  <p className="text-yellow-400 text-sm font-medium">
                    Please verify your email before signing in.
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResendingVerification}
                    className="text-white font-bold text-sm underline disabled:opacity-50"
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
                  className="w-full h-[54px] bg-gradient-to-r from-white to-gray-200 text-black font-black text-lg py-0 rounded-[23px] shadow-2xl border border-white/20 relative overflow-hidden group"
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
                  className="w-full h-[54px] bg-gradient-to-r from-white to-gray-200 text-black font-black text-lg py-0 rounded-[23px] shadow-2xl border border-white/20 relative overflow-hidden group"
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
              className="mt-8 text-center relative z-10 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div>
                <p className="text-white/70 text-lg">
                  Don't have an account?{" "}
                  <Link
                    href="/register"
                    className="text-white font-bold"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
              <p className="text-white/40 text-xs">
                <Link href="/legal/privacy-policy" className="underline hover:text-white/70">
                  Privacy Policy
                </Link>
                {" "}·{" "}
                <Link href="/legal/terms-of-service" className="underline hover:text-white/70">
                  Terms of Service
                </Link>
              </p>
            </motion.div>
          </motion.div>

          {/* Floating decorative elements */}
          <motion.div
            className="absolute -top-10 -left-10 w-4 h-4 bg-accent-gold/40 rounded-full blur-sm"
            animate={{
              y: [0, -20, 0],
              x: [0, 10, 0],
              opacity: [0.4, 0.8, 0.4]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-10 -right-10 w-3 h-3 bg-accent-purple/50 rounded-full blur-sm"
            animate={{
              y: [0, -15, 0],
              x: [0, -8, 0],
              opacity: [0.5, 0.9, 0.5]
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}