import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";

const MOBILE_REDIRECT = 'faceup://auth/callback';
const WEB_REDIRECT = `${window.location.origin}/auth/callback`;

function getRedirectUrl() {
  return Capacitor.isNativePlatform() ? MOBILE_REDIRECT : WEB_REDIRECT;
}

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
          redirectTo: getRedirectUrl(),
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
      className="w-full bg-black text-white font-semibold py-3 px-4 rounded-2xl flex items-center justify-center space-x-3 border border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Sign in with Apple"
      data-testid="button-apple-signin"
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <>
          <span className="text-base">{"\uF8FF"}</span>
          <span className="text-base ml-2">Sign up with Apple</span>
        </>
      )}
    </button>
  );
}
