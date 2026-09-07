import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useUserStore } from '@/store/user-store';
import { formatFullNumber } from '@/lib/formatUtils';

interface CoinsHeroProps {
  // Whether Home is actually the thing on screen right now, as opposed to sitting mounted but
  // covered behind a full-screen overlay (Classic 21, the Battle Pass, Play with Friends, the
  // in-app Leaderboard, ...). Defaults to true so any other/future usage keeps today's always-
  // animate behavior. See the "Animate coins" effect below for why Home needs to actually know.
  isVisible?: boolean;
}

export default function CoinsHero({ isVisible = true }: CoinsHeroProps) {
  const { t } = useTranslation('coinsHero');
  // Get balance from useUserStore
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);
  const loadUserCoins = useUserStore((state) => state.loadUserCoins);
  const balance = user?.coins || 0;

  // States for animation
  const [displayedBalance, setDisplayedBalance] = useState(balance);
  const [animationColor, setAnimationColor] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const previousBalanceRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);
  // isLoading is a single global flag on the user store, not scoped to this component's own
  // fetch — Home stays mounted behind full-screen overlays now (Classic 21, Play with
  // Friends), and those call loadUserCoins() on their own mount too, which used to blank this
  // out to "..." for a refetch that had nothing to do with what's already showing here. Once
  // a real balance has been shown once, keep showing it (still fresh from the store) instead
  // of re-blanking on every later background refresh, wherever it's triggered from.
  const hasLoadedOnceRef = useRef(false);
  useEffect(() => {
    if (!isLoading) hasLoadedOnceRef.current = true;
  }, [isLoading]);

  // Load balance on component mount
  useEffect(() => {
    loadUserCoins();
  }, [loadUserCoins]);

  // Animate coins when balance changes -- gated on isVisible. Home stays mounted underneath
  // every full-screen overlay (Classic 21, Battle Pass claims, Play with Friends, ...) instead
  // of unmounting, so a balance change made while one of those is open used to run this whole
  // 2s count-up (and update the localStorage baseline below) immediately, off-screen, behind
  // the overlay -- by the time the player actually backed out to Home, the animation had
  // already finished and the number just sat at its final value with nothing left to animate.
  // Skipping the diff-and-animate step entirely while hidden leaves the localStorage baseline
  // untouched, so the moment isVisible flips back to true this replays as one combined
  // animation from whatever it was before the player left up to the true current balance.
  useEffect(() => {
    if (!isVisible || isLoading) return;

    // Get the previously stored amount
    const storedBalance = localStorage.getItem('previousCoinsBalance');

    // If no old balance stored, this is the first visit
    if (!storedBalance) {
      setDisplayedBalance(balance);
      localStorage.setItem('previousCoinsBalance', balance.toString());
      previousBalanceRef.current = balance;
      return;
    }

    const previousBalance = parseInt(storedBalance);

    // If no change, no animation
    if (previousBalance === balance) {
      setDisplayedBalance(balance);
      return;
    }

    // There is a change, start animation
    const difference = balance - previousBalance;

    if (difference !== 0) {
      setIsAnimating(true);

      // Set color based on gain/loss
      if (difference > 0) {
        setAnimationColor('text-green-400');
      } else {
        setAnimationColor('text-red-400');
      }

      // Counter animation
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      const startValue = previousBalance;
      const endValue = balance;

      const animateCounter = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth interpolation
        const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const easedProgress = easeInOutQuad(progress);

        const currentValue = Math.round(startValue + (endValue - startValue) * easedProgress);
        setDisplayedBalance(currentValue);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateCounter);
        } else {
          // Animation finished
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
  }, [isVisible, balance, isLoading]);

  // Store initial balance -- also gated on isVisible, same reason as the animate effect above:
  // syncing displayedBalance straight to the raw balance while hidden would leave that effect
  // with nothing left to animate from once Home becomes visible again.
  useEffect(() => {
    if (!isVisible || isLoading) return;
    if (balance > 0) {
      setDisplayedBalance(balance);
    }
  }, [isVisible, balance, isLoading]);

  return (
    <section
      aria-label={t('ariaLabel')}
      className="text-center px-6 mb-16 pt-4"
      data-testid="coins-hero"
    >
      <motion.div
        className={`text-[72px] leading-none font-light tracking-tight transition-colors duration-500 ${animationColor || 'text-white'
          }`}
        data-testid="coins-amount"
        animate={isAnimating ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3, repeat: isAnimating ? 3 : 0 }}
      >
        {isLoading && !hasLoadedOnceRef.current ? "..." : formatFullNumber(displayedBalance)}
      </motion.div>
    </section>
  );
}