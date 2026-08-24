import { AnimatePresence, animate, motion, useMotionValue, useVelocity } from "framer-motion";
import { useEffect, useRef } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

// Rises from the bottom to 3/4 of the screen (not full-screen) — a light, iOS-style sheet with
// a draggable handle and content, instead of another full page.
//
// Dragging is handled entirely by hand (no Framer `drag` prop) because relying on native touch
// scrolling plus a JS handoff once the content hit a boundary turned out to be unreliable on
// iOS: WebKit only honors `preventDefault()` on the *first* touchmove of a gesture to stop it
// becoming a native scroll — by the time our old code noticed "we're pulling past the edge"
// a few pixels in, the browser had already committed to its own scroll/bounce, so the sheet's
// own transform and the native bounce fought each other (visible as a stutter/gap instead of
// tracking the finger, and an abrupt close instead of a gradual one).
//
// The fix here: a gesture starting mid-content (not at a scroll boundary) is left completely
// alone as an ordinary native scroll — full momentum/inertia, zero interference. A gesture
// starting exactly at a boundary (scrollTop 0, scrollTop at max, or anywhere on the handle,
// which has no scroll of its own) is instead driven entirely by hand from its very first move
// event: content.scrollTop and the sheet's own y both get set directly from the pointer
// position every frame, so there's never a point where a native bounce can sneak in independent
// of what's being drawn. Pulling down past the top hands the extra distance to the sheet's own
// y 1:1; pulling further past the bottom (or up past the top once the sheet's already fully
// open) is simply absorbed with no movement at all, instead of opening a gap of empty
// background past the last/first line of content.
const CLOSE_OFFSET = 70; // px dragged down before a release counts as "let go"
const CLOSE_VELOCITY = 350; // px/s — a fast flick down closes even without dragging far

export default function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const sheetY = useMotionValue(0);
  const sheetYVelocity = useVelocity(sheetY);

  const boundaryDrag = useRef<{
    pointerId: number;
    startY: number;
    startScrollTop: number;
  } | null>(null);

  // Settings (which hosts this) already can't scroll on its own, but the backdrop still sits
  // over Profile underneath — same reasoning as Home's own overlays (see home.tsx) for why a
  // drag anywhere on the backdrop shouldn't leak through to whatever's behind it.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    sheetY.set(0);
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, sheetY]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const content = contentRef.current;
    if (!content) return;
    const onHandle = !!handleRef.current?.contains(e.target as Node);
    const maxScrollTop = Math.max(0, content.scrollHeight - content.clientHeight);
    const atTop = content.scrollTop <= 0;
    const atBottom = content.scrollTop >= maxScrollTop;
    // Anywhere mid-content, not at either edge: ordinary scroll, don't touch it.
    if (!onHandle && !atTop && !atBottom) return;

    boundaryDrag.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      // The handle itself has nothing to scroll — treating it as already "at the top" makes
      // any pull on it drive the sheet immediately, same as before.
      startScrollTop: onHandle ? 0 : content.scrollTop,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = boundaryDrag.current;
    const content = contentRef.current;
    if (!drag || !content || e.pointerId !== drag.pointerId) return;
    // Every frame, not just the first — once this gesture has taken over, letting even one
    // frame fall through to the browser's default is enough to reawaken a native scroll/bounce
    // mid-drag.
    e.preventDefault();

    const deltaY = e.clientY - drag.startY; // + = finger moved down the screen
    const maxScrollTop = Math.max(0, content.scrollHeight - content.clientHeight);
    // Where content's own scroll would land with no sheet to hand off to — dragging the finger
    // down scrolls content back up toward the top (desiredScrollTop shrinks).
    const desiredScrollTop = drag.startScrollTop - deltaY;

    if (desiredScrollTop <= 0) {
      // Pulling past the top: content pins at 0, the overshoot drives the sheet itself 1:1.
      content.scrollTop = 0;
      sheetY.set(Math.max(0, -desiredScrollTop));
    } else if (desiredScrollTop >= maxScrollTop) {
      // Pulling past the bottom: content pins at its max, nothing else moves — no bounce gap.
      content.scrollTop = maxScrollTop;
      sheetY.set(0);
    } else {
      // Back in ordinary scroll range mid-gesture (e.g. pulled down from the top, then reversed
      // past it into real content) — keep tracking the finger as a normal scroll.
      content.scrollTop = desiredScrollTop;
      sheetY.set(0);
    }
  };

  // Slides the sheet the rest of the way off-screen by hand, then tells the parent to actually
  // unmount it — letting AnimatePresence's own `exit` animate this same externally-owned motion
  // value turned out to be unreliable (verified live: the sheet would go isPresent:false but its
  // y transform just stayed wherever the drag left it, permanently, instead of continuing to
  // animate). A spring's `onComplete` turned out to be just as unreliable here (verified live
  // again: the sheet visibly finished sliding off-screen but onComplete never fired, leaving the
  // backdrop stuck forever). A fixed-duration tween paired with a plain setTimeout of the same
  // length sidesteps needing framer to ever tell us it's done.
  const CLOSE_DURATION = 0.22;
  const closeSheet = () => {
    animate(sheetY, window.innerHeight, { type: "tween", duration: CLOSE_DURATION, ease: "easeIn" });
    setTimeout(onClose, CLOSE_DURATION * 1000);
  };

  const endDrag = (e: React.PointerEvent) => {
    const drag = boundaryDrag.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    boundaryDrag.current = null;

    const offset = sheetY.get();
    const velocity = sheetYVelocity.get();
    if (offset > CLOSE_OFFSET || velocity > CLOSE_VELOCITY) {
      closeSheet();
    } else if (offset !== 0) {
      animate(sheetY, 0, { type: "spring", damping: 32, stiffness: 320 });
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
            onClick={closeSheet}
          />
          <motion.div
            className="fixed left-0 right-0 bottom-0 z-[81] rounded-t-[28px] flex flex-col"
            style={{ height: "75vh", backgroundColor: "#232328", y: sheetY }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            // No `exit` here on purpose — by the time onClose() actually fires (see closeSheet
            // above), sheetY has already been driven fully off-screen by hand, so there's
            // nothing left for a separate exit animation to do. Letting AnimatePresence's own
            // exit try to animate this same externally-owned motion value is what got stuck.
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <div
              ref={handleRef}
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              style={{ touchAction: "none" }}
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
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
