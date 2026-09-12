import { useEffect, useState } from "react";
import "./AppSplash.css";

// Length of the reveal sequence itself (bars assembling through the tagline
// settling — see AppSplash.css's animation-delay/duration values), i.e. the
// minimum time the splash stays up even if `ready` flips true instantly, so
// the animation is never cut short.
const REVEAL_MS = 1210;
const EXIT_MS = 480;

interface AppSplashProps {
  // True once auth/session check has resolved and the app is safe to reveal.
  ready: boolean;
  // Called once the exit animation has finished — parent unmounts this then.
  onFinished: () => void;
}

export default function AppSplash({ ready, onFinished }: AppSplashProps) {
  const [revealDone, setRevealDone] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealDone(true), REVEAL_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && revealDone && !exiting) {
      setExiting(true);
      const timer = setTimeout(onFinished, EXIT_MS);
      return () => clearTimeout(timer);
    }
  }, [ready, revealDone, exiting, onFinished]);

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
