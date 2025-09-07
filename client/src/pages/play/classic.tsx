import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import BlackjackTable from "@/components/game/blackjack-table";

export default function ClassicMode() {
  const setMode = useGameStore((state) => state.setMode);
  const startGame = useGameStore((state) => state.startGame);

  useEffect(() => {
    setMode("classic");
    startGame("cash");
  }, [setMode, startGame]);

  return <BlackjackTable gameMode="cash" />;
}