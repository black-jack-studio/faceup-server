import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import bicepsImage from "@assets/flexed_biceps_3d_default.png";

interface CreateGameSheetProps {
  onBack: () => void;
  onEnterLobby: (tableId: string) => void;
}

const CODE_LENGTH = 6;

// The "create or join a table" screen — shared by the standalone /play/friends route (used
// when returning to a friends-mode lobby from an active game) and Home's own overlay version
// (tapping the Friends mode card there shows this without ever leaving Home, so the page
// underneath stays visible through the slide up/down instead of the screen going black while
// the previous route was already gone and this one hadn't finished sliding into place yet).
// Either way the content is identical, so this component owns no outer fixed-screen wrapper or
// entrance/exit animation itself — that's the caller's job.
export default function CreateGameSheet({ onBack, onEnterLobby }: CreateGameSheetProps) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [isCodeFocused, setIsCodeFocused] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const isCodeComplete = code.length === CODE_LENGTH;

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const response = await apiRequest("POST", "/api/tables");
      const data = await response.json();
      onEnterLobby(data.table.id);
    } catch (error: any) {
      // 409 means the user already has a table — the response still carries its id.
      if (error?.tableId) {
        onEnterLobby(error.tableId);
        return;
      }
      toast({ title: "Couldn't create a table", description: error?.message || "Please try again", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!isCodeComplete) {
      setCodeError("Enter the full code");
      return;
    }
    setIsJoining(true);
    setCodeError("");
    try {
      const response = await apiRequest("POST", "/api/tables/join-by-code", { code: code.trim() });
      const data = await response.json();
      onEnterLobby(data.tableId);
    } catch (error: any) {
      if (error?.tableId) {
        onEnterLobby(error.tableId);
        return;
      }
      setCodeError(error?.message || "Couldn't join that table");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-md mx-auto h-full flex flex-col px-6 pt-16 pb-10">
      <motion.button
        onClick={onBack}
        className="relative z-10 flex items-center justify-center w-9 h-9 rounded-full bg-transparent border-none cursor-pointer text-white/60 hover:text-white transition-colors mb-7 self-start"
        style={{ background: "transparent", border: "none", padding: 0 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="button-back"
      >
        <ArrowLeft className="w-5 h-5" />
      </motion.button>

      <div className="flex-1 flex flex-col items-center justify-center gap-4 -mt-32">
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

        <div className="w-full max-w-xs flex flex-col gap-3">
          <div
            className={`relative w-full bg-white/5 rounded-xl px-4 border flex items-center justify-center ${
              codeError ? "border-red-500" : "border-white/20"
            }`}
            style={{ height: "56px" }}
            onClick={() => codeInputRef.current?.focus()}
          >
            {/* The real input captures typing/paste/the mobile keyboard but stays invisible —
                the row below it is what's actually shown, one dash per character with the
                typed letter/digit sitting above its own dash instead of a placeholder that
                just disappears once you start typing. caret-transparent kills the native text
                caret, which otherwise still rendered (as a stray mark pinned to the left edge)
                despite opacity-0 on the input itself — a blinking bar over the active dash,
                driven by isCodeFocused, replaces it in the right spot instead. */}
            <input
              ref={codeInputRef}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().slice(0, CODE_LENGTH));
                if (codeError) setCodeError("");
              }}
              onFocus={() => setIsCodeFocused(true)}
              onBlur={() => setIsCodeFocused(false)}
              maxLength={CODE_LENGTH}
              className="absolute inset-0 w-full h-full opacity-0 cursor-text caret-transparent"
              data-testid="input-table-code"
            />
            <div className="flex items-end justify-center gap-2.5 pointer-events-none">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const isActive = i === code.length;
                const showCaret = isActive && isCodeFocused && !isCodeComplete;
                return (
                  <div key={i} className="flex flex-col items-center gap-[3px]">
                    <span className="w-4 flex items-center justify-center text-white text-lg font-bold leading-none">
                      {code[i] ?? (showCaret && <span className="w-[2px] h-4 bg-white rounded-full animate-pulse" />)}
                    </span>
                    <span className={`text-2xl leading-none ${isActive ? "text-white" : "text-white/30"}`}>-</span>
                  </div>
                );
              })}
            </div>
          </div>
          {codeError && <p className="text-red-400 text-sm text-center">{codeError}</p>}
          <button
            onClick={handleJoin}
            disabled={isJoining || !isCodeComplete}
            className={`w-full py-4 rounded-xl font-bold text-base transition-colors ${
              isCodeComplete ? "bg-white text-black" : "bg-[#0B0B0F] border border-zinc-700 text-white/40"
            } ${isJoining ? "opacity-60" : ""}`}
            data-testid="button-join-table"
          >
            {isJoining ? "Joining…" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
