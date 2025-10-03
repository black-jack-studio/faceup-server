import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerDeepLinkHandler } from "./deep-link";

registerDeepLinkHandler();

createRoot(document.getElementById("root")!).render(<App />);
