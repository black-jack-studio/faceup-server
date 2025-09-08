import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

export default function CoinsHero() {
  // Récupérer le solde depuis l'API
  const { data: coinsData, isLoading } = useQuery({
    queryKey: ['/api/user/coins'],
  });
  
  const balance = coinsData?.coins || 0;
  
  // États pour l'animation
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const [animationColor, setAnimationColor] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const previousBalanceRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Debug : afficher les changements de balance
  useEffect(() => {
    console.log('Balance actuel:', balance);
    console.log('Balance stocké:', localStorage.getItem('previousCoinsBalance'));
  }, [balance]);

  // Animation des coins quand le balance change
  useEffect(() => {
    if (isLoading) return;
    
    // Récupérer l'ancien montant stocké
    const storedBalance = localStorage.getItem('previousCoinsBalance');
    const previousBalance = storedBalance ? parseInt(storedBalance) : balance;
    
    // Si c'est la première fois ou pas de changement, pas d'animation
    if (previousBalance === balance || previousBalanceRef.current === null) {
      setDisplayedBalance(balance);
      localStorage.setItem('previousCoinsBalance', balance.toString());
      previousBalanceRef.current = balance;
      return;
    }
    
    // Il y a un changement, démarrer l'animation
    const difference = balance - previousBalance;
    if (difference !== 0) {
      setIsAnimating(true);
      
      // Définir la couleur selon gain/perte
      if (difference > 0) {
        setAnimationColor('text-green-400');
      } else {
        setAnimationColor('text-red-400');
      }
      
      // Animation du compteur
      const duration = 2000; // 2 secondes
      const startTime = Date.now();
      const startValue = previousBalance;
      const endValue = balance;
      
      const animateCounter = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation douce
        const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOutQuad(progress);
        
        const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
        setDisplayedBalance(currentValue);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateCounter);
        } else {
          // Animation terminée
          setDisplayedBalance(endValue);
          setAnimationColor('');
          setIsAnimating(false);
          localStorage.setItem('previousCoinsBalance', endValue.toString());
          previousBalanceRef.current = endValue;
        }
      };
      
      animationRef.current = requestAnimationFrame(animateCounter);
    }
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [balance, isLoading]);
  
  // Initialiser la référence précédente
  useEffect(() => {
    if (!isLoading && previousBalanceRef.current === null) {
      previousBalanceRef.current = balance;
    }
  }, [balance, isLoading]);

  return (
    <section
      aria-label="Coins summary"
      className="text-center px-6 mb-16"
      data-testid="coins-hero"
    >
      <motion.div 
        className={`text-[72px] leading-none font-light tracking-tight transition-colors duration-500 ${
          animationColor || 'text-white'
        }`}
        data-testid="coins-amount"
        animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3, repeat: isAnimating ? 3 : 0 }}
      >
        {isLoading ? "..." : displayedBalance.toLocaleString()}
      </motion.div>
    </section>
  );
}