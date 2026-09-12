import { useEffect, useState } from "react";
import "./AppSplash.css";

// Length of the reveal sequence itself (bars assembling through the tagline
// settling — see AppSplash.css's animation-delay/duration values), i.e. the
// minimum time the splash stays up even if `ready` flips true instantly, so
// the animation is never cut short.
const REVEAL_MS = 1210;
const EXIT_MS = 480;
// Hard ceiling so a slow or hung session check (e.g. the backend's free-tier
// cold start) can never leave this full-screen, click-blocking overlay up
// indefinitely — it forces an exit even if `ready` never fires.
const MAX_WAIT_MS = 8000;

interface AppSplashProps {
  // True once auth/session check has resolved and the app is safe to reveal.
  ready: boolean;
  // Called once the exit animation has finished — parent unmounts this then.
  onFinished: () => void;
}

export default function AppSplash({ ready, onFinished }: AppSplashProps) {
  const [revealDone, setRevealDone] = useState(false);
  const [forceReady, setForceReady] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealDone(true), REVEAL_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((ready || forceReady) && revealDone && !exiting) {
      setExiting(true);
      const timer = setTimeout(onFinished, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [ready, forceReady, revealDone, exiting, onFinished]);

  return (
    <div className={`app-splash${exiting ? " is-exiting" : ""}`}>
      <div className="app-splash-mark-stage">
        <div className="app-splash-mark">
          <span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </div>
      </div>
      <div className="app-splash-title">
        <div className="app-splash-wordmark">FaceUp</div>
        <div className="app-splash-tagline">Modern Blackjack</div>
      </div>
    </div>
  );
}
