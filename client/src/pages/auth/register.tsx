import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { ArrowLeft, UserPlus, User, Mail, Lock, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Import 3D assets to match app style
import crownIcon from "@assets/crown_3d_1758055496784.png";
import AppleLoginButton from "@/components/AppleLoginButton";

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
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const setUser = useUserStore((state) => state.setUser);

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
      setEmailError("Adresse email invalide");
      isValid = false;
    }

    // Validate password length
    if (password.length < 6) {
      setPasswordError("Le mot de passe est trop court");
      isValid = false;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setConfirmPasswordError("Les mots de passe ne correspondent pas");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !email.trim() || !password.trim()) {
      toast({
        title: "Informations manquantes",
        description: "Veuillez remplir tous les champs",
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
      
      // Étape 1 : Inscription avec Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });
      
      if (error) {
        // Handle specific Supabase errors
        if (error.message.includes('already registered')) {
          setEmailError("Cet email est déjà utilisé");
        } else if (error.message.includes('Password should be')) {
          setPasswordError("Le mot de passe doit contenir au moins 6 caractères");
        } else if (error.message.includes('Invalid email')) {
          setEmailError("Format d'email invalide");
        } else {
          toast({
            title: "Erreur d'inscription",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      // Étape 2 : Vérifier si on a une session, sinon faire un signInWithPassword
      let session = data.session;
      if (!session) {
        const loginResult = await supabase.auth.signInWithPassword({ email, password });
        if (loginResult.error) {
          toast({
            title: "Erreur de connexion",
            description: loginResult.error.message,
            variant: "destructive",
          });
          return;
        }
        session = loginResult.data.session;
      }

      if (session) {
        // Étape 3 : Récupérer le profil utilisateur depuis la DB
        try {
          const response = await apiRequest('GET', '/api/user/profile');
          const userData = await response.json();
          
          // Étape 4 : Mettre à jour le store et rediriger
          setUser(userData);
          
          toast({
            title: "Compte créé avec succès!",
            description: "Bienvenue dans FaceUp Blackjack!",
          });
          
          navigate("/home");
        } catch (profileError: any) {
          // Si on ne peut pas récupérer le profil, on affiche l'erreur mais on essaie quand même de rediriger
          console.error('Failed to fetch profile:', profileError);
          toast({
            title: "Connexion réussie",
            description: "Redirection vers le jeu...",
          });
          navigate("/home");
        }
      } else {
        toast({
          title: "Erreur de session",
          description: "Impossible de créer une session. Veuillez réessayer.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Erreur réseau",
        description: "Une erreur s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Gradient background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-10 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-20 w-96 h-96 bg-accent-gold/10 rounded-full blur-3xl" />
      </div>
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div 
            className="p-8 relative overflow-hidden"
            style={{ backgroundColor: '#000000' }}
          >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0" style={{ backgroundColor: '#000000' }} />
            
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
              <h1 className="text-4xl font-black text-white mb-4 tracking-tight bg-gradient-to-r from-white via-white to-accent-gold/80 bg-clip-text">Rejoindre FaceUp</h1>
              <p className="text-white/70 text-lg font-medium">
                Commencez votre voyage vers la maîtrise du blackjack aujourd'hui
              </p>
            </motion.div>

            {/* Email signup button or form */}
            {!showEmailForm ? (
              <motion.div
                className="relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <motion.button
                  onClick={() => setShowEmailForm(true)}
                  className="w-full text-white font-black text-lg py-5 rounded-2xl shadow-2xl border border-white/20 relative overflow-hidden bg-white/5"
                  data-testid="button-email-signup"
                >
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    <Mail className="w-5 h-5 text-white" />
                    <span>S'inscrire avec un e-mail</span>
                  </div>
                </motion.button>
              </motion.div>
            ) : (
              <motion.form 
                onSubmit={handleSubmit} 
                className="space-y-5 relative z-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                <label className="flex items-center gap-3 text-white font-bold text-base mb-3">
                  <User className="w-4 h-4 text-white" />
                  Nom d'utilisateur
                </label>
                <Input
                  type="text"
                  placeholder="Choisissez un nom d'utilisateur"
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
                      : "border-white/20 focus:border-white"
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
                  <Mail className="w-4 h-4 text-white" />
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="Entrez votre email"
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
                      : "border-white/20 focus:border-white"
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
                  <Lock className="w-4 h-4 text-white" />
                  Mot de passe
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Créez un mot de passe"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      // Clear error when user types
                      if (passwordError) {
                        setPasswordError("");
                      }
                    }}
                    className={`w-full bg-white/5 rounded-2xl px-4 py-4 pr-12 !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                      passwordError 
                        ? "border-red-500 focus:border-red-400" 
                        : "border-white/20 focus:border-white"
                    }`}
                    data-testid="input-password"
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
                  <CheckCircle className="w-4 h-4 text-white" />
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmez votre mot de passe"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      // Clear error when user types
                      if (confirmPasswordError) {
                        setConfirmPasswordError("");
                      }
                    }}
                    className={`w-full bg-white/5 rounded-2xl px-4 py-4 pr-12 !text-white placeholder:text-white/60 text-base focus:bg-white/10 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300 backdrop-blur-sm ${
                      confirmPasswordError 
                        ? "border-red-500 focus:border-red-400" 
                        : "border-white/20 focus:border-white"
                    }`}
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
              </motion.div>

              <motion.div
                className="pt-4"
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-gray-300 text-black font-black text-lg py-5 rounded-2xl shadow-2xl border border-white/20 relative overflow-hidden group transition-all duration-300"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10 flex items-center justify-center space-x-3">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                        <span>Création du compte...</span>
                      </>
                    ) : (
                      <>
                        <span>Créer un compte</span>
                      </>
                    )}
                  </div>
                </Button>
              </motion.div>
            </motion.form>
            )}

            {/* Separator */}
            <motion.div 
              className="mt-8 mb-6 text-center relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: showEmailForm ? 0.4 : 0.7 }}
            >
              <div className="text-white/70 text-lg">— or —</div>
            </motion.div>

            {/* Apple Login Button */}
            <motion.div
              className="relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: showEmailForm ? 0.5 : 0.75 }}
            >
              <AppleLoginButton />
            </motion.div>

            {/* Footer */}
            <motion.div 
              className="mt-8 text-center relative z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <p className="text-white/70 text-lg">
                  Vous avez déjà un compte ?{" "}
                  <Link 
                    href="/login" 
                    className="text-white hover:text-gray-300 font-bold transition-colors duration-300 hover:underline decoration-2 underline-offset-4"
                  >
                    Se connecter
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