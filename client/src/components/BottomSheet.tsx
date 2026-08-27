import { AnimatePresence, motion, useDragControls, type PanInfo } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

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
// Lower than it sounds safe for jitter (was 6) — a taller, genuinely scrollable sheet (Friend
// Stats, since the coins chart/rank/tiles were added) otherwise gave iOS's own rubber-band
// bounce several pixels' head start before the handoff below fired, which read as the sheet
// "stretching" instead of tracking the finger. Content this tall settles well before this
// tiny a threshold would ever misfire on ordinary scroll jitter.
const PULL_TO_CLOSE_THRESHOLD = 2;

export default function BottomSheet({ open, onClose, children, contentClassName, height = "75vh" }: BottomSheetProps) {
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number | null>(null);
  const handedOffToSheetDrag = useRef(false);
  // Starts true (the common case, and the one where locking down touch-action would be
  // actively wrong) until measured — see the ResizeObserver effect below.
  const [contentScrollable, setContentScrollable] = useState(true);
  // Whether the content is currently scrolled all the way to its top. touch-action has to be
  // decided before a touch begins (changing it mid-gesture doesn't retroactively affect that
  // gesture), so this can't just be computed inside the pointer handlers below — it has to be
  // live state, kept in sync by the onScroll handler on the content div, so touch-action is
  // already "none" by the time a finger that starts at the top touches down.
  const [atTop, setAtTop] = useState(true);
  // How far the on-screen keyboard eats into the layout viewport from the bottom. Without
  // this, focusing an input inside the sheet (e.g. Reset Password's email field) leaves the
  // WKWebView exactly where it was — Capacitor's Keyboard plugin is configured with
  // resize: "none" (see capacitor.config.ts), so nothing shrinks or scrolls on its own — and
  // the native keyboard just overlays on top of whatever was already there, burying the
  // lower half of the sheet underneath it. Shifting only the sheet's own `bottom` keeps the
  // rest of the app static and puts the sheet right above the keyboard instead.
  const [keyboardInset, setKeyboardInset] = useState(0);

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

  useEffect(() => {
    if (!open) {
      setKeyboardInset(0);
      return;
    }

    // Native (the app on an actual device) — Capacitor's Keyboard plugin fires these from
    // the OS itself, with the real keyboard height in px, regardless of whether the
    // WKWebView's own viewport ever reflects the keyboard (it doesn't, with resize: "none").
    if (Capacitor.isNativePlatform()) {
      let cancelled = false;
      let showHandle: { remove: () => void } | undefined;
      let hideHandle: { remove: () => void } | undefined;
      (async () => {
        const [show, hide] = await Promise.all([
          Keyboard.addListener("keyboardWillShow", (info) => setKeyboardInset(info.keyboardHeight)),
          Keyboard.addListener("keyboardWillHide", () => setKeyboardInset(0)),
        ]);
        if (cancelled) {
          show.remove();
          hide.remove();
          return;
        }
        showHandle = show;
        hideHandle = hide;
      })();
      return () => {
        cancelled = true;
        showHandle?.remove();
        hideHandle?.remove();
        setKeyboardInset(0);
      };
    }

    // Web fallback (desktop/mobile browser preview) — best-effort via visualViewport, which
    // real mobile browsers support even though the native WKWebView here doesn't reflect the
    // keyboard through it.
    const vv = window.visualViewport;
    if (!vv) return;
    const handleViewportChange = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(inset);
    };
    vv.addEventListener("resize", handleViewportChange);
    vv.addEventListener("scroll", handleViewportChange);
    handleViewportChange();
    return () => {
      vv.removeEventListener("resize", handleViewportChange);
      vv.removeEventListener("scroll", handleViewportChange);
      setKeyboardInset(0);
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
      // A resize (content growing/shrinking, e.g. the referral code's async "LOADING" ->
      // real height) can change whether scrollTop 0 still means "at the top" without any
      // scroll event firing on its own — re-check here too, not just onScroll below.
      setAtTop(content.scrollTop <= 0);
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [open]);

  // Resets to the top every time the sheet opens — content.scrollTop itself isn't reset by
  // React (this is a real DOM node, not recreated), so without this a sheet reopened after
  // being scrolled down last time would start with atTop stuck false, permanently allowing
  // native touch scrolling even before any scrolling actually happened this time.
  useEffect(() => {
    if (open) setAtTop(true);
  }, [open]);

  const handleContentScroll = () => {
    const content = contentRef.current;
    if (content) setAtTop(content.scrollTop <= 0);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET || info.velocity.y > CLOSE_VELOCITY) {
      onClose();
    }
    // Anything short of that: no explicit action needed — dragConstraints={{top:0,bottom:0}}
    // springs it straight back to the open position on its own once the drag ends.
  };

  // Set on pointerdown, read for the rest of that same gesture — touch-action is already
  // "none" at this point if the content was sitting at the top (see the style below), so
  // there's no native scroll to fall back on for this gesture at all; handleContentPointerMove
  // has to drive content.scrollTop by hand instead, in both directions, until either the user
  // lifts their finger or the gesture gets handed off to the sheet's own drag.
  const nativeScrollDisabledForGesture = useRef(false);

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
    nativeScrollDisabledForGesture.current = !!content && content.scrollTop <= 0;
  };

  const handleContentPointerMove = (e: React.PointerEvent) => {
    if (handedOffToSheetDrag.current || pullStartY.current === null) return;
    const content = contentRef.current;
    if (!content) return;
    const pulledDownBy = e.clientY - pullStartY.current;
    // Hijacks the gesture into the sheet's own drag once the content has nothing left above it
    // to scroll to (scrollTop is already 0) *and* the finger is still moving further down from
    // there — this is the "pull the whole sheet down to close" transition.
    if (content.scrollTop <= 0 && pulledDownBy > PULL_TO_CLOSE_THRESHOLD) {
      handedOffToSheetDrag.current = true;
      dragControls.start(e);
      return;
    }
    // Otherwise, if this gesture started with native scrolling switched off (at the top),
    // stand in for it by hand — most commonly a swipe up to keep reading further into the
    // content while starting from the very top, which native scroll would ordinarily handle
    // on its own if touch-action weren't "none" here.
    if (nativeScrollDisabledForGesture.current) {
      content.scrollTop -= pulledDownBy; // pulledDownBy negative (finger moved up) -> scrolls down
      pullStartY.current = e.clientY; // incremental from here, not cumulative from touch start
      if (content.scrollTop > 0) setAtTop(false);
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
            className="fixed left-0 right-0 z-[81] rounded-t-[28px] flex flex-col transition-[bottom] duration-200 ease-out"
            // maxHeight was hardcoded to 75vh regardless of `height`, so a caller explicitly
            // asking for something taller (e.g. PlayerStatsModal's 90vh) silently got clamped
            // straight back down to 75vh — the actual bug behind "still has to scroll a bit
            // to see everything". The 75vh ceiling is only meant to bound the "auto"
            // (size-to-content) case; an explicit height is its own cap.
            style={{ height, maxHeight: height === "auto" ? "75vh" : height, backgroundColor: "#232328", bottom: keyboardInset }}
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
              // touchAction "none" when there's nothing to scroll (see the ResizeObserver
              // effect above) — overscrollBehavior: contain alone wasn't reliably stopping iOS
              // WebView from letting the touch fall through to native scrolling on
              // non-scrollable content, so native touch scrolling is switched off entirely and
              // the gesture goes through our own pointer handlers below instead, same as the
              // handle above. Also "none" while scrolled to the top: touch-action has to be
              // decided before the gesture starts, so this is what keeps iOS's own rubber-band
              // bounce from getting a head start over the sheet's own pull-to-close (see
              // handleContentPointerMove, which drives scrolling by hand while this is "none"
              // and the content isn't actually at rest against the bottom too).
              style={{ overscrollBehavior: "contain", touchAction: contentScrollable && !atTop ? "auto" : "none" }}
              onPointerDown={handleContentPointerDown}
              onPointerMove={handleContentPointerMove}
              onScroll={handleContentScroll}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
