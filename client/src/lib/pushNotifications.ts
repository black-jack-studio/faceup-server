import { PushNotifications } from "@capacitor/push-notifications";
import { Capacitor } from "@capacitor/core";
import { apiRequest } from "./queryClient";

let registerPromise: Promise<void> | null = null;

// Requests the OS permission prompt, registers with APNs (iOS) / FCM (Android), and sends
// the resulting device token to POST /api/push/register-token — needs a signed-in session,
// since that route is authenticated. No-op on web: there's no native push surface there, and
// PushNotifications isn't implemented for the web platform anyway.
export function registerForPushNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return Promise.resolve();
  }

  if (!registerPromise) {
    registerPromise = (async () => {
      PushNotifications.addListener("registration", (token) => {
        apiRequest("POST", "/api/push/register-token", {
          token: token.value,
          platform: Capacitor.getPlatform(),
        }).catch((err) => console.error("Failed to register push token:", err));
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error:", error);
      });

      const { receive } = await PushNotifications.requestPermissions();
      if (receive !== "granted") return;

      await PushNotifications.register();
    })();
  }

  return registerPromise;
}
