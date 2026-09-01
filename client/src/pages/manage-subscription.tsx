import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "@/icons";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import { Check, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUserStore } from "@/store/user-store";

interface SubscriptionStatus {
  membershipType: "normal" | "premium";
  isActive: boolean;
  expiresAt: string | null;
  plan: "monthly" | "annual" | null;
  price: number | null;
  cancelAtPeriodEnd: boolean;
  discounted: boolean;
}

const CANCEL_REASONS = [
  "It's too expensive",
  "I don't use it enough",
  "I'm switching to another app",
  "I had a technical issue",
  "Other",
];

const PLAN_PRICES: Record<string, number> = { monthly: 3.99, annual: 24.99 };

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Step = "overview" | "reason" | "offer" | "confirmed";

export default function ManageSubscription() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const checkSubscriptionStatus = useUserStore((state) => state.checkSubscriptionStatus);
  const [step, setStep] = useState<Step>("overview");
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { data: status, isLoading } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/subscription/status");
      return res.json();
    },
  });

  const refreshStatus = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
      checkSubscriptionStatus(),
    ]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const reason = selectedReason === "Other" ? otherReason.trim() || "Other" : selectedReason;
      await apiRequest("POST", "/api/subscription/cancel", { reason });
    },
    onSuccess: async () => {
      await refreshStatus();
      setStep("confirmed");
    },
    onError: (error: any) => {
      toast({ title: "Couldn't cancel", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/subscription/resume");
    },
    onSuccess: async () => {
      await refreshStatus();
      toast({ title: "Subscription resumed" });
    },
    onError: (error: any) => {
      toast({ title: "Couldn't resume", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const discountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/subscription/apply-discount");
    },
    onSuccess: async () => {
      await refreshStatus();
      toast({ title: "50% off applied", description: "Your discount is active from your next bill." });
      setStep("overview");
      setSelectedReason(null);
      setOtherReason("");
    },
    onError: (error: any) => {
      toast({ title: "Couldn't apply the offer", description: error?.message || "Please try again", variant: "destructive" });
    },
  });

  const handleBack = () => {
    if (step === "overview") navigate("/settings");
    else if (step === "confirmed") navigate("/settings");
    else setStep("overview");
  };

  const plan = status?.plan ?? null;
  const basePrice = plan ? PLAN_PRICES[plan] : null;
  const discountedPrice = basePrice != null ? Math.round(basePrice * 50) / 100 : null;

  return (
    <div className="fixed-safe-screen bg-black text-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        <button
          onClick={handleBack}
          className="text-white/80 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-white">Manage Subscription</h1>
        <div className="w-6"></div>
      </div>

      <div className="flex-1 flex flex-col px-6 py-6 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-white/50">Loading…</div>
        ) : (
          <AnimatePresence mode="wait">
            {step === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm mx-auto"
              >
                <div className="bg-white/10 rounded-3xl p-6 mb-6">
                  <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <PremiumCrown size={40} />
                    <div>
                      <p className="text-white font-semibold capitalize">
                        Premium {plan === "annual" ? "Annual" : "Monthly"}
                      </p>
                      <p className="text-white/60 text-sm">
                        {discountedPrice != null && status?.discounted
                          ? `${discountedPrice.toFixed(2)}€ ${plan === "annual" ? "/year" : "/mo"} (-50%)`
                          : basePrice != null
                            ? `${basePrice.toFixed(2)}€ ${plan === "annual" ? "/year" : "/mo"}`
                            : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Status</span>
                      <span className={status?.cancelAtPeriodEnd ? "text-orange-400 font-medium" : "text-green-400 font-medium"}>
                        {status?.cancelAtPeriodEnd ? "Cancels on renewal date" : "Active"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">
                        {status?.cancelAtPeriodEnd ? "Access until" : "Next billing date"}
                      </span>
                      <span className="text-white font-medium">{formatDate(status?.expiresAt ?? null)}</span>
                    </div>
                  </div>
                </div>

                {status?.cancelAtPeriodEnd ? (
                  <>
                    <p className="text-white/60 text-sm text-center mb-4">
                      Your subscription won't renew. You'll keep Premium access until {formatDate(status.expiresAt)}.
                    </p>
                    <motion.button
                      className="w-full font-semibold py-4 rounded-xl"
                      style={{ background: "#FFFFFF", color: "#15161A" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => resumeMutation.mutate()}
                      disabled={resumeMutation.isPending}
                      data-testid="button-resume-subscription"
                    >
                      {resumeMutation.isPending ? "Resuming…" : "Resume subscription"}
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    className="w-full flex items-center justify-between py-4 px-1 text-red-400 font-semibold"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setStep("reason")}
                    data-testid="button-cancel-subscription"
                  >
                    <span>Cancel my subscription</span>
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                )}
              </motion.div>
            )}

            {step === "reason" && (
              <motion.div
                key="reason"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm mx-auto flex flex-col flex-1"
              >
                <h2 className="text-xl font-bold mb-1">Why are you cancelling?</h2>
                <p className="text-white/60 text-sm mb-6">This helps us improve FaceUp Premium.</p>

                <div className="space-y-2 mb-6">
                  {CANCEL_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-xl border transition-colors ${
                        selectedReason === reason
                          ? "border-white bg-white/10"
                          : "border-white/15 hover:border-white/30"
                      }`}
                      data-testid={`reason-${reason.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    >
                      <span className="text-white text-sm">{reason}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          selectedReason === reason ? "border-white bg-white" : "border-white/30"
                        }`}
                      >
                        {selectedReason === reason && <Check className="w-3.5 h-3.5 text-black" />}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedReason === "Other" && (
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="Tell us more (optional)"
                    className="w-full bg-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/40 border border-white/15 focus:outline-none focus:border-white/40 mb-6 resize-none"
                    rows={3}
                    data-testid="input-other-reason"
                  />
                )}

                <div className="mt-auto">
                  <motion.button
                    className="w-full font-semibold py-4 rounded-xl disabled:opacity-40"
                    style={{ background: "#FFFFFF", color: "#15161A" }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!selectedReason}
                    onClick={() => setStep("offer")}
                    data-testid="button-continue-cancel"
                  >
                    Continue
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "offer" && (
              <motion.div
                key="offer"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm mx-auto flex flex-col flex-1"
              >
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="mb-4">
                    <PremiumCrown size={56} />
                  </div>
                  <h2 className="text-xl font-bold mb-2">Wait — before you go</h2>
                  <p className="text-white/60 text-sm mb-6">
                    Stay Premium at half price, for as long as your subscription stays active.
                  </p>

                  <div className="w-full bg-white/10 rounded-3xl p-6 mb-6">
                    <p className="text-white/40 text-sm line-through mb-1">
                      {basePrice != null ? `${basePrice.toFixed(2)}€${plan === "annual" ? "/year" : "/mo"}` : ""}
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {discountedPrice != null ? `${discountedPrice.toFixed(2)}€` : ""}
                      <span className="text-base text-white/60">{plan === "annual" ? "/year" : "/mo"}</span>
                    </p>
                    <p className="text-green-400 text-sm font-medium mt-1">50% off</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <motion.button
                    className="w-full font-semibold py-4 rounded-xl disabled:opacity-50"
                    style={{ background: "#FFFFFF", color: "#15161A" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => discountMutation.mutate()}
                    disabled={discountMutation.isPending || cancelMutation.isPending}
                    data-testid="button-accept-discount"
                  >
                    {discountMutation.isPending ? "Applying…" : "Get 50% off"}
                  </motion.button>
                  <motion.button
                    className="w-full font-medium py-3 text-white/60 disabled:opacity-50"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending || discountMutation.isPending}
                    data-testid="button-cancel-anyway"
                  >
                    {cancelMutation.isPending ? "Cancelling…" : "Cancel anyway"}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "confirmed" && (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center text-center"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4">
                  <Check className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-2">Subscription cancelled</h2>
                <p className="text-white/60 text-sm mb-8">
                  You'll keep Premium access until {formatDate(status?.expiresAt ?? null)}. No further charges after that.
                </p>
                <motion.button
                  className="w-full font-semibold py-4 rounded-xl"
                  style={{ background: "#FFFFFF", color: "#15161A" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/settings")}
                  data-testid="button-back-to-settings"
                >
                  Back to Settings
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
