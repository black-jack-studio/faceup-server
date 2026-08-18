import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Entry point for Play with Friends: creates a table (or resumes one already sitting at)
// and drops straight into the lobby (client/src/pages/play/friends-lobby.tsx). Actually
// playing a hand together isn't built yet — see the plan for the follow-up.
export default function PlayWithFriends() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await apiRequest("POST", "/api/tables");
        const data = await response.json();
        if (!cancelled) navigate(`/play/friends-lobby/${data.table.id}`);
      } catch (error: any) {
        // 409 means the user already has a table — the response still carries its id.
        if (error?.tableId) {
          if (!cancelled) navigate(`/play/friends-lobby/${error.tableId}`);
          return;
        }
        if (!cancelled) {
          const message = error?.message || "Couldn't start a table";
          setErrorMessage(message);
          toast({ title: "Couldn't start a table", description: message, variant: "destructive" });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  return (
    <div className="fixed-safe-screen flex items-center justify-center" style={{ background: "#000000" }}>
      {errorMessage ? (
        <div className="text-center px-6">
          <p className="text-white/70 mb-4">{errorMessage}</p>
          <button onClick={() => navigate("/")} className="text-white underline" data-testid="button-back">
            Back home
          </button>
        </div>
      ) : (
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      )}
    </div>
  );
}
