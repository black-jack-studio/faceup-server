import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // z-[99999]: must sit above every modal/overlay in the app (AnimatedModal and dialog.tsx
      // top out at z-[10010]) — a toast is meant to be seen no matter what's currently open.
      // Always top-center, no sm: breakpoint override — this app is mobile-only, and the
      // original shadcn default repositioned toasts to bottom-right on wider viewports, which
      // made them enter/exit sideways instead of the intended up/down at the top of the screen.
      // flex + justify-center (not the old flex-col-reverse w-full block) so the pill sizes
      // itself to its own text and centers -- a w-full column here made a shrink-to-fit child
      // size itself against only half the viewport once it needed to wrap (position anchored
      // at one edge, auto-centered after the fact), the actual cause of a notification that
      // read as a cramped, nearly-square block instead of the intended wide, single-line pill.
      "fixed top-0 z-[99999] flex max-h-screen w-full justify-center px-2",
      className
    )}
    // pt-safe isn't a real Tailwind utility (no plugin defines it here), so it was a no-op --
    // toasts sat under the notch/Dynamic Island on notched iPhones. Inline style instead, same
    // pattern as the rest of the app's safe-area padding.
    style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// Single fixed look for every notification, success or failure alike -- #232328 is the same
// background the Gem Exchange/Chest confirm sheets use (BottomSheet.tsx), white text always.
// More horizontal/vertical padding than the first pass (pl-[10px]/py-[9px]) -- Anatole found
// that version too tight to the text on both axes. Radius follows the same height, still at
// Home's "See full leaderboard" button ratio (24px radius / 60px tall = 0.4): this pill is now
// ~48px tall, so 0.4 x 48 = ~19px keeps that same proportion rather than a fixed value.
const TOAST_CLASSES =
  "group pointer-events-auto relative inline-flex w-auto max-w-full items-center gap-2.5 overflow-hidden rounded-[19px] border border-white/[0.08] bg-[#232328] py-[13px] pl-[18px] pr-11 text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-all data-[swipe=cancel]:translate-y-0 data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full"

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>
>(({ className, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(TOAST_CLASSES, className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/50 opacity-70 transition-all hover:text-white hover:opacity-100 hover:bg-white/10 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/20 group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

// One short line -- no separate bold title stacked over a dimmer description. See
// hooks/use-toast.ts's ToasterToast: every call site passes a single `message`, always
// pre-written on the client, never raw text forwarded from a server error.
const ToastMessage = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("min-w-0 text-sm font-semibold leading-snug", className)}
    {...props}
  />
))
ToastMessage.displayName = ToastPrimitives.Title.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastMessage,
  ToastClose,
  ToastAction,
}
