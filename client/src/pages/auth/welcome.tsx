import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

// One slide per real in-app screenshot — swiped automatically, same spirit as a native
// App Store onboarding carousel (one punchy line per slide). These are already full device
// mockup renders (bezel baked into the image itself, transparent background) — shown as-is,
// no frame overlay of our own on top (Anatole, 2026-09-15: "pas de cadre blanc").
const SLIDES = [
  { image: homeShot, headlineKey: "slide1" },
  { image: profileShot, headlineKey: "slide2" },
  { image: gameShot, headlineKey: "slide3" },
] as const;

const SLIDE_DURATION_MS = 3000;

// Same on-screen footprint the old Figma phone mockup used to reserve (its frame was
// MOCK_WIDTH=172 wide at this same FRAME.h/FRAME.w aspect ratio) — height fixed, width auto
// from each slide's own aspect ratio so nothing stretches.
const MOCK_HEIGHT = 172 * (2642 / 1280);

export default function Welcome() {
  const { t } = useTranslation("welcome");
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
      toast({ message: t("appleSignInFailedTitle") });
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
      {/* Real in-app screenshots (already full device mockup renders) crossfading in place —
          no frame of our own drawn on top. */}
      <div className="flex justify-center px-6">
        <div className="relative" style={{ height: MOCK_HEIGHT }}>
          {/* Plain CSS opacity crossfade - a JS-driven (framer-motion) tween can get stuck
              mid-fade if the tab isn't actively focused/painting every frame; a CSS
              transition is driven by the compositor instead and doesn't have that problem. */}
          {SLIDES.map((s, i) => (
            <img
              key={s.image}
              src={s.image}
              alt=""
              className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-auto object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.85)]"
              style={{
                opacity: i === slide ? 1 : 0,
                transition: "opacity 0.5s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* Headline that swaps with the slide, + dots */}
      <div className="text-center px-8 mt-5">
        <h2 className="text-2xl font-normal tracking-tight text-white">
          {t(SLIDES[slide].headlineKey)}
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
            className="w-full bg-white text-black font-bold text-lg py-3 px-4 rounded-[23px] flex items-center justify-center space-x-3 border border-white/10"
            data-testid="button-welcome-signup-mail"
          >
            <Mail className="w-5 h-5" strokeWidth={2.75} />
            <span>{t("signUpWithMail")}</span>
          </button>
        </Link>

        {Capacitor.isNativePlatform() && (
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={isAppleLoading}
            className="w-full bg-white text-black font-bold text-lg py-3 px-4 rounded-[23px] flex items-center justify-center space-x-3 border border-white/10"
            data-testid="button-welcome-apple"
          >
            {isAppleLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>{t("signingIn")}</span>
              </div>
            ) : (
              <>
                <FaApple className="w-5 h-5" />
                <span>{t("continueWithApple")}</span>
              </>
            )}
          </button>
        )}

        <Link href="/login" className="block text-center">
          <p className="text-white/70 text-base underline">
            {t("alreadyHaveAccount")}
          </p>
        </Link>

        <p className="text-white/50 text-xs text-center pt-1">
          {t("agreementPrefix")}{" "}
          <button type="button" onClick={() => setLegalSheet("terms")} className="text-white/70 underline hover:text-white">
            {t("termsOfService")}
          </button>{" "}
          {t("and")}{" "}
          <button type="button" onClick={() => setLegalSheet("privacy")} className="text-white/70 underline hover:text-white">
            {t("privacyPolicy")}
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
