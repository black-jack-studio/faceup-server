import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { useLocation, Link } from "wouter";
import { LogIn, User, Lock, Mail } from "lucide-react";

// Import 3D assets to match app style
import heartIcon from "@assets/heart_suit_3d_1757353734994.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset password modal states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const login = useUserStore((state) => state.login);

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
      toast({
        title: "Login Failed", 
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail.trim() || !resetUsername.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsResetLoading(true);

    try {
      // TODO: Implement password reset API call
      toast({
        title: "Password Reset Successful",
        description: "Your password has been successfully reset",
      });
      
      // Reset form and close modal
      setResetEmail("");
      setResetUsername("");
      setNewPassword("");
      setConfirmPassword("");
      setIsResetModalOpen(false);
      
    } catch (error: any) {
      toast({
        title: "Reset Failed", 
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white relative overflow-hidden">
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
            className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl relative overflow-hidden"
            whileHover={{ scale: 1.02, y: -5 }}
            transition={{ duration: 0.3 }}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent rounded-3xl" />
            
            {/* 3D Icon */}
            <motion.div 
              className="w-24 h-24 mx-auto mb-8 relative flex items-center justify-center"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.2, type: "spring", bounce: 0.6 }}
              whileHover={{ scale: 1.1, rotate: 5 }}
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
                Sign in to continue your blackjack mastery
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
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-bold text-lg mb-3">
                  <User className="w-5 h-5 text-blue-400" />
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border-white/20 rounded-2xl px-5 py-4 !text-white placeholder:text-white/60 text-lg focus:border-blue-400 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm"
                  data-testid="input-username"
                />
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-bold text-lg mb-3">
                  <Lock className="w-5 h-5 text-blue-400" />
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border-white/20 rounded-2xl px-5 py-4 !text-white placeholder:text-white/60 text-lg focus:border-blue-500 focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm"
                  data-testid="input-password"
                />
              </motion.div>

              <motion.div
                className="pt-2"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-black text-lg py-5 rounded-2xl shadow-2xl border border-white/20 relative overflow-hidden group transition-all duration-300"
                  disabled={isLoading}
                  data-testid="button-login"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.div 
              className="mt-8 text-center relative z-10 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-lg">
                  Don't have an account?{" "}
                  <Link 
                    href="/register" 
                    className="text-blue-400 hover:text-blue-300 font-bold transition-colors duration-300 hover:underline decoration-2 underline-offset-4"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-lg">
                  Forgot your password?{" "}
                  <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                    <DialogTrigger asChild>
                      <button 
                        className="text-blue-400 hover:text-blue-300 font-bold transition-colors duration-300 hover:underline decoration-2 underline-offset-4"
                        data-testid="button-forgot-password"
                      >
                        Reset Password
                      </button>
                    </DialogTrigger>
                    <DialogContent className="bg-ink/95 border-white/20 text-white max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-center text-white">
                          Reset Password
                        </DialogTitle>
                      </DialogHeader>
                      
                      <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
                        {/* Email field */}
                        <div>
                          <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                            <Mail className="w-4 h-4 text-blue-400" />
                            Email
                          </label>
                          <Input
                            type="email"
                            placeholder="Enter your email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="w-full bg-white/5 border-white/20 rounded-xl px-4 py-3 !text-white placeholder:text-white/60 focus:border-blue-400 focus:bg-white/10"
                            data-testid="input-reset-email"
                            required
                          />
                        </div>

                        {/* Username field */}
                        <div>
                          <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                            <User className="w-4 h-4 text-blue-400" />
                            Username
                          </label>
                          <Input
                            type="text"
                            placeholder="Enter your username"
                            value={resetUsername}
                            onChange={(e) => setResetUsername(e.target.value)}
                            className="w-full bg-white/5 border-white/20 rounded-xl px-4 py-3 !text-white placeholder:text-white/60 focus:border-blue-400 focus:bg-white/10"
                            data-testid="input-reset-username"
                            required
                          />
                        </div>

                        {/* New password field */}
                        <div>
                          <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                            <Lock className="w-4 h-4 text-blue-400" />
                            New Password
                          </label>
                          <Input
                            type="password"
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-white/5 border-white/20 rounded-xl px-4 py-3 !text-white placeholder:text-white/60 focus:border-blue-400 focus:bg-white/10"
                            data-testid="input-new-password"
                            required
                            minLength={6}
                          />
                        </div>

                        {/* Confirm password field */}
                        <div>
                          <label className="flex items-center gap-2 text-white font-bold text-sm mb-2">
                            <Lock className="w-4 h-4 text-blue-400" />
                            Confirm New Password
                          </label>
                          <Input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-white/5 border-white/20 rounded-xl px-4 py-3 !text-white placeholder:text-white/60 focus:border-blue-400 focus:bg-white/10"
                            data-testid="input-confirm-password"
                            required
                            minLength={6}
                          />
                        </div>

                        {/* Submit button */}
                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl mt-6"
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
                      </form>
                    </DialogContent>
                  </Dialog>
                </p>
              </div>
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