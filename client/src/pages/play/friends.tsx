import { motion } from "framer-motion";
import { useLocation } from "wouter";
import CreateGameSheet from "@/components/game/CreateGameSheet";

// Entry point for Play with Friends: create a table (get a code to share) or join one with
// a code a friend shared. Either way ends in the lobby (client/src/pages/play/friends-lobby.tsx).
// Reached either from Home's own Create Game overlay (see home.tsx, which renders
// CreateGameSheet directly instead of routing here) or, as a standalone route, when returning
// to a friends-mode lobby from an active game — this page is just that same content wrapped in
// its own full-screen sheet for that second case.
export default function PlayWithFriends() {
  const [, navigate] = useLocation();

  return (
    // Slides up from off-screen to cover the whole page, like a bottom sheet being pulled up.
    // fixed-safe-screen is already position:fixed/inset:0, so animating its own transform just
    // slides that full-screen sheet into place without affecting anything underneath it.
    <motion.div
      className="fixed-safe-screen"
      style={{ background: "#000000" }}
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <CreateGameSheet
        onBack={() => navigate("/")}
        onEnterLobby={(tableId) => navigate(`/play/friends-lobby/${tableId}`)}
      />
    </motion.div>
  );
}
