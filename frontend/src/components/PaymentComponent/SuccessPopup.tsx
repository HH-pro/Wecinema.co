import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { AnimatePresence } from 'framer-motion';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  backdrop-filter: blur(10px);
`;

const ProfessionalSuccessPopup = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 50px 40px;
  border-radius: 30px;
  box-shadow: 
    0 25px 50px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.3);
  z-index: 10000;
  text-align: center;
  color: white;
  min-width: 400px;
  max-width: 450px;
  animation: float 3s ease-in-out infinite;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, 
      rgba(251, 191, 36, 0.3), 
      rgba(180, 83, 9, 0.3)
    );
    z-index: -1;
    border-radius: 30px;
  }
  
  @keyframes float {
    0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
    50% { transform: translate(-50%, -50%) translateY(-15px); }
  }
`;

const SuccessIcon = styled.div`
  font-size: 80px;
  margin-bottom: 25px;
  animation: pulse 1.5s infinite;
  filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
`;

const SuccessTitle = styled.h2`
  font-size: 32px;
  margin-bottom: 20px;
  font-weight: 800;
  text-shadow: 0 4px 8px rgba(0,0,0,0.3);
  letter-spacing: 0.5px;
  background: linear-gradient(135deg, #fbbf24, #b45309);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SuccessMessage = styled.p`
  font-size: 18px;
  margin-bottom: 30px;
  line-height: 1.6;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  opacity: 0.95;
`;

const CountdownText = styled.div`
  font-size: 16px;
  opacity: 0.9;
  margin: 25px 0;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 20px;
  border-radius: 20px;
  display: inline-block;
  backdrop-filter: blur(10px);
`;

const CloseButton = styled.button`
  background: linear-gradient(135deg, #fbbf24, #b45309);
  color: white;
  border: none;
  padding: 16px 40px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 25px rgba(251, 191, 36, 0.4);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: 0.5s;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 30px rgba(251, 191, 36, 0.6);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(251, 191, 36, 0.5);
  }
`;

interface SuccessPopupProps {
  countdown: number;
  onRedirectNow: () => void;
}

const SuccessPopup: React.FC<SuccessPopupProps> = ({ countdown, onRedirectNow }) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      <>
        <Overlay />
        <ProfessionalSuccessPopup>
          <SuccessIcon>🎉</SuccessIcon>
          <SuccessTitle>Welcome Back!</SuccessTitle>
          <SuccessMessage>
            Login successful! You're being redirected to your dashboard.
          </SuccessMessage>
          <CountdownText>
            Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </CountdownText>
          <CloseButton onClick={onRedirectNow}>
            Go Now
          </CloseButton>
        </ProfessionalSuccessPopup>
      </>
    </AnimatePresence>
  );
};

export default SuccessPopup;