import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  // Overrides the default legal-text styling (grey body copy, h2/p/ul rules) — pass your
  // own to reuse the sheet's animation/drag mechanics for content that already carries its
  // own explicit color classes (e.g. Friends' stats sheet).
  contentClassName?: string;
  // Default "75vh" fits Credits/Game Rules, whose long scrollable text can run past that
  // height anyway. Short, fixed-size content (e.g. the daily streak popup) doesn't need — and
  // looks wrong in — a sheet that tall: it just leaves dead empty space below it. Pass "auto"
  // to size the sheet to its content instead, capped at 75vh so it still can't overflow the
  // screen if the content ever grows unexpectedly tall.
  height?: string;
}

const DEFAULT_CONTENT_CLASSNAME =
  "px-6 pb-10 text-[#9CA3AF] text-sm leading-relaxed [&_h2]:text-white [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mb-2 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:font-semibold [&_strong]:text-white";

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

export default function BottomSheet({ open, onClose, children, contentClassName, height = "75vh" }: BottomSheetProps) {
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number | null>(null);
  const handedOffToSheetDrag = useRef(false);
  // Starts true (the common case, and the one where locking down touch-action would be
  // actively wrong) until measured — see the ResizeObserver effect below.
  const [contentScrollable, setContentScrollable] = useState(true);

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

  // Tracks whether the content actually has anything to scroll, re-checking on resize since
  // some sheets' content loads in async (e.g. the referral code, which briefly reads
  // "LOADING" before its real height). Drives touch-action below: content.scrollTop is
  // useless for detecting "pull the sheet down" gestures when there's no scroll range to
  // move it off of (see handleContentPointerDown/Move), so short sheets need native touch
  // scrolling switched off entirely rather than relying on that heuristic.
  useEffect(() => {
    const content = contentRef.current;
    if (!open || !content) return;
    const observer = new ResizeObserver(() => {
      setContentScrollable(content.scrollHeight > content.clientHeight);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [open]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) {
      onClose();
    }
    // Anything short of that: no explicit action needed — dragConstraints={{top:0,bottom:0}}
    // springs it straight back to the open position on its own once the drag ends.
  };

  const handleContentPointerDown = (e: React.PointerEvent) => {
    pullStartY.current = e.clientY;
    const content = contentRef.current;
    const startedOnInteractiveElement = (e.target as HTMLElement).closest(
      "input, button, textarea, select, a"
    );
    // Content short enough to not actually scroll (e.g. the referral code sheets) reported
    // dragging the sheet instead moved the Friends page underneath — handleContentPointerMove's
    // heuristic only hands off once a drag is confirmed to be "pulling down from the scroll
    // top", so a drag that doesn't clearly read that way fast enough fell through to native
    // touch scrolling, which (with nothing local to scroll) bubbled to the nearest real scroll
    // container behind the sheet. There's no ordinary-scroll gesture worth protecting when
    // there's no scroll range at all, so skip the heuristic entirely here: any drag on this
    // content can safely start moving the sheet immediately, same as the handle — except when
    // the touch actually started on an input/button/etc (the referral code Input, its Submit
    // button, the Copy button), where hijacking the pointer on *down* would block the tap/focus
    // that element needs; those still fall through to the move-based heuristic below.
    if (content && content.scrollHeight <= content.clientHeight && !startedOnInteractiveElement) {
      handedOffToSheetDrag.current = true;
      dragControls.start(e);
      return;
    }
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
      dragControls.start(e);
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
            style={{ height, maxHeight: "75vh", backgroundColor: "#232328" }}
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
              <div className="w-10 h-1.5 rounded-full bg-white/25" />
            </div>
            {/* Headings solid white so they pop against the dark sheet; body copy a lighter
                grey (not the near-black on white this replaced) so it still reads clearly
                without competing with the headings. */}
            <div
              ref={contentRef}
              className={`flex-1 overflow-y-auto ${contentClassName ?? DEFAULT_CONTENT_CLASSNAME}`}
              // touchAction "none" when there's nothing to scroll: overscrollBehavior:
              // contain alone wasn't reliably stopping iOS WebView from letting the touch
              // fall through to native scrolling on non-scrollable content (see the
              // ResizeObserver effect above) — with native touch scrolling switched off
              // here, the gesture has nowhere to go but through our own pointer handlers
              // below, same as the handle above (which has always used touchAction: none).
              style={{ overscrollBehavior: "contain", touchAction: contentScrollable ? "auto" : "none" }}
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
