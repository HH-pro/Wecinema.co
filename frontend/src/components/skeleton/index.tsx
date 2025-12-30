import React, { useRef } from "react";
import styled, { keyframes } from "styled-components";

interface SkeletonLoaderProps {
  width?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

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
  const skeletonRef = useRef<HTMLDivElement>(null);
  
  return (
    <SkeletonContainer 
      className={`gallery ${className}`.trim()} 
      style={style}
      ref={skeletonRef}
    >
      <SkeletonImage width={width} className="llle" />
    </SkeletonContainer>
  );
};

// ✅ No defaultProps here!
export default SkeletonLoader;