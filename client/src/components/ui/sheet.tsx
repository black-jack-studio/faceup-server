"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, animate, useMotionValue, type PanInfo } from "framer-motion"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

// How far (px) or how fast (px/s) a drag toward the edge must go before we
// treat it as "let go" instead of "changed their mind".
const DRAG_CLOSE_DISTANCE = 100
const DRAG_CLOSE_VELOCITY = 500
// Free travel distance in the closing direction before Framer's own elastic
// resistance kicks in — generous, since real screens vary in size.
const DRAG_TRAVEL = 480

// Which axis each side drags on, and which sign along that axis means "closing".
const dragBySide = {
  bottom: { axis: "y" as const, sign: 1 as const },
  top: { axis: "y" as const, sign: -1 as const },
  right: { axis: "x" as const, sign: 1 as const },
  left: { axis: "x" as const, sign: -1 as const },
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const { axis, sign } = dragBySide[side ?? "right"]
  const position = useMotionValue(0)

  const dragConstraints =
    axis === "y"
      ? { top: sign === -1 ? -DRAG_TRAVEL : 0, bottom: sign === 1 ? DRAG_TRAVEL : 0 }
      : { left: sign === -1 ? -DRAG_TRAVEL : 0, right: sign === 1 ? DRAG_TRAVEL : 0 }

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const offset = (axis === "y" ? info.offset.y : info.offset.x) * sign
    const velocity = (axis === "y" ? info.velocity.y : info.velocity.x) * sign

    if (offset > DRAG_CLOSE_DISTANCE || velocity > DRAG_CLOSE_VELOCITY) {
      // Past the point of no return: let Radix's own close path handle it
      // (unmount, focus return, onOpenChange) — we just trigger it.
      closeRef.current?.click()
    } else {
      // Didn't commit: spring back home, carrying the release velocity so
      // there's no seam between the drag and the animation.
      animate(position, 0, {
        type: "spring",
        bounce: 0.2,
        duration: 0.4,
        velocity: axis === "y" ? info.velocity.y : info.velocity.x,
      })
    }
  }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {/* Carries the drag gesture — the whole panel (content + close
            button) moves as one physical object, per §2 "touch and content
            move together". */}
        <motion.div
          className="h-full w-full"
          drag={axis}
          dragConstraints={dragConstraints}
          dragElastic={0.15}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          style={axis === "y" ? { y: position } : { x: position }}
        >
          {children}
          <SheetPrimitive.Close
            ref={closeRef}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </motion.div>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
})
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
