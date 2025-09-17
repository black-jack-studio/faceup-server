import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";

interface BetSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  onRelease?: (value: number) => void;
  className?: string;
  dataTestId?: string;
}

export function BetSlider({ 
  min, 
  max, 
  value, 
  onChange, 
  onRelease,
  className = "",
  dataTestId
}: BetSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [lastHapticPosition, setLastHapticPosition] = useState(-1);
  
  // Motion values
  const x = useMotionValue(0);
  const thumbScale = useMotionValue(1);
  
  // Calculate the thumb position based on current value
  const valueToPosition = useCallback((val: number) => {
    if (containerWidth === 0) return 0;
    const normalizedValue = (val - min) / (max - min);
    return normalizedValue * (containerWidth - 24); // 24px = thumb width
  }, [min, max, containerWidth]);
  
  // Calculate value from position
  const positionToValue = useCallback((pos: number) => {
    if (containerWidth === 0) return min;
    const t = Math.max(0, Math.min(1, pos / (containerWidth - 24)));
    const rawValue = min + t * (max - min);
    return Math.max(min, Math.min(max, Math.round(rawValue)));
  }, [min, max, containerWidth]);
  
  // Handle container resize
  useEffect(() => {
    const updateContainerWidth = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerWidth(rect.width);
      }
    };
    
    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);
    return () => window.removeEventListener('resize', updateContainerWidth);
  }, []);
  
  // Update thumb position when value changes
  useEffect(() => {
    if (!isDragging && containerWidth > 0) {
      const targetPosition = valueToPosition(value);
      animate(x, targetPosition, {
        type: "spring",
        stiffness: 400,
        damping: 30,
        duration: 0.15
      });
    }
  }, [value, valueToPosition, x, isDragging, containerWidth]);
  
  // Haptic feedback function
  const triggerHaptic = useCallback((position: number) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const t = position / (containerWidth - 24);
      const currentThreshold = Math.floor(t * 4); // 0, 1, 2, 3 for 0%, 25%, 50%, 75%, 100%
      
      if (currentThreshold !== lastHapticPosition && (currentThreshold === 1 || currentThreshold === 2 || currentThreshold === 4)) {
        navigator.vibrate(10); // Light haptic feedback
        setLastHapticPosition(currentThreshold);
      }
    }
  }, [containerWidth, lastHapticPosition]);
  
  // Pan handlers
  const handlePanStart = useCallback(() => {
    setIsDragging(true);
    animate(thumbScale, 1.04, { duration: 0.1 });
  }, [thumbScale]);
  
  const handlePan = useCallback((_: any, info: PanInfo) => {
    if (containerWidth === 0) return;
    
    const currentPosition = x.get();
    const newPosition = Math.max(0, Math.min(containerWidth - 24, currentPosition + info.delta.x));
    
    x.set(newPosition);
    triggerHaptic(newPosition);
    
    const newValue = positionToValue(newPosition);
    onChange(newValue);
  }, [x, containerWidth, positionToValue, onChange, triggerHaptic]);
  
  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
    setLastHapticPosition(-1);
    animate(thumbScale, 1, { duration: 0.15 });
    
    if (onRelease) {
      const currentPosition = x.get();
      const finalValue = positionToValue(currentPosition);
      onRelease(finalValue);
    }
  }, [thumbScale, x, positionToValue, onRelease]);
  
  // Transform for the fill bar width
  const fillWidth = useTransform(
    x,
    [0, containerWidth - 24],
    [0, containerWidth - 24]
  );
  
  // Handle click on track
  const handleTrackClick = useCallback((event: React.MouseEvent) => {
    if (isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const targetPosition = Math.max(0, Math.min(containerWidth - 24, clickX - 12)); // 12px = half thumb width
    
    animate(x, targetPosition, {
      type: "spring",
      stiffness: 400,
      damping: 30,
      duration: 0.15
    });
    
    const newValue = positionToValue(targetPosition);
    onChange(newValue);
    
    if (onRelease) {
      onRelease(newValue);
    }
  }, [isDragging, containerWidth, x, positionToValue, onChange, onRelease]);
  
  return (
    <div className={`w-full ${className}`} data-testid={dataTestId}>
      <div 
        ref={containerRef}
        className="relative h-12 w-full cursor-pointer"
        onClick={handleTrackClick}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label="Bet amount slider"
        tabIndex={0}
        style={{ minHeight: '44px' }} // Accessibility requirement
      >
        {/* Track Background */}
        <div 
          className="absolute top-1/2 left-0 w-full h-1 rounded-full transform -translate-y-1/2"
          style={{
            background: '#2B2D32',
          }}
        />
        
        {/* Filled Track */}
        <motion.div 
          className="absolute top-1/2 left-0 h-1 rounded-full transform -translate-y-1/2"
          style={{
            width: fillWidth,
            background: 'linear-gradient(90deg, #D9DADE 0%, #FFFFFF 100%)',
          }}
        />
        
        {/* Thumb */}
        <motion.div
          style={{
            x,
            scale: thumbScale,
            boxShadow: `
              0 1px 3px 0 rgba(0, 0, 0, 0.1),
              0 1px 2px 0 rgba(0, 0, 0, 0.06),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.4)
            `,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: Math.max(0, containerWidth - 24) }}
          dragElastic={0}
          dragMomentum={false}
          onPanStart={handlePanStart}
          onPan={handlePan}
          onPanEnd={handlePanEnd}
          className="absolute top-1/2 w-6 h-6 rounded-full cursor-grab active:cursor-grabbing transform -translate-y-1/2 bg-white"
          whileHover={{ scale: isDragging ? 1.04 : 1.02 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 30
          }}
        >
          {/* Glossy highlight */}
          <div 
            className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default BetSlider;