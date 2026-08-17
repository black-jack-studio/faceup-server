import { useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";
import { apiRequest } from "../../lib/queryClient";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    const verify = async () => {
      const token = new URLSearchParams(window.location.search).get("token");

      if (!token) {
        toast({
          title: "Invalid link",
          description: "This verification link is missing its token.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

      try {
        const response = await apiRequest("GET", `/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Verification failed");
        }

        setUser(data.user);
        toast({
          title: "Email verified!",
          description: "Welcome to FaceUp.",
        });
        navigate("/");
      } catch (error: any) {
        toast({
          title: "Couldn't verify email",
          description: error.message || "This link may have expired.",
          variant: "destructive",
        });
        navigate("/login");
      }
    };

    verify();
  }, [navigate, toast, setUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Verifying your email...</p>
      </div>
    </div>
  );
}
