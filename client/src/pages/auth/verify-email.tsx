import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { apiRequest } from "../../lib/queryClient";

export default function VerifyEmail() {
  const { t } = useTranslation("verifyEmail");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    const verify = async () => {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        toast({
          title: t("invalidLinkTitle"),
          description: t("invalidLinkDescription"),
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      try {
        const response = await apiRequest("GET", `/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || t("verificationFailedFallback"));
        }

        setUser(data.user);
        toast({
          title: t("verifiedTitle"),
          description: t("verifiedDescription"),
        });
        navigate("/");
      } catch (error: any) {
        toast({
          title: t("failedTitle"),
          description: error.message || t("failedDescription"),
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    verify();
  }, [navigate, toast, setUser, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">{t("verifying")}</p>
      </div>
    </div>
  );
}
