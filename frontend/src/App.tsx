import { default as Router } from "./routes";
import "./App.css";
import { useEffect, useState, useRef, TouchEvent } from "react";
import * as Sentry from "@sentry/react";
import AICustomerSupport from "./components/AICustomerSupport";
import { MarketplaceProvider } from "./context/MarketplaceContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const categories = [
  "Action ",
  "Adventure ",
  "Comedy ",
  "Documentary ",
  "Drama ",
  "Horror ",
  "Mystery ",
  "Romance ",
  "Thriller ",
];

export const themes = [
  "Coming-of-age story",
  "Good versus evil",
  "Love",
  "Redemption",
  "Family",
  "Opperession",
  "Survival",
  "Revenge",
  "Justice",
  "War",
  "Bravery",
  "Freedom",
  "Friendship",
  "Death",
  "Isolation",
  "Peace",
  "Perseverance",
];

export const ratings = ["g ", "pg ", "pg-13 ", "r ", "x "];

export default function App() {
  // Custom Cursor States
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  
  // Touch Hold to Scroll States
  const [isTouchHolding, setIsTouchHolding] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  const cursorRef = useRef<HTMLDivElement>(null);
  const touchHoldTimerRef = useRef<NodeJS.Timeout>();
  const scrollIntervalRef = useRef<NodeJS.Timeout>();
  const touchStartRef = useRef<{y: number, time: number} | null>(null);

  // ✅ Tawk.to Live Chat Widget Setup
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://embed.tawk.to/6849bde9e7d8d619164a49fe/1itg0ro66";
    script.async = true;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    document.body.appendChild(script);
  }, []);

  // Detect touch device
  useEffect(() => {
    const checkTouchDevice = () => {
      const isTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 || 
                     (navigator as any).msMaxTouchPoints > 0;
      setIsTouchDevice(isTouch);
      
      if (isTouch) {
        setShowCursor(false);
        document.body.classList.add('touch-device');
      } else {
        document.body.classList.remove('touch-device');
      }
    };
    
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  // Custom Cursor Effect (for non-touch devices)
  useEffect(() => {
    if (isTouchDevice) return;

    const updateCursor = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    // Auto-hide cursor when not moving
    let hideTimeout: NodeJS.Timeout;
    const handleMouseMove = () => {
      setShowCursor(true);
      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        setShowCursor(false);
      }, 2000);
    };

    // Hide cursor on leaving window
    const handleMouseLeave = () => setShowCursor(false);
    const handleMouseEnter = () => setShowCursor(true);

    window.addEventListener('mousemove', updateCursor);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    // Hide default cursor
    document.body.style.cursor = 'none';

    // Detect interactive elements
    const interactiveSelectors = 'button, a, input, textarea, select, [role="button"], [onclick]';
    
    const handleMouseEnterElement = () => setIsHovering(true);
    const handleMouseLeaveElement = () => setIsHovering(false);

    const observer = new MutationObserver(() => {
      const elements = document.querySelectorAll(interactiveSelectors);
      elements.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnterElement);
        el.addEventListener('mouseleave', handleMouseLeaveElement);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial setup
    const initialElements = document.querySelectorAll(interactiveSelectors);
    initialElements.forEach(el => {
      el.addEventListener('mouseenter', handleMouseEnterElement);
      el.addEventListener('mouseleave', handleMouseLeaveElement);
    });

    return () => {
      window.removeEventListener('mousemove', updateCursor);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.body.style.cursor = 'auto';
      
      clearTimeout(hideTimeout);
      observer.disconnect();
      
      const elements = document.querySelectorAll(interactiveSelectors);
      elements.forEach(el => {
        el.removeEventListener('mouseenter', handleMouseEnterElement);
        el.removeEventListener('mouseleave', handleMouseLeaveElement);
      });
    };
  }, [isTouchDevice]);

  // Touch Hold to Scroll Logic
  useEffect(() => {
    if (!isTouchDevice) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        y: touch.clientY,
        time: Date.now()
      };
      setTouchStartY(touch.clientY);
      setScrollVelocity(0);
      
      // Show scroll indicator
      setShowScrollIndicator(true);
      
      // Start timer for touch hold
      touchHoldTimerRef.current = setTimeout(() => {
        setIsTouchHolding(true);
        // Start auto-scroll
        startAutoScroll(touch.clientY);
      }, 800); // Hold for 800ms to activate
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouchHolding) {
        const touch = e.touches[0];
        const deltaY = touchStartY - touch.clientY;
        
        // Calculate scroll velocity for smooth scrolling
        if (touchStartRef.current) {
          const timeDiff = Date.now() - touchStartRef.current.time;
          const distance = Math.abs(touchStartRef.current.y - touch.clientY);
          const velocity = distance / timeDiff;
          setScrollVelocity(velocity * 10); // Scale for better UX
        }
      }
    };

    const handleTouchEnd = () => {
      clearTimeout(touchHoldTimerRef.current);
      clearInterval(scrollIntervalRef.current);
      setIsTouchHolding(false);
      
      // Hide scroll indicator with delay
      setTimeout(() => {
        setShowScrollIndicator(false);
      }, 1000);
    };

    const startAutoScroll = (startY: number) => {
      let lastY = startY;
      let scrollDirection: 'up' | 'down' = 'down';
      
      scrollIntervalRef.current = setInterval(() => {
        const currentScroll = window.scrollY;
        const windowHeight = window.innerHeight;
        const scrollAmount = 30; // Pixels to scroll per interval
        
        // Determine scroll direction based on touch position
        if (lastY < windowHeight / 3) {
          scrollDirection = 'down';
        } else if (lastY > windowHeight * 2/3) {
          scrollDirection = 'up';
        }
        
        // Scroll the page
        if (scrollDirection === 'down') {
          window.scrollTo({
            top: currentScroll + scrollAmount,
            behavior: 'smooth'
          });
        } else {
          window.scrollTo({
            top: Math.max(0, currentScroll - scrollAmount),
            behavior: 'smooth'
          });
        }
      }, 50); // Scroll every 50ms
    };

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart as any);
    document.addEventListener('touchmove', handleTouchMove as any);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart as any);
      document.removeEventListener('touchmove', handleTouchMove as any);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      clearTimeout(touchHoldTimerRef.current);
      clearInterval(scrollIntervalRef.current);
    };
  }, [isTouchDevice, isTouchHolding, touchStartY]);

  // Click animation effect for cursor
  useEffect(() => {
    if (isClicking && cursorRef.current) {
      cursorRef.current.style.transform = `translate(${cursorPosition.x}px, ${cursorPosition.y}px) scale(0.7)`;
      
      setTimeout(() => {
        if (cursorRef.current) {
          cursorRef.current.style.transform = `translate(${cursorPosition.x}px, ${cursorPosition.y}px) scale(1)`;
        }
      }, 150);
    }
  }, [isClicking, cursorPosition]);

  // Cursor style (for non-touch devices)
  const cursorStyle: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    top: 0,
    width: isHovering ? '40px' : '30px',
    height: isHovering ? '40px' : '30px',
    borderRadius: '50%',
    backgroundColor: isHovering 
      ? 'rgba(0, 123, 255, 0.2)' 
      : isClicking 
        ? 'rgba(220, 53, 69, 0.3)' 
        : 'rgba(0, 0, 0, 0.15)',
    border: isHovering 
      ? '2px solid #007bff' 
      : isClicking 
        ? '2px solid #dc3545' 
        : '2px solid #333',
    pointerEvents: 'none',
    transform: `translate(${cursorPosition.x}px, ${cursorPosition.y}px)`,
    transition: 'all 0.15s ease, transform 0.1s ease',
    zIndex: 999999,
    display: showCursor ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    transformOrigin: 'center',
    boxShadow: isHovering 
      ? '0 0 20px rgba(0, 123, 255, 0.3)' 
      : isClicking 
        ? '0 0 20px rgba(220, 53, 69, 0.3)' 
        : '0 0 10px rgba(0, 0, 0, 0.1)'
  };

  const innerDotStyle: React.CSSProperties = {
    width: isHovering ? '12px' : '6px',
    height: isHovering ? '12px' : '6px',
    borderRadius: '50%',
    backgroundColor: isHovering 
      ? '#007bff' 
      : isClicking 
        ? '#dc3545' 
        : '#333',
    transition: 'all 0.15s ease'
  };

  // Trail effect for cursor
  const trailCount = 3;
  const trails = [];
  
  for (let i = 0; i < trailCount; i++) {
    const delay = i * 30;
    const size = 24 - (i * 6);
    const opacity = 0.2 - (i * 0.06);
    
    trails.push(
      <div
        key={i}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          backgroundColor: `rgba(0, 123, 255, ${opacity})`,
          transform: `translate(${cursorPosition.x}px, ${cursorPosition.y}px)`,
          transition: `transform ${0.2 + (i * 0.05)}s linear ${delay}ms`,
          pointerEvents: 'none',
          zIndex: 999998 - i,
          display: showCursor ? 'block' : 'none'
        }}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Custom Circle Cursor (for non-touch devices) */}
      {!isTouchDevice && trails}
      {!isTouchDevice && (
        <div 
          ref={cursorRef} 
          style={cursorStyle}
          className="custom-cursor"
        >
          <div style={innerDotStyle} />
          {isHovering && (
            <span style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '20px',
              opacity: 0.8
            }}>
              👆
            </span>
          )}
        </div>
      )}

      {/* Touch Hold Scroll Indicator (for touch devices) */}
      {isTouchDevice && showScrollIndicator && (
        <div className="touch-scroll-indicator">
          <div className="scroll-indicator-content">
            <div className="scroll-icon">
              {isTouchHolding ? (
                <div className="scrolling-animation">
                  <div className="arrow up">↑</div>
                  <div className="arrow down">↓</div>
                </div>
              ) : (
                <div className="hold-to-scroll">
                  <div className="touch-circle">
                    <span className="touch-dot"></span>
                  </div>
                  <span className="hold-text">Hold to scroll</span>
                </div>
              )}
            </div>
            <div className="scroll-speed">
              Speed: {scrollVelocity.toFixed(1)}
            </div>
          </div>
        </div>
      )}

      {/* Touch Scroll Guide Overlay */}
      {isTouchDevice && isTouchHolding && (
        <div className="scroll-guide-overlay">
          <div className="scroll-zone top">
            <div className="zone-indicator">Scroll Up ↑</div>
          </div>
          <div className="scroll-zone middle">
            <div className="zone-indicator">Release to stop</div>
          </div>
          <div className="scroll-zone bottom">
            <div className="zone-indicator">Scroll Down ↓</div>
          </div>
        </div>
      )}

      {/* Main App Content */}
      <MarketplaceProvider>
        <AICustomerSupport />
        <Router />
        
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </MarketplaceProvider>
    </div>
  );
}