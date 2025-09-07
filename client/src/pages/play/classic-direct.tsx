import BlackjackTable from "@/components/game/blackjack-table";
import { useGameStore } from "@/store/game-store";
import { useEffect } from "react";

export default function ClassicDirect() {
  const startGame = useGameStore((state) => state.startGame);

  useEffect(() => {
    // Start the game automatically in cash mode when component mounts
    startGame("cash");
  }, [startGame]);

  return <BlackjackTable gameMode="cash" />;
}