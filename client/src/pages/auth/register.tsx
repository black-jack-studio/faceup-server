import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { ArrowLeft, UserPlus, User, Mail, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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

    // Validate password length
    if (password.length < 6) {
      setPasswordError("Password is too short");
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
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-200"
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
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl p-2 transition-all duration-200"
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
                  className="w-full h-[46px] bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-normal text-xl py-0 rounded-[18px] shadow-2xl border border-white/20 relative overflow-hidden group transition-all duration-300"
                  disabled={isLoading}
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

            {/* Footer */}
            <motion.div 
              className="mt-8 text-center relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Link href="/login" className="block">
                <p className="text-white text-lg text-left">
                  Already have an account?
                </p>
              </Link>
            </motion.div>
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