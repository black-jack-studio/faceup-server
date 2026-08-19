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

  // There's no way to see this device's console without a Mac plugged in — mirror
  // registration failures to the server so they show up in Render's logs instead. Purely a
  // debugging aid while getting this working for the first time.
  const reportDiagnostic = (stage: string, detail: unknown) => {
    apiRequest("POST", "/api/push/log-client-event", { stage, detail: String(detail) }).catch(() => {});
  };

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
        reportDiagnostic("registrationError", JSON.stringify(error));
      });

      const { receive } = await PushNotifications.requestPermissions();
      reportDiagnostic("requestPermissions result", receive);
      if (receive !== "granted") return;

      await PushNotifications.register();
      reportDiagnostic("register() called", "ok");
    })();
  }

  return registerPromise;
}
