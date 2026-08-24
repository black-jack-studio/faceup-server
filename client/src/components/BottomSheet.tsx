import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Rises from the bottom to 3/4 of the screen (not full-screen) — a light, iOS-style sheet with
// a draggable handle, instead of another full page. Dragging is scoped to the handle and to
// pulling down while already scrolled to the top of the content (see handleContentPointerMove
// below) rather than the whole sheet at all times: putting `drag` on the entire sheet
// unconditionally would hijack every touch inside it, including ordinary scrolling through the
// text content — this only hands off to the sheet's own drag once there's nowhere left to
// scroll up to and the gesture is still pulling further down, same as iOS's own sheets.
const CLOSE_OFFSET = 70; // px dragged down before a release counts as "let go"
const CLOSE_VELOCITY = 350; // px/s — a fast flick down closes even without dragging far
// How far past scrollTop 0 a downward pull has to travel before it's treated as "pulling the
// sheet down" rather than just settling a bit of scroll-bounce jitter right at the top.
const PULL_TO_CLOSE_THRESHOLD = 6;

export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number | null>(null);
  const handedOffToSheetDrag = useRef(false);

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

  // Once the sheet has taken over a pull-to-close gesture, the content div underneath is still
  // the thing the browser thinks the touch started on — without suppressing its own native
  // scroll/rubber-band for the rest of the gesture, that native bounce keeps fighting this
  // transform for every remaining frame, which is what reads as the sheet stuttering/jumping
  // instead of tracking the finger 1:1. dragControls.start(e) also hands the pointer capture to
  // this element, so content's own onPointerMove stops firing once drag begins — the actual
  // Framer callback for "still dragging" is this one (onDrag), which does keep firing every
  // frame regardless of which element originally owned the pointer.
  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent) => {
    event.preventDefault?.();
  };

  const handleContentPointerDown = (e: React.PointerEvent) => {
    pullStartY.current = e.clientY;
    handedOffToSheetDrag.current = false;
  };

  const handleContentPointerMove = (e: React.PointerEvent) => {
    if (handedOffToSheetDrag.current || pullStartY.current === null) return;
    const content = contentRef.current;
    if (!content) return;
    const pulledDownBy = e.clientY - pullStartY.current;
    // Only ever hijacks the gesture when the content has nothing left above it to scroll to
    // (scrollTop is already 0) *and* the finger is still moving further down from there — any
    // other combination (mid-scroll, or dragging upward) is left alone as an ordinary scroll.
    if (content.scrollTop <= 0 && pulledDownBy > PULL_TO_CLOSE_THRESHOLD) {
      handedOffToSheetDrag.current = true;
      e.preventDefault();
      dragControls.start(e);
      return;
    }
    // Mirror check at the other edge: once there's no more content below to scroll into,
    // pulling further has nothing left to reveal — block it outright rather than letting the
    // browser bounce past the last line and open up an empty gap of the sheet's own background.
    // overscrollBehavior below already asks for this, but WebKit doesn't reliably honor it for
    // an element's own rubber-band (only for chaining to its parent), hence the JS backstop.
    const atBottom = content.scrollHeight - content.scrollTop - content.clientHeight <= 0;
    if (atBottom && pulledDownBy < -PULL_TO_CLOSE_THRESHOLD) {
      e.preventDefault();
    }
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
            style={{ height: "75vh", backgroundColor: "#232328" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
          >
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
              onPointerDown={(e) => dragControls.start(e)}
              data-testid="bottom-sheet-handle"
            >
              <div className="w-10 h-1.5 rounded-full bg-white/25" />
            </div>
            {/* Headings solid white so they pop against the dark sheet; body copy a lighter
                grey (not the near-black on white this replaced) so it still reads clearly
                without competing with the headings. */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto px-6 pb-10 text-[#9CA3AF] text-sm leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:font-semibold [&_strong]:text-white"
              style={{ overscrollBehavior: "contain" }}
              onPointerDown={handleContentPointerDown}
              onPointerMove={handleContentPointerMove}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
