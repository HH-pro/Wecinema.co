import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";

// Define proper TypeScript interface
interface SkeletonLoaderProps {
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

// Skeleton styles
const skeletonAnimation = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

// Use styled.div with proper typing
const SkeletonContainer = styled.div`
  margin-bottom: 2em;
`;

const SkeletonImage = styled.div<{ width?: number | string }>`
  height: 240px;
  width: ${props => typeof props.width === 'number' ? `${props.width}px` : props.width || '380px'};
  border-radius: 6px;
  background: #94856799;
  margin-top: 10px;
  animation: ${skeletonAnimation} 1.5s infinite;
`;

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  width = 200,
  className = "",
  style = {}
}) => {
  // ✅ Create proper refs for any DOM elements
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  return (
    <SkeletonContainer 
      className={`gallery ${className}`.trim()} 
      style={style}
      ref={containerRef} // ✅ Using ref object, not string
    >
      <SkeletonImage 
        width={width} 
        className="llle"
        ref={imageRef} // ✅ Using ref object, not string
      />
    </SkeletonContainer>
  );
};

export default SkeletonLoader;