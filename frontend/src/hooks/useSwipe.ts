import { useRef, useState, useCallback } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

interface SwipeOptions {
  threshold?: number;
  timeThreshold?: number;
}

export const useSwipe = (
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) => {
  const { threshold = 50, timeThreshold = 500 } = options;
  
  const touchStart = useRef<number>(0);
  const touchEnd = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const touchStartTime = useRef<number>(0);
  const [swiping, setSwiping] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchStart.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchStartTime.current = Date.now();
    setSwiping(true);
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      touchEnd.current = e.changedTouches[0].clientX;
      touchEndY.current = e.changedTouches[0].clientY;
      const timeDiff = Date.now() - touchStartTime.current;
      
      if (timeDiff > timeThreshold) {
        setSwiping(false);
        return;
      }

      const horizontalDiff = touchStart.current - touchEnd.current;
      const verticalDiff = touchStartY.current - touchEndY.current;

      // Horizontal swipe
      if (Math.abs(horizontalDiff) > Math.abs(verticalDiff)) {
        if (horizontalDiff > threshold && handlers.onSwipeLeft) {
          handlers.onSwipeLeft();
        }
        if (horizontalDiff < -threshold && handlers.onSwipeRight) {
          handlers.onSwipeRight();
        }
      }
      // Vertical swipe
      else {
        if (verticalDiff > threshold && handlers.onSwipeUp) {
          handlers.onSwipeUp();
        }
        if (verticalDiff < -threshold && handlers.onSwipeDown) {
          handlers.onSwipeDown();
        }
      }

      setSwiping(false);
    },
    [handlers, threshold, timeThreshold]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    touchEnd.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    swiping
  };
};

export default useSwipe;
