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
    
    // Get the previously stored value
    const storedValue = localStorage.getItem(storageKey);
    
    // If no old value stored, this is the first time
    if (!storedValue) {
      setDisplayedValue(value);
      localStorage.setItem(storageKey, value.toString());
      return;
    }
    
    const previousValue = parseInt(storedValue);
    
    // If no change, no animation
    if (previousValue === value) {
      setDisplayedValue(value);
      return;
    }
    
    // There is a change, start animation
    const difference = value - previousValue;
    
    if (difference !== 0) {
      setIsAnimating(true);
      
      // Set color based on gain/loss
      if (difference > 0) {
        setAnimationColor('text-green-400');
      } else {
        setAnimationColor('text-red-400');
      }
      
      // Counter animation
      const duration = 1500; // 1.5 seconds
      const startTime = Date.now();
      const startValue = previousValue;
      const endValue = value;
      
      const animateCounter = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth interpolation
        const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOutQuad(progress);
        
        const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
        setDisplayedValue(currentValue);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateCounter);
        } else {
          // Animation finished
          setDisplayedValue(endValue);
          setTimeout(() => {
            setAnimationColor('');
            setIsAnimating(false);
          }, 500); // Keep color 500ms after animation
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
      className="transition-colors duration-500 tabular-nums font-bold text-lg text-[#f7feff]"
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