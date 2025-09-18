import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { useEffect } from "react";

export default function AllInGameMode() {
  const { setMode, startGame } = useGameStore();

  useEffect(() => {
    // Set the mode to all-in and start the game automatically
    setMode("all-in");
    startGame("cash");
  }, [setMode, startGame]);

  return <BlackjackTable gameMode="cash" />;
}