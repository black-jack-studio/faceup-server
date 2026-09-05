import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "@/icons";
import { PremiumCrown } from "@/components/ui/PremiumCrown";
import { AlertTriangle, Check } from "lucide-react";
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
  subscribedSince: string | null;
}

const CANCEL_REASON_IDS = [
  "tooExpensive",
  "notUsingEnough",
  "switchingApp",
  "technicalIssue",
  "other",
] as const;
type CancelReasonId = (typeof CANCEL_REASON_IDS)[number];

const PLAN_PRICES: Record<string, number> = { monthly: 4.99, annual: 29.99 };

function formatDate(iso: string | null, locale?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// One row per calendar month from subscribedSince through the current month, newest first --
// a monthly-plan recap of what's been charged. Flat rate (PLAN_PRICES.monthly) for every row
// rather than tracking exactly when a -50% retention discount kicked in, since there's no real
// billing history behind this (Premium is still mocked, no Stripe/RevenueCat wired up yet).
function monthlyBillingHistory(subscribedSince: string | null, monthlyPrice: number, locale?: string) {
  if (!subscribedSince) return [];
  const start = new Date(subscribedSince);
  const now = new Date();
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 1);
  const rows: { label: string; amount: number }[] = [];
  while (cursor <= last) {
    rows.push({
      label: cursor.toLocaleDateString(locale, { month: "long", year: "numeric" }),
      amount: monthlyPrice,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return rows.reverse();
}

type Step = "overview" | "reason" | "offer" | "confirm" | "confirmed";

// Direction-aware slide, matching App.tsx's own overlay convention (x: "100%" enters from the
// right moving right-to-left, exits back off to the right moving left-to-right, per Anatole):
// going deeper into the cancel flow (dir 1) slides the new step in from the right while the
// current one slides off to the left; going back (dir -1) reverses both.
const stepVariants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, x: dir === 1 ? "100%" : "-100%" }),
  center: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: dir === 1 ? "-100%" : "100%" }),
};

