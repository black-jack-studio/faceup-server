import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useLocation, Link } from "wouter";
import { ArrowLeft, UserPlus, User, Mail, Lock, CheckCircle } from "lucide-react";

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
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const register = useUserStore((state) => state.register);

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
      setConfirmPasswordError("Passwords do not match");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Missing Information",
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
      await register(username, email, password);
      toast({
        title: "Account Created",
        description: "Welcome to Offsuit Blackjack!",
      });
      navigate("/");
    } catch (error: any) {
      // Check if error is specifically about username being taken
      if (error.message && error.message.toLowerCase().includes("username")) {
        setUsernameError("Username is already taken");
      } else {
        toast({
          title: "Registration Failed",
          description: error.message || "Unable to create account",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-20 w-96 h-96 bg-accent-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-96 h-96 bg-accent-gold/10 rounded-full blur-3xl" />
      </div>

      {/* Back button */}
      <motion.div 
        className="absolute top-6 left-6 z-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="text-white hover:bg-white/10 rounded-xl p-3"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </motion.div>

      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden"
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent rounded-3xl" />
            
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
              <h1 className="text-4xl font-black text-white mb-4 tracking-tight bg-gradient-to-r from-white via-white to-accent-gold/80 bg-clip-text">
                Join Offsuit
              </h1>
              <p className="text-white/70 text-lg font-medium">
                Start your blackjack mastery journey today
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
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-bold text-base mb-3">
                  <User className="w-4 h-4" style={{ color: '#d8b4fe' }} />
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
                  className={`w-full bg-white/5 rounded-2xl px-4 py-4 !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                    usernameError 
                      ? "border-red-500 focus:border-red-400" 
                      : "border-white/20 focus:border-accent-purple"
                  }`}
                  data-testid="input-username"
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
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-bold text-base mb-3">
                  <Mail className="w-4 h-4" style={{ color: '#d8b4fe' }} />
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
                  className={`w-full bg-white/5 rounded-2xl px-4 py-4 !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                    emailError 
                      ? "border-red-500 focus:border-red-400" 
                      : "border-white/20 focus:border-accent-purple"
                  }`}
                  data-testid="input-email"
                />
                {emailError && (
                  <motion.p 
                    className="text-red-400 text-sm mt-2 font-medium"
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
                <label className="flex items-center gap-3 text-white font-bold text-base mb-3">
                  <Lock className="w-4 h-4" style={{ color: '#d8b4fe' }} />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // Clear error when user types
                    if (passwordError) {
                      setPasswordError("");
                    }
                  }}
                  className={`w-full bg-white/5 rounded-2xl px-4 py-4 !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                    passwordError 
                      ? "border-red-500 focus:border-red-400" 
                      : "border-white/20 focus:border-accent-purple"
                  }`}
                  data-testid="input-password"
                />
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
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-bold text-base mb-3">
                  <CheckCircle className="w-4 h-4" style={{ color: '#d8b4fe' }} />
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    // Clear error when user types
                    if (confirmPasswordError) {
                      setConfirmPasswordError("");
                    }
                  }}
                  className={`w-full bg-white/5 rounded-2xl px-4 py-4 !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                    confirmPasswordError 
                      ? "border-red-500 focus:border-red-400" 
                      : "border-white/20 focus:border-accent-purple"
                  }`}
                  data-testid="input-confirm-password"
                />
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
              </motion.div>

              <motion.div
                className="pt-4"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  type="submit"
                  className="w-full text-white font-black text-lg py-5 rounded-2xl shadow-2xl border border-white/20 relative overflow-hidden group transition-all duration-300"
                  style={{ backgroundColor: '#d8b4fe' }}
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Creating Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.div 
              className="mt-8 text-center relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-lg">
                  Already have an account?{" "}
                  <Link 
                    href="/login" 
                    className="text-accent-purple hover:text-purple-300 font-bold transition-colors duration-300 hover:underline decoration-2 underline-offset-4"
                  >
                    Sign In
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating decorative elements */}
          <motion.div
            className="absolute -top-12 -right-8 w-4 h-4 bg-accent-green/40 rounded-full blur-sm"
            animate={{ 
              y: [0, -25, 0],
              x: [0, -12, 0],
              opacity: [0.4, 0.9, 0.4]
            }}
            transition={{ 
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute -bottom-8 -left-12 w-3 h-3 bg-accent-gold/50 rounded-full blur-sm"
            animate={{ 
              y: [0, -18, 0],
              x: [0, 10, 0],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2.5
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}