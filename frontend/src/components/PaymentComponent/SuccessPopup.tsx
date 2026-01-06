import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Confetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Styled Components
const SuccessOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  backdrop-filter: blur(10px);
`;

const SuccessContainer = styled.div`
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
      rgba(34, 197, 94, 0.3), 
      rgba(21, 128, 61, 0.3)
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
  background: linear-gradient(135deg, #22c55e, #15803d);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const SuccessMessage = styled.p`
  font-size: 18px;
  margin-bottom: 25px;
  line-height: 1.6;
  text-shadow: 0 2px 4px rgba(0,0,0,0.2);
  opacity: 0.95;
`;

const FeatureList = styled.ul`
  text-align: left;
  margin: 25px 0;
  padding: 0 20px;
  
  li {
    margin: 12px 0;
    font-size: 16px;
    display: flex;
    align-items: center;
    
    &::before {
      content: '✓';
      color: #22c55e;
      font-weight: bold;
      margin-right: 10px;
      font-size: 18px;
    }
  }
`;

const CountdownText = styled.div`
  font-size: 16px;
  opacity: 0.9;
  margin: 20px 0;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 20px;
  border-radius: 20px;
  display: inline-block;
  backdrop-filter: blur(10px);
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #22c55e, #15803d);
  color: white;
  border: none;
  padding: 16px 40px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 10px 25px rgba(34, 197, 94, 0.4);
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
  margin-top: 10px;
  
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
    box-shadow: 0 15px 30px rgba(34, 197, 94, 0.6);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(34, 197, 94, 0.5);
  }
`;

// Props interface
interface PaymentSuccessPopupProps {
  isVisible: boolean;
  subscriptionType: 'user' | 'studio';
  userType: 'buyer' | 'seller';
  amount: number;
  onClose?: () => void;
}

const PaymentSuccessPopup: React.FC<PaymentSuccessPopupProps> = ({
  isVisible,
  subscriptionType,
  userType,
  amount,
  onClose
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    if (isVisible) {
      // Start countdown for automatic redirect
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleRedirect();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Stop confetti after 5 seconds
      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);

      return () => {
        clearInterval(timer);
        clearTimeout(confettiTimer);
      };
    }
  }, [isVisible]);

  const handleRedirect = () => {
    if (onClose) {
      onClose();
    }
    navigate('/'); // Redirect to home page
  };

  const handleContinue = () => {
    handleRedirect();
  };

  if (!isVisible) return null;

  const features = subscriptionType === 'user' 
    ? [
        'Access to all basic features',
        'Buy and sell films & scripts',
        '5GB storage space',
        'Community access',
        'Basic customer support'
      ]
    : [
        'All basic plan features',
        'Priority customer support',
        'Early access to new features',
        'Team collaboration tools',
        'Advanced analytics dashboard'
      ];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <SuccessOverlay />
          <SuccessContainer
            as={motion.div}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5 }}
          >
            {showConfetti && (
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                <Confetti 
                  width={400}
                  height={600}
                  numberOfPieces={150}
                  recycle={false}
                  gravity={0.1}
                />
              </div>
            )}
            
            <SuccessIcon>🎉</SuccessIcon>
            <SuccessTitle>Payment Successful!</SuccessTitle>
            
            <SuccessMessage>
              Your {subscriptionType === 'user' ? 'Basic' : 'Pro'} Plan subscription has been activated.
            </SuccessMessage>
            
            <div style={{ margin: '20px 0' }}>
              <p style={{ fontSize: '20px', marginBottom: '5px' }}>
                <strong>Amount:</strong> ${amount}
              </p>
              <p style={{ fontSize: '16px', opacity: 0.9 }}>
                <strong>User Type:</strong> {userType === 'buyer' ? 'Buyer 👤' : 'Seller 🏪'}
              </p>
            </div>
            
            <div style={{ textAlign: 'left', margin: '20px 0' }}>
              <h4 style={{ marginBottom: '10px', color: '#22c55e' }}>Features Activated:</h4>
              <FeatureList>
                {features.map((feature, index) => (
                  <li key={index}>{feature}</li>
                ))}
              </FeatureList>
            </div>
            
            <CountdownText>
              Redirecting to dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
            </CountdownText>
            
            <ActionButton onClick={handleContinue}>
              Continue to Dashboard
            </ActionButton>
            
            <p style={{ marginTop: '20px', fontSize: '14px', opacity: 0.8 }}>
              Need help? Contact support@hypemode.com
            </p>
          </SuccessContainer>
        </>
      )}
    </AnimatePresence>
  );
};

export default PaymentSuccessPopup;