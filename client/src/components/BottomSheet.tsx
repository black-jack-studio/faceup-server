import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Rises from the bottom to 3/4 of the screen (not full-screen) — a light, iOS-style sheet with
// a draggable handle, instead of another full page. Dragging is scoped to the handle alone
// (via dragControls, started from the handle's own onPointerDown) rather than the whole sheet:
// putting `drag` on the entire sheet would hijack every touch inside it, including scrolling
// through the text content below the handle.
const CLOSE_OFFSET = 120; // px dragged down before a release counts as "let go"
const CLOSE_VELOCITY = 600; // px/s — a fast flick down closes even without dragging far

export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const dragControls = useDragControls();

  // Settings (which hosts this) already can't scroll on its own, but the backdrop still sits
  // over Profile underneath — same reasoning as Home's own overlays (see home.tsx) for why a
  // drag anywhere on the backdrop shouldn't leak through to whatever's behind it.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) {
      onClose();
    }
    // Anything short of that: no explicit action needed — dragConstraints={{top:0,bottom:0}}
    // springs it straight back to the open position on its own once the drag ends.
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-[80]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-[81] rounded-t-[28px] flex flex-col"
            style={{ height: "75vh", backgroundColor: "#EDEDED" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={handleDragEnd}
          >
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => dragControls.start(e)}
              data-testid="bottom-sheet-handle"
            >
              <div className="w-10 h-1.5 rounded-full bg-black/20" />
            </div>
            <div
              className="flex-1 overflow-y-auto px-6 pb-10 text-black text-sm leading-relaxed [&_h2]:text-black [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:font-semibold [&_strong]:opacity-100"
              style={{ overscrollBehavior: "contain" }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
