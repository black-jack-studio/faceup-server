import { createRoot } from "react-dom/client";
import { PostHogProvider } from "@posthog/react";
import posthog, { initAnalytics } from "@/lib/analytics";
import "./index.css";

initAnalytics();

// Renders any uncaught startup error directly on screen instead of leaving a black screen —
// this app has no way to attach a remote debugger on a real device, so an error thrown before
// React ever mounts (e.g. a missing env var, a native plugin issue) was otherwise invisible.
function renderStartupError(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}` : String(error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<pre style="color:#fff;background:#000;padding:16px;white-space:pre-wrap;font-size:12px;">Startup error:\n${message.replace(/</g, "&lt;")}</pre>`;
  }
}

window.addEventListener("error", (event) => renderStartupError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => renderStartupError(event.reason));

async function start() {
  const { default: App } = await import("./App");
  createRoot(document.getElementById("root")!).render(
    <PostHogProvider client={posthog}>
      <App />
    </PostHogProvider>
  );
}

start().catch(renderStartupError);
