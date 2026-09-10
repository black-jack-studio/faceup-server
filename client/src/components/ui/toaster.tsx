import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastMessage,
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"
import notificationAvatar from "@assets/speak-no-evil-monkey_3d_1757354865461.png"

export function Toaster() {
  const { toasts } = useToast()

  return (
    // duration: how long a toast stays up before auto-dismissing (2.5s), unless the user taps
    // the X first. swipeDirection "up": the toast lives at the top of the screen, so dragging
    // it up dismisses it, the same gesture as an iOS notification banner.
    <ToastProvider duration={2500} swipeDirection="up">
      {toasts.map(function ({ id, message, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <img src={notificationAvatar} alt="" className="h-[22px] w-[22px] flex-shrink-0 rounded-full object-cover" />
            <ToastMessage>{message}</ToastMessage>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
