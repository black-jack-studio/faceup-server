import { useState } from "react";
import AnimatedModal from "@/components/AnimatedModal";
import { Check } from "lucide-react";

const REPORT_REASONS = [
  "Comportement abusif ou harcèlement",
  "Pseudo ou profil inapproprié",
  "Triche",
  "Contenu inapproprié",
  "Autre",
];

interface ReportReasonModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

// Second step of the report flow (see PlayerStatsModal → ActionSheet → here): pick a reason,
// then submit. No admin panel reads this yet — the report is just recorded server-side for
// manual review (see server/routes.ts's /report endpoint).
export default function ReportReasonModal({ open, onClose, onSubmit, isSubmitting = false }: ReportReasonModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setSelected(null);
    onClose();
  };

  return (
    <AnimatedModal
      open={open}
      onClose={handleClose}
      className="w-[calc(100%-3rem)] max-w-sm bg-[#13151A] border border-white/10 rounded-3xl shadow-2xl"
    >
      <div className="p-6">
        <h2 className="text-xl font-bold text-white text-center mb-1">Signaler ce joueur</h2>
        <p className="text-white/60 text-sm text-center mb-5">Pourquoi signales-tu ce joueur ?</p>

        <div className="space-y-2 mb-6">
          {REPORT_REASONS.map((reason) => {
            const isSelected = selected === reason;
            return (
              <button
                key={reason}
                type="button"
                onClick={() => setSelected(reason)}
                disabled={isSubmitting}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left text-sm font-medium transition-colors disabled:opacity-50 ${
                  isSelected ? "bg-white/15 text-white ring-1 ring-white/30" : "bg-white/5 text-white/80"
                }`}
                data-testid={`report-reason-option-${reason}`}
              >
                <span>{reason}</span>
                {isSelected && <Check className="w-4 h-4 text-white flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 h-11 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium disabled:opacity-50 transition-colors"
            data-testid="button-cancel-report"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => selected && onSubmit(selected)}
            disabled={!selected || isSubmitting}
            className="flex-1 h-11 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold disabled:opacity-50 transition-colors"
            data-testid="button-submit-report"
          >
            {isSubmitting ? "Envoi..." : "Signaler"}
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}
