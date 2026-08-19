import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { FaApple } from "react-icons/fa";

import homeShot from "@assets/onboarding_home_1.png";
import profileShot from "@assets/onboarding_profile_1.png";
import gameShot from "@assets/onboarding_game_1.png";

// One slide per real in-app screenshot — swiped automatically, same spirit as a native
// App Store onboarding carousel (device frame + one punchy line per slide).
const SLIDES = [
  { image: homeShot, headline: "Jump back into the action." },
  { image: profileShot, headline: "Track every win, every hand." },
  { image: gameShot, headline: "Play blackjack, your way." },
];

const SLIDE_DURATION_MS = 3000;

export default function Welcome() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const loginWithApple = useUserStore((state) => state.loginWithApple);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

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

  return (
    <div className="h-screen text-white relative overflow-hidden bg-black flex flex-col">
      {/* Phone mockup - a crisp CSS-drawn frame (scales perfectly, no raster artifacts),
          cropped short with a soft blur fade instead of showing the whole device - the same
          "cut off partway down" look as a native App Store onboarding hero. */}
      <div className="flex justify-center pt-10 px-6">
        <div className="relative overflow-hidden" style={{ width: 210, height: 300 }}>
          {/* Full device, pinned to the top of the (shorter) crop box below it */}
          <div
            className="absolute top-0 left-0 w-full rounded-[2.4rem] border-[6px] border-[#1c1c1e] bg-black shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)] overflow-hidden"
            style={{ aspectRatio: "9 / 19.5" }}
          >
            {/* Dynamic island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-16 h-5 bg-black rounded-full ring-1 ring-white/10 z-20" />

            {/* Plain CSS opacity crossfade - a JS-driven (framer-motion) tween can get stuck
                mid-fade if the tab isn't actively focused/painting every frame; a CSS
                transition is driven by the compositor instead and doesn't have that problem. */}
            {SLIDES.map((s, i) => (
              <img
                key={s.image}
                src={s.image}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: i === slide ? 1 : 0, transition: "opacity 0.5s ease" }}
              />
            ))}
          </div>

          {/* The crop line: blur first, then fade to solid black, so the cut reads as hazy
              rather than a hard edge. */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              maskImage: "linear-gradient(to bottom, transparent, black 70%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent, black 70%)",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, transparent, #000000 92%)" }}
          />
        </div>
      </div>

      {/* Headline that swaps with the slide, + dots */}
      <div className="text-center px-8 mt-6">
        <h2 className="text-2xl font-black tracking-tight text-white">
          {SLIDES[slide].headline}
        </h2>

        <div className="flex items-center justify-center gap-1.5 mt-4">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide ? "w-5 bg-[#38bdf8]" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* CTAs — same destinations/behavior as the existing register flow */}
      <div className="px-6 pt-8 pb-6 space-y-3">
        <Link href="/register">
          <button
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-2xl flex items-center justify-center space-x-3 border border-white/10"
            data-testid="button-welcome-signup-mail"
          >
            <Mail className="w-5 h-5" />
            <span>Sign up with mail</span>
          </button>
        </Link>

        {Capacitor.isNativePlatform() && (
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={isAppleLoading}
            className="w-full bg-white text-black font-semibold py-3 px-4 rounded-2xl flex items-center justify-center space-x-3 border border-white/10"
            data-testid="button-welcome-apple"
          >
            {isAppleLoading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <FaApple className="w-5 h-5" />
                <span>Continue with Apple</span>
              </>
            )}
          </button>
        )}

        <div className="bg-white/5 rounded-2xl p-4 backdrop-blur-sm text-center">
          <p className="text-white/70 text-base">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-white hover:text-gray-300 font-bold transition-colors duration-300 hover:underline decoration-2 underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-white/50 text-xs text-center pt-1">
          By creating an account, you agree to our{" "}
          <Link href="/legal/terms-of-service" className="text-white/70 underline hover:text-white">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy-policy" className="text-white/70 underline hover:text-white">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
