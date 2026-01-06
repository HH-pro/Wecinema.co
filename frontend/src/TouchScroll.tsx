// TouchSystem.tsx
import { useState, useRef, TouchEvent, ReactNode } from 'react';

// 1. SWIPE COMPONENT - One file, all gestures
export const SwipeComponent = ({ children }: { children: ReactNode }) => {
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const [touchEnd, setTouchEnd] = useState({ x: 0, y: 0 });
  const [direction, setDirection] = useState<string>('');

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const diffX = touchStart.x - touchEnd.x;
    const diffY = touchStart.y - touchEnd.y;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (diffX > 30) {
        setDirection('Swiped Left');
        console.log('Left swipe - Previous item');
      } else if (diffX < -30) {
        setDirection('Swiped Right');
        console.log('Right swipe - Next item');
      }
    } else {
      // Vertical swipe
      if (diffY > 30) {
        setDirection('Swiped Up');
        console.log('Up swipe - Close modal');
      } else if (diffY < -30) {
        setDirection('Swiped Down');
        console.log('Down swipe - Open menu');
      }
    }
  };

  return (
    <div
      className="touch-area"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        padding: '20px',
        border: '2px solid #007bff',
        borderRadius: '10px',
        touchAction: 'pan-y',
        userSelect: 'none'
      }}
    >
      {children}
      {direction && (
        <div style={{ 
          marginTop: '10px', 
          color: '#007bff',
          fontSize: '14px'
        }}>
          ↕ {direction}
        </div>
      )}
    </div>
  );
};

// 2. SIMPLE CAROUSEL with Touch
export const SimpleCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);

  const handleTouchStart = (e: TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) { // Threshold
      if (diff > 0) {
        // Swipe left - next
        setCurrentIndex((prev) => 
          prev === images.length - 1 ? 0 : prev + 1
        );
      } else {
        // Swipe right - previous
        setCurrentIndex((prev) => 
          prev === 0 ? images.length - 1 : prev - 1
        );
      }
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '12px',
        touchAction: 'pan-y'
      }}
    >
      <img
        src={images[currentIndex]}
        alt={`Slide ${currentIndex + 1}`}
        style={{
          width: '100%',
          height: '300px',
          objectFit: 'cover',
          transition: 'transform 0.3s'
        }}
      />
      
      {/* Dots Indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '10px'
      }}>
        {images.map((_, idx) => (
          <div
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: idx === currentIndex ? '#007bff' : '#ddd',
              cursor: 'pointer'
            }}
          />
        ))}
      </div>
    </div>
  );
};

// 3. TOUCH BUTTON with Feedback
export const TouchButton = ({ 
  children, 
  onClick 
}: { 
  children: ReactNode; 
  onClick: () => void;
}) => {
  const [isTouching, setIsTouching] = useState(false);

  return (
    <button
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => {
        setIsTouching(false);
        onClick();
      }}
      onTouchCancel={() => setIsTouching(false)}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: isTouching ? '#0056b3' : '#007bff',
        color: 'white',
        cursor: 'pointer',
        transition: 'all 0.1s',
        transform: isTouching ? 'scale(0.98)' : 'scale(1)',
        boxShadow: isTouching 
          ? 'inset 0 2px 4px rgba(0,0,0,0.2)' 
          : '0 2px 8px rgba(0,123,255,0.3)'
      }}
    >
      {children}
    </button>
  );
};

// 4. DRAGGABLE ELEMENT - Simple
export const DraggableItem = ({ children }: { children: ReactNode }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e: TouchEvent) => {
    setIsDragging(true);
    startPos.current = {
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.touches[0].clientX - startPos.current.x,
      y: e.touches[0].clientY - startPos.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none',
        padding: '15px',
        backgroundColor: isDragging ? '#f0f8ff' : 'white',
        border: `2px solid ${isDragging ? '#007bff' : '#ddd'}`,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'background-color 0.2s'
      }}
    >
      👆 {children}
    </div>
  );
};

// 5. TOGGLE SWITCH - Touch Optimized
export const TouchToggle = () => {
  const [isOn, setIsOn] = useState(false);
  const [isTouching, setIsTouching] = useState(false);

  return (
    <div
      onTouchStart={() => setIsTouching(true)}
      onTouchEnd={() => {
        setIsTouching(false);
        setIsOn(!isOn);
      }}
      style={{
        width: '60px',
        height: '30px',
        backgroundColor: isOn ? '#4CAF50' : '#ccc',
        borderRadius: '15px',
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s',
        transform: isTouching ? 'scale(0.95)' : 'scale(1)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '3px',
          left: isOn ? '33px' : '3px',
          width: '24px',
          height: '24px',
          backgroundColor: 'white',
          borderRadius: '50%',
          transition: 'left 0.3s',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
};

// 6. MAIN APP - All components in one view
export default function TouchApp() {
  const images = [
    'https://via.placeholder.com/400x300/007bff/ffffff?text=Slide+1',
    'https://via.placeholder.com/400x300/28a745/ffffff?text=Slide+2',
    'https://via.placeholder.com/400x300/dc3545/ffffff?text=Slide+3'
  ];

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '400px', 
      margin: '0 auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Touch Interactions Demo</h2>
      
      {/* Swipe Component */}
      <div style={{ marginBottom: '30px' }}>
        <h3>1. Swipe Detection</h3>
        <SwipeComponent>
          <p>Swipe in any direction 👆👇👈👉</p>
        </SwipeComponent>
      </div>

      {/* Carousel */}
      <div style={{ marginBottom: '30px' }}>
        <h3>2. Touch Carousel</h3>
        <SimpleCarousel images={images} />
        <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          Swipe left/right to navigate
        </p>
      </div>

      {/* Touch Button */}
      <div style={{ marginBottom: '30px' }}>
        <h3>3. Touch Button</h3>
        <TouchButton onClick={() => alert('Button tapped!')}>
          Tap Me 👆
        </TouchButton>
      </div>

      {/* Draggable */}
      <div style={{ 
        marginBottom: '30px', 
        position: 'relative',
        height: '100px',
        border: '1px dashed #ddd',
        borderRadius: '8px'
      }}>
        <h3>4. Draggable Item</h3>
        <DraggableItem>
          Drag me around
        </DraggableItem>
      </div>

      {/* Toggle */}
      <div style={{ marginBottom: '30px' }}>
        <h3>5. Touch Toggle</h3>
        <TouchToggle />
        <p style={{ fontSize: '14px', color: '#666' }}>
          Tap to toggle
        </p>
      </div>

      {/* Tips */}
      <div style={{
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        fontSize: '14px'
      }}>
        <h4>📱 Touch Best Practices:</h4>
        <ul style={{ paddingLeft: '20px' }}>
          <li>Minimum touch target: 44×44px</li>
          <li>Provide visual feedback on touch</li>
          <li>Add touch-action CSS property</li>
          <li>Prevent default carefully</li>
          <li>Test on actual mobile devices</li>
        </ul>
      </div>
    </div>
  );
}