export default function ManageSubscription() {
  const { t, i18n } = useTranslation("manageSubscription");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const checkSubscriptionStatus = useUserStore((state) => state.checkSubscriptionStatus);
  const [step, setStep] = useState<Step>("overview");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedReason, setSelectedReason] = useState<CancelReasonId | null>(null);
  const [otherReason, setOtherReason] = useState("");

  const goToStep = (next: Step) => {
    setDirection(1);
    setStep(next);
  };

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
      // Sent as a stable, language-independent id (matches the id in `analytics`/support
      // tooling) rather than the translated label, so a French cancellation reads the same as
      // an English one on the backend.
      const reason = selectedReason === "other" ? otherReason.trim() || "other" : selectedReason;
      await apiRequest("POST", "/api/subscription/cancel", { reason });
    },
    onSuccess: async () => {
      await refreshStatus();
      setDirection(1);
      setStep("confirmed");
    },
    onError: (error: any) => {
      toast({ title: t("couldntCancelTitle"), description: error?.message || t("common:tryAgain"), variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/subscription/resume");
    },
    onSuccess: async () => {
      await refreshStatus();
      toast({ title: t("resumedTitle") });
    },
    onError: (error: any) => {
      toast({ title: t("couldntResumeTitle"), description: error?.message || t("common:tryAgain"), variant: "destructive" });
    },
  });

  const discountMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/subscription/apply-discount");
    },
    onSuccess: async () => {
      await refreshStatus();
      toast({ title: t("discountAppliedTitle"), description: t("discountAppliedDescription") });
      setDirection(-1);
      setStep("overview");
      setSelectedReason(null);
      setOtherReason("");
    },
    onError: (error: any) => {
      toast({ title: t("couldntApplyOfferTitle"), description: error?.message || t("common:tryAgain"), variant: "destructive" });
    },
  });

  const handleBack = () => {
    if (step === "overview") navigate("/settings");
    else if (step === "confirmed") navigate("/settings");
    else {
      setDirection(-1);
      setStep("overview");
    }
  };

  const plan = status?.plan ?? null;
  const basePrice = plan ? PLAN_PRICES[plan] : null;
  const discountedPrice = basePrice != null ? Math.round(basePrice * 50) / 100 : null;

  return (
    // Not .fixed-safe-screen (position: fixed) -- this now renders inside App.tsx's own
    // sliding overlay motion.div (see "manage-subscription-overlay"), which is already fixed
    // and full-screen on its own and gets animated via a transform for the slide. A
    // position:fixed descendant of a transformed ancestor anchors to that ancestor's box
    // instead of the real viewport (same trap documented on BattlePassPage/Avatars), so this
    // just fills its parent instead and handles the safe-area insets itself, same as Settings.
    <div
      className="h-full bg-black text-white flex flex-col overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        <button
          onClick={handleBack}
          className="text-white/80 hover:text-white transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-white">{t("title")}</h1>
        <div className="w-6"></div>
      </div>

      <div className="flex-1 flex flex-col px-6 py-6 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-white/50">{t("loading")}</div>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            {step === "overview" && (
              <motion.div
                key="overview"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
                className="w-full max-w-sm mx-auto"
              >
                {/* #232328 -- same sheet background as the Friend Stats popup (BottomSheet's
                    own default, see BottomSheet.tsx), per Anatole -- not the app-wide bg-white/10
                    tint every other card here still uses. */}
                <div className="rounded-3xl p-6 mb-6" style={{ backgroundColor: "#232328" }}>
                  <div className="flex flex-col items-center text-center gap-2 mb-4">
                    <PremiumCrown size={40} />
                    <div>
                      <p className="text-white font-semibold capitalize">
                        {plan === "annual" ? t("premiumAnnual") : t("premiumMonthly")}
                      </p>
                      <p className="text-white/60 text-sm">
                        {discountedPrice != null && status?.discounted
                          ? t("priceDiscounted", { price: discountedPrice.toFixed(2), period: plan === "annual" ? t("perYear") : t("perMonth") })
                          : basePrice != null
                            ? t("price", { price: basePrice.toFixed(2), period: plan === "annual" ? t("perYear") : t("perMonth") })
                            : ""}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{t("status")}</span>
                      <span className={status?.cancelAtPeriodEnd ? "text-orange-400 font-medium" : "text-green-400 font-medium"}>
                        {status?.cancelAtPeriodEnd ? t("statusCancelling") : t("statusActive")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">
                        {status?.cancelAtPeriodEnd ? t("accessUntilLabel") : t("nextBillingLabel")}
                      </span>
                      <span className="text-white font-medium">{formatDate(status?.expiresAt ?? null, i18n.language)}</span>
                    </div>
                  </div>
                </div>

                {plan === "monthly" && status?.subscribedSince && (
                  <div className="bg-white/10 rounded-3xl p-6 mb-6">
                    <p className="text-white/60 text-sm mb-3">{t("billingHistory")}</p>
                    <div className="space-y-2">
                      {monthlyBillingHistory(status.subscribedSince, PLAN_PRICES.monthly, i18n.language).map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-sm">
                          <span className="text-white/70">{row.label}</span>
                          <span className="text-white font-medium">{row.amount.toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {status?.cancelAtPeriodEnd ? (
                  <>
                    <p className="text-white/60 text-sm text-center mb-4">
                      {t("cancelledNoticeBody", { date: formatDate(status.expiresAt, i18n.language) })}
                    </p>
                    <motion.button
                      className="w-full font-semibold py-4 rounded-xl"
                      style={{ background: "#FFFFFF", color: "#15161A" }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => resumeMutation.mutate()}
                      disabled={resumeMutation.isPending}
                      data-testid="button-resume-subscription"
                    >
                      {resumeMutation.isPending ? t("resuming") : t("resumeSubscription")}
                    </motion.button>
                  </>
                ) : (
                  // Same size/radius as Home's "See full leaderboard" pill (w-full py-4 rounded-xl
                  // font-bold text-lg) instead of a plain red line of text, just red instead of
                  // white/10.
                  <motion.button
                    className="w-full py-4 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold text-lg transition-colors"
                    whileTap={{ scale: 0.98 }}
                    onClick={() => goToStep("reason")}
                    data-testid="button-cancel-subscription"
                  >
                    {t("cancelSubscription")}
                  </motion.button>
                )}
              </motion.div>
            )}

            {step === "reason" && (
              <motion.div
                key="reason"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
                className="w-full max-w-sm mx-auto flex flex-col flex-1"
              >
                <h2 className="text-xl font-bold mb-1">{t("cancelReasonTitle")}</h2>
                <p className="text-white/60 text-sm mb-6">{t("cancelReasonSubtitle")}</p>

                <div className="space-y-2 mb-6">
                  {CANCEL_REASON_IDS.map((reasonId) => (
                    <button
                      key={reasonId}
                      onClick={() => setSelectedReason((current) => (current === reasonId ? null : reasonId))}
                      // Continue below is rounded-xl (24px) on a py-4 + default text/line-height
                      // button that's ~56px tall -- a 0.43 radius-to-height ratio. These rows are
                      // shorter (py-3 + text-sm content, ~44px), so the same literal 24px value
                      // exceeds half their height and renders as a full pill instead of matching
                      // Continue's rounded-square look. Scaling by the same 0.43 ratio
                      // (0.43 × 44 ≈ 19px) keeps the same rounding language at this height instead.
                      className={`w-full flex items-center justify-between text-left px-4 py-3 rounded-[19px] border transition-colors ${
                        selectedReason === reasonId
                          ? "border-white bg-white/10"
                          : "border-white/15 hover:border-white/30"
                      }`}
                      data-testid={`reason-${reasonId}`}
                    >
                      <span className="text-white text-sm">{t(`cancelReasons.${reasonId}`)}</span>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          selectedReason === reasonId ? "border-white bg-white" : "border-white/30"
                        }`}
                      >
                        {selectedReason === reasonId && <Check className="w-3.5 h-3.5 text-black" />}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedReason === "other" && (
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder={t("otherReasonPlaceholder")}
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
                    onClick={() => goToStep(status?.discounted ? "confirm" : "offer")}
                    data-testid="button-continue-cancel"
                  >
                    {t("continue")}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "offer" && (
              <motion.div
                key="offer"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
                className="w-full max-w-sm mx-auto flex flex-col flex-1"
              >
                <div className="flex-1 flex flex-col items-center text-center">
                  <div className="mb-4">
                    <PremiumCrown size={56} />
                  </div>
                  <h2 className="text-xl font-bold mb-2">{t("offerTitle")}</h2>
                  <p className="text-white/60 text-sm mb-6">
                    {t("offerSubtitle")}
                  </p>

                  <div className="w-full bg-white/10 rounded-3xl p-6 mb-6">
                    <p className="text-white/40 text-sm line-through mb-1">
                      {basePrice != null ? `${basePrice.toFixed(2)}€${plan === "annual" ? t("perYear") : t("perMonth")}` : ""}
                    </p>
                    <p className="text-3xl font-bold text-white">
                      {discountedPrice != null ? `${discountedPrice.toFixed(2)}€` : ""}
                      <span className="text-base text-white/60">
                        {plan === "annual" ? t("perYear") : t("perMonth")} · {t("offerDiscountLabel")}
                      </span>
                    </p>
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
                    {discountMutation.isPending ? t("applying") : t("getDiscount")}
                  </motion.button>
                  <motion.button
                    className="w-full font-medium py-3 text-white/60 disabled:opacity-50"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending || discountMutation.isPending}
                    data-testid="button-cancel-anyway"
                  >
                    {cancelMutation.isPending ? t("cancelling") : t("cancelAnyway")}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === "confirm" && (
              <motion.div
                key="confirm"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
                className="w-full max-w-sm mx-auto flex flex-col flex-1"
              >
                <div className="flex-1 flex flex-col items-center text-center">
                  <AlertTriangle className="w-7 h-7 text-red-400 mb-4" />
                  <h2 className="text-xl font-bold mb-2">{t("confirmTitle")}</h2>
                  <p className="text-white/60 text-sm mb-6">
                    {t("confirmBody")}
                  </p>
                </div>

                <div className="space-y-3">
                  <motion.button
                    className="w-full font-semibold py-4 rounded-xl disabled:opacity-50"
                    style={{ background: "#FFFFFF", color: "#15161A" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setDirection(-1);
                      setStep("overview");
                    }}
                    disabled={cancelMutation.isPending}
                    data-testid="button-keep-subscription"
                  >
                    {t("keepSubscription")}
                  </motion.button>
                  <motion.button
                    className="w-full font-medium py-3 text-red-400 disabled:opacity-50"
                    whileTap={{ scale: 0.99 }}
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    data-testid="button-confirm-cancel"
                  >
                    {cancelMutation.isPending ? t("cancelling") : t("cancelSubscription")}
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
                <h2 className="text-xl font-bold mb-2">{t("confirmedTitle")}</h2>
                <p className="text-white/60 text-sm mb-8">
                  {t("confirmedBody", { date: formatDate(status?.expiresAt ?? null, i18n.language) })}
                </p>
                <motion.button
                  className="w-full font-semibold py-4 rounded-xl"
                  style={{ background: "#FFFFFF", color: "#15161A" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/settings")}
                  data-testid="button-back-to-settings"
                >
                  {t("backToSettings")}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
