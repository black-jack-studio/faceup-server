import { useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { useLocation } from "wouter";

export default function ClassicMode() {
  const [, navigate] = useLocation();
  const setMode = useGameStore((state) => state.setMode);

  useEffect(() => {
    setMode("classic");
  }, [setMode]);

  // Rediriger vers la table de jeu existante avec le mode configuré
  useEffect(() => {
    navigate("/cash-games");
  }, [navigate]);

  return null; // Cette page redirige immédiatement
}