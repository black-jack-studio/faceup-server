import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useLocation, Link } from "wouter";
import { User, Mail, Lock, CheckCircle, Eye, EyeOff, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getPasswordStrength, getPasswordRequirements, meetsPasswordRequirements } from "@shared/passwordStrength";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { FaApple } from "react-icons/fa";
import BottomSheet from "@/components/BottomSheet";
import { PrivacyPolicyContent } from "@/pages/legal/privacy-policy";
import { TermsOfServiceContent } from "@/pages/legal/terms-of-service";

// Import 3D assets to match app style
import crownIcon from "@assets/crown_3d_1758055496784.png";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [legalSheet, setLegalSheet] = useState<"privacy" | "terms" | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();
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

  // Empty string reads as "weak" too, but the bar itself only renders once there's something
  // typed (see below) — nothing to show before that.
  const passwordStrength = getPasswordStrength(password);
  const passwordRequirements = getPasswordRequirements(password);
  const PASSWORD_CHECKLIST: { key: keyof typeof passwordRequirements; label: string }[] = [
    { key: "minLength", label: "At least 8 characters" },
    { key: "hasDigit", label: "At least 1 number" },
    { key: "hasSpecialChar", label: "At least 1 special character (e.g. ! @ # $ % &)" },
  ];
  const STRENGTH_METER: Record<ReturnType<typeof getPasswordStrength>, { label: string; barColor: string; textColor: string; segments: number }> = {
    weak: { label: "Weak", barColor: "bg-red-400", textColor: "text-red-400", segments: 1 },
    medium: { label: "Medium", barColor: "bg-yellow-400", textColor: "text-yellow-400", segments: 2 },
    strong: { label: "Strong", barColor: "bg-[#B5F3C7]", textColor: "text-[#B5F3C7]", segments: 3 },
  };

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;

    // Clear all errors
    setUsernameError("");
    setEmailError("");
    setPasswordError("");
    setConfirmPasswordError("");

    // Validate email
    if (!validateEmail(email)) {
      setEmailError("Invalid email address");
      isValid = false;
    }

    // Validate password requirements
    if (!meetsPasswordRequirements(password)) {
      setPasswordError("Password doesn't meet the requirements above");
      isValid = false;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Clear all errors
      setUsernameError("");
      setEmailError("");
      setPasswordError("");
      setConfirmPasswordError("");

      // Register with Replit DB
      await apiRequest('POST', '/api/auth/register', {
        username,
        email,
        password
      });

      toast({
        title: "Check your email",
        description: "We sent you a verification link. Confirm your email to finish creating your account.",
      });

      navigate("/login");
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error?.message || "Registration failed";

      // Handle specific errors
      if (errorMessage.includes("Username already taken")) {
        setUsernameError("This username is already taken");
      } else if (errorMessage.includes("Email already registered")) {
        setEmailError("This email is already in use");
      } else if (errorMessage.includes("Password")) {
        setPasswordError(errorMessage);
      } else if (errorMessage.includes("email")) {
        setEmailError(errorMessage);
      } else {
        toast({
          title: "Registration error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden bg-black">
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="p-8 relative overflow-hidden bg-black"
          >
            
            {/* 3D Icon */}
            <motion.div 
              className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center"
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.6 }}
              whileHover={{ scale: 1.1, rotate: -5 }}
            >
              <img 
                src={crownIcon} 
                alt="Join Offsuit" 
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
              <h1 className="text-4xl font-normal text-white mb-4 tracking-tight bg-gradient-to-r from-white via-white to-accent-gold/80 bg-clip-text">Join FaceUp</h1>
              <p className="text-white/70 text-lg font-normal">
                Modern blackjack starts here
              </p>
            </motion.div>

            {/* Email signup form - always shown; the "Sign up with mail" / "Continue with
                Apple" choice already happened on the onboarding screen that links here. */}
            <motion.form
              onSubmit={handleSubmit}
              className="space-y-5 relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-normal text-base mb-3">
                  <User className="w-4 h-4 text-white" />
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    // Clear error when user types
                    if (usernameError) {
                      setUsernameError("");
                    }
                  }}
                  className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 appearance-none !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                    usernameError 
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
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-normal text-base mb-3">
                  <Mail className="w-4 h-4 text-white" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    // Clear error when user types
                    if (emailError) {
                      setEmailError("");
                    }
                  }}
                  className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 appearance-none !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                    emailError
                      ? "border-red-500"
                      : "border-white/20"
                      }`}
                  data-testid="input-email"
                  style={{ outline: "none" }}
                />
                {emailError && (
                  <motion.p 
                    className="text-red-400 text-sm mt-2 font-normal"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    data-testid="email-error"
                  >
                    {emailError}
                  </motion.p>
                )}
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-normal text-base mb-3">
                  <Lock className="w-4 h-4 text-white" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Clear error when user types
                      if (passwordError) {
                        setPasswordError("");
                      }
                    }}
                    className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 pr-12 appearance-none !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                      passwordError 
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
                {password.length > 0 && (
                  <motion.div
                    className="flex items-center gap-2 mt-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    data-testid="password-strength"
                  >
                    <div className="flex-1 flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            i < STRENGTH_METER[passwordStrength].segments ? STRENGTH_METER[passwordStrength].barColor : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                    <span className={`text-xs font-medium ${STRENGTH_METER[passwordStrength].textColor}`}>
                      {STRENGTH_METER[passwordStrength].label}
                    </span>
                  </motion.div>
                )}
                {password.length > 0 && (
                  <motion.div
                    className="mt-3 space-y-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    data-testid="password-requirements"
                  >
                    {PASSWORD_CHECKLIST.map(({ key, label }) => {
                      const met = passwordRequirements[key];
                      return (
                        <div key={key} className="flex items-center gap-2">
                          {met ? (
                            <Check className="w-3.5 h-3.5 shrink-0 text-[#B5F3C7]" />
                          ) : (
                            <X className="w-3.5 h-3.5 shrink-0 text-red-400" />
                          )}
                          <span className={`text-xs ${met ? "text-[#B5F3C7]" : "text-white/50"}`}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
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
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-normal text-base mb-3">
                  <CheckCircle className="w-4 h-4 text-white" />
                  Confirm password
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      // Clear error when user types
                      if (confirmPasswordError) {
                        setConfirmPasswordError("");
                      }
                    }}
                    className={`w-full h-auto bg-white/5 rounded-[18px] px-4 py-3 pr-12 appearance-none !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                      confirmPasswordError 
                        ? "border-red-500"
                        : "border-white/20"
                        }`}
                    data-testid="input-confirm-password"
                    style={{ outline: "none" }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-transparent p-2 transition-all duration-200"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                {confirmPasswordError && (
                  <motion.p 
                    className="text-red-400 text-sm mt-2 font-normal"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    data-testid="confirm-password-error"
                  >
                    {confirmPasswordError}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                className="pt-4"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  type="submit"
                  className="w-full h-[46px] bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-bold text-lg py-0 rounded-[18px] shadow-2xl border border-white/20 relative overflow-hidden group transition-all duration-300"
                  disabled={isLoading || !meetsPasswordRequirements(password)}
                  data-testid="button-register"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create account</span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>

              {/* Apple Sign-In — native platforms only; there's no web fallback configured
                  (would need a Services ID + redirect flow), so it's hidden on the browser
                  build rather than shown broken. */}
              {Capacitor.isNativePlatform() && (
                <motion.div
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
                    className="w-full h-[46px] bg-gradient-to-r from-white to-gray-200 text-black font-bold text-lg py-0 rounded-[18px] shadow-2xl border border-white/20 relative overflow-hidden group"
                    data-testid="button-apple-signup"
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

              <Link href="/login" className="block">
                <p className="text-white/70 text-lg text-center underline">
                  Already have an account?
                </p>
              </Link>

              <p className="text-white/50 text-xs text-center pt-2">
                By creating an account, you agree to our{" "}
                <button type="button" onClick={() => setLegalSheet("terms")} className="text-white/70 underline hover:text-white">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" onClick={() => setLegalSheet("privacy")} className="text-white/70 underline hover:text-white">
                  Privacy Policy
                </button>
                .
              </p>
            </motion.form>
          </motion.div>
        </motion.div>
      </div>

      <BottomSheet open={legalSheet === "privacy"} onClose={() => setLegalSheet(null)}>
        <PrivacyPolicyContent />
      </BottomSheet>
      <BottomSheet open={legalSheet === "terms"} onClose={() => setLegalSheet(null)}>
        <TermsOfServiceContent />
      </BottomSheet>
    </div>
  );
}