import { useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import bicepsImage from "@assets/flexed_biceps_3d_default.png";

// Entry point for Play with Friends: create a table (get a code to share) or join one with
// a code a friend shared. Either way ends in the lobby (client/src/pages/play/friends-lobby.tsx).
export default function PlayWithFriends() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const goToLobby = (tableId: string) => navigate(`/play/friends-lobby/${tableId}`);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/tables");
      const data = await response.json();
      goToLobby(data.table.id);
    } catch (error: any) {
      // 409 means the user already has a table — the response still carries its id.
      if (error?.tableId) {
        goToLobby(error.tableId);
        return;
      }
      toast({ title: "Couldn't create a table", description: error?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!code.trim()) {
      setCodeError("Enter a code");
      return;
    }
    setIsJoining(true);
    setCodeError("");
    try {
      const response = await apiRequest("POST", "/api/tables/join-by-code", { code: code.trim() });
      const data = await response.json();
      goToLobby(data.tableId);
    } catch (error: any) {
      if (error?.tableId) {
        goToLobby(error.tableId);
        return;
      }
      setCodeError(error?.message || "Couldn't join that table");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed-safe-screen" style={{ background: "#000000" }}>
      <div className="max-w-md mx-auto h-full flex flex-col px-6 pt-16 pb-10">
        <motion.button
          onClick={() => navigate("/")}
          className="flex items-center space-x-2 text-white/60 hover:text-white transition-colors mb-10 self-start"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <motion.div
          className="flex-1 flex flex-col items-center justify-center gap-4 -mt-32"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <img src={bicepsImage} alt="" className="w-16 h-16 object-contain mb-2" />
          <h1 className="text-2xl font-bold text-white mb-2">Play with Friends</h1>
          <p className="text-white/50 text-sm text-center mb-6 max-w-xs">
            Create a table and share the code, or join one a friend already started.
          </p>

          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full max-w-xs py-4 rounded-xl bg-white text-black font-bold text-base disabled:opacity-50"
            data-testid="button-create-table"
          >
            {isCreating ? "Creating…" : "Create a game"}
          </button>

          {!showCodeInput ? (
            <button
              onClick={() => setShowCodeInput(true)}
              className="w-full max-w-xs py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-base hover:bg-white/10 transition-colors"
              data-testid="button-show-code-input"
            >
              Enter a code
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-xs flex flex-col gap-3"
            >
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (codeError) setCodeError("");
                }}
                placeholder="Enter code"
                maxLength={6}
                autoFocus
                className={`w-full bg-white/5 rounded-2xl px-4 py-4 text-white text-center text-lg tracking-[0.3em] placeholder:tracking-normal placeholder:text-white/40 focus:bg-white/10 focus:outline-none border ${
                  codeError ? "border-red-500" : "border-white/20 focus:border-white"
                }`}
                data-testid="input-table-code"
              />
              {codeError && <p className="text-red-400 text-sm text-center">{codeError}</p>}
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full py-4 rounded-xl bg-white text-black font-bold text-base disabled:opacity-50"
                data-testid="button-join-table"
              >
                {isJoining ? "Joining…" : "Join"}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
