import { AnimatePresence, motion } from "framer-motion";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useOverlayVisibility } from "@/hooks/use-overlay-visibility";

interface ActionSheetOption {
  label: string;
  onClick: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  open: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
  cancelLabel?: string;
}

// iOS-style action sheet: a rounded card of stacked full-width options (hairline-divided),
// then a gap, then a separate "Cancel" card below — same layout iOS's own UIAlertController
// action sheet uses, rather than another centered AnimatedModal dialog.
export default function ActionSheet({ open, onClose, options, cancelLabel = "Annuler" }: ActionSheetProps) {
  useBodyScrollLock(open);
  const onExitComplete = useOverlayVisibility(open);

  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <div className="fixed inset-0 z-[10000] flex flex-col justify-end p-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40, transition: { type: "tween", duration: 0.15, ease: "easeIn" } }}
            transition={{ type: "spring", damping: 30, stiffness: 380 }}
          >
            <div className="bg-[#13151A]/95 backdrop-blur-xl rounded-2xl overflow-hidden ring-1 ring-white/10">
              {options.map((option, index) => (
                <div key={option.label}>
                  {index > 0 && <div className="h-px bg-white/10" />}
                  <button
                    onClick={option.onClick}
                    className={`w-full py-4 text-center text-[17px] font-medium active:bg-white/5 transition-colors ${
                      option.destructive ? "text-red-400" : "text-white"
                    }`}
                    data-testid={`action-sheet-option-${index}`}
                  >
                    {option.label}
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-2 w-full bg-[#13151A]/95 backdrop-blur-xl rounded-2xl py-4 text-center text-[17px] font-bold text-white ring-1 ring-white/10 active:bg-white/5 transition-colors"
              data-testid="action-sheet-cancel"
            >
              {cancelLabel}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
