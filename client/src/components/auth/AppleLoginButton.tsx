import { useState } from "react";
import { Apple } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

export function AppleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      
      if (import.meta.env.DEV) {
        console.log("Starting Apple OAuth...");
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Apple sign-in error:", error);
      toast({
        title: "Sign-in failed",
        description: error.message || "Could not sign in with Apple",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleAppleSignIn}
      disabled={isLoading}
      className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center space-x-3 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Sign in with Apple"
      data-testid="button-apple-signin"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <Apple className="w-5 h-5" fill="currentColor" />
          <span>Sign in with Apple</span>
        </>
      )}
    </button>
  );
}
