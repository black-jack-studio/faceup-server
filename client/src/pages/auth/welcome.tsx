import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { Capacitor } from "@capacitor/core";
import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { FaApple } from "react-icons/fa";
import BottomSheet from "@/components/BottomSheet";
import { PrivacyPolicyContent } from "@/pages/legal/privacy-policy";
import { TermsOfServiceContent } from "@/pages/legal/terms-of-service";

import homeShot from "@assets/onboarding_home_1.png";
import profileShot from "@assets/onboarding_profile_1.png";
import gameShot from "@assets/onboarding_game_1.png";
import mockupFrame from "@assets/mockup_bezel_only.png";

// One slide per real in-app screenshot — swiped automatically, same spirit as a native
// App Store onboarding carousel (device frame + one punchy line per slide).
const SLIDES = [
  { image: homeShot, headline: "Jump into the action." },
  { image: profileShot, headline: "Track every win, every hand." },
  { image: gameShot, headline: "Play blackjack, your way." },
];

const SLIDE_DURATION_MS = 3000;

// Exact geometry of the phone mockup PNG (exported from the Figma iPhone 17 Pro
// mockup), so the crossfading screenshots land precisely inside its screen cutout.
const MOCK_WIDTH = 172;
const FRAME = { w: 1280, h: 2642, screenX: 55, screenY: 55, screenW: 1170, screenH: 2532, screenRadius: 165 };
const MOCK_SCALE = MOCK_WIDTH / FRAME.w;

export default function Welcome() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const loginWithApple = useUserStore((state) => state.loginWithApple);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const [slide, setSlide] = useState(0);
  const [legalSheet, setLegalSheet] = useState<"privacy" | "terms" | null>(null);

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
    <div
      className="text-white relative overflow-hidden bg-black flex flex-col justify-center"
      style={{
        height: "100dvh",
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Phone mockup - the real iPhone 17 Pro frame exported from Figma, with real
          in-app screenshots crossfading in the transparent screen cutout beneath it. */}
      <div className="flex justify-center px-6">
        <div
          className="relative shadow-[0_30px_60px_-15px_rgba(0,0,0,0.85)]"
          style={{ width: MOCK_WIDTH, aspectRatio: `${FRAME.w} / ${FRAME.h}` }}
        >
          {/* Plain CSS opacity crossfade - a JS-driven (framer-motion) tween can get stuck
              mid-fade if the tab isn't actively focused/painting every frame; a CSS
              transition is driven by the compositor instead and doesn't have that problem. */}
          {SLIDES.map((s, i) => (
            <img
              key={s.image}
              src={s.image}
              alt=""
              className="absolute object-cover"
              style={{
                left: FRAME.screenX * MOCK_SCALE,
                top: FRAME.screenY * MOCK_SCALE,
                width: FRAME.screenW * MOCK_SCALE,
                height: FRAME.screenH * MOCK_SCALE,
                borderRadius: FRAME.screenRadius * MOCK_SCALE,
                opacity: i === slide ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            />
          ))}

          {/* Frame + camera cutout on top, screen area fully transparent */}
          <img
            src={mockupFrame}
            alt=""
            className="absolute inset-0 w-full h-full pointer-events-none select-none"
          />
        </div>
      </div>

      {/* Headline that swaps with the slide, + dots */}
      <div className="text-center px-8 mt-5">
        <h2 className="text-2xl font-normal tracking-tight text-white">
          {SLIDES[slide].headline}
        </h2>

        <div className="flex items-center justify-center gap-1.5 mt-3">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide ? "w-5 bg-white" : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* CTAs — same destinations/behavior as the existing register flow */}
      <div className="px-6 space-y-3 mt-5">
        <Link href="/register">
          <button
            className="w-full bg-white text-black font-normal text-lg py-3 px-4 rounded-[23px] flex items-center justify-center space-x-3 border border-white/10"
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
            className="w-full bg-white text-black font-normal text-lg py-3 px-4 rounded-[23px] flex items-center justify-center space-x-3 border border-white/10"
            data-testid="button-welcome-apple"
          >
            {isAppleLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>Signing In...</span>
              </div>
            ) : (
              <>
                <FaApple className="w-5 h-5" />
                <span>Continue with Apple</span>
              </>
            )}
          </button>
        )}

        <Link href="/login" className="block">
          <p className="text-white text-base text-left">
            Already have an account?
          </p>
        </Link>

        <p className="text-white/50 text-xs text-center pt-1">
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
