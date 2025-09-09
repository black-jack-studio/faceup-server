import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  storageKey: string;
  className?: string;
  testId?: string;
}

export default function AnimatedCounter({ value, storageKey, className = "", testId }: AnimatedCounterProps) {
  const [displayedValue, setDisplayedValue] = useState(value);
  const [animationColor, setAnimationColor] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === 0) return;
    
    // Récupérer l'ancienne valeur stockée
    const storedValue = localStorage.getItem(storageKey);
    
    // Si pas d'ancienne valeur stockée, c'est la première fois
    if (!storedValue) {
      setDisplayedValue(value);
      localStorage.setItem(storageKey, value.toString());
      return;
    }
    
    const previousValue = parseInt(storedValue);
    
    // Si pas de changement, pas d'animation
    if (previousValue === value) {
      setDisplayedValue(value);
      return;
    }
    
    // Il y a un changement, démarrer l'animation
    const difference = value - previousValue;
    
    if (difference !== 0) {
      setIsAnimating(true);
      
      // Définir la couleur selon gain/perte
      if (difference > 0) {
        setAnimationColor('text-green-400');
      } else {
        setAnimationColor('text-red-400');
      }
      
      // Animation du compteur
      const duration = 1500; // 1.5 secondes
      const startTime = Date.now();
      const startValue = previousValue;
      const endValue = value;
      
      const animateCounter = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Interpolation douce
        const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOutQuad(progress);
        
        const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
        setDisplayedValue(currentValue);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateCounter);
        } else {
          // Animation terminée
          setDisplayedValue(endValue);
          setTimeout(() => {
            setAnimationColor('');
            setIsAnimating(false);
          }, 500); // Maintenir la couleur 500ms après l'animation
          localStorage.setItem(storageKey, endValue.toString());
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
  }, [value, storageKey]);

  return (
    <motion.span 
      className={`font-medium transition-colors duration-500 ${
        animationColor || className
      }`}
      data-testid={testId}
      animate={isAnimating ? { 
        scale: [1, 1.1, 1],
        textShadow: isAnimating ? '0 0 8px currentColor' : '0 0 0px currentColor'
      } : {}}
      transition={{ duration: 0.4, repeat: isAnimating ? 2 : 0 }}
    >
      {displayedValue.toLocaleString()}
    </motion.span>
  );
}