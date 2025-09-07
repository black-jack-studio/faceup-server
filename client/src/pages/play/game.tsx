import { useEffect, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useLocation } from "wouter";
import BlackjackTable from "@/components/game/blackjack-table";

export default function GameMode() {
  const [, navigate] = useLocation();
  const [bet, setBet] = useState(0);
  const { setMode, startGame, dealInitialCards, gameState, resetGame } = useGameStore();

  // Extraire le montant de la mise depuis l'URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const betAmount = urlParams.get('bet');
    if (betAmount) {
      setBet(parseInt(betAmount));
    } else {
      // Si pas de mise, retourner à la page de mise
      navigate("/play/classic");
    }
  }, [navigate]);

  useEffect(() => {
    if (bet > 0) {
      setMode("classic");
      startGame("cash");
      dealInitialCards(bet);
    }
  }, [setMode, startGame, dealInitialCards, bet]);

  // Quand la partie est terminée, retourner à la page de mise
  useEffect(() => {
    if (gameState === "gameOver") {
      const timer = setTimeout(() => {
        resetGame();
        navigate("/play/classic");
      }, 3000); // Attendre 3 secondes pour afficher le résultat
      
      return () => clearTimeout(timer);
    }
  }, [gameState, navigate, resetGame]);

  if (bet === 0) {
    return null; // Attendre que la mise soit définie
  }

  return <BlackjackTable gameMode="cash" />;
}