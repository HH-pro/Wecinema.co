import React from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import PayPalButtonWrapper from './PayPalButtonWrapper';
import styled from 'styled-components';
import { motion } from 'framer-motion';

// Styled Components for Payment
const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
`;

const PaymentSubscriptionBox = styled(motion.div)`
  padding: 50px 40px;
  background: white;
  border-radius: 25px;
  text-align: center;
  width: 100%;
  max-width: 550px;
  box-shadow: 0 25px 50px rgba(251, 191, 36, 0.15);
  position: relative;
  overflow: hidden;
  border: 2px solid #fbbf24;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(to right, #fbbf24, #b45309);
  }
`;

const Title = styled.h2`
  margin-bottom: 25px;
  font-size: 32px;
  font-weight: 800;
  color: #1f2937;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 4px;
    background: linear-gradient(to right, #fbbf24, #b45309);
    border-radius: 2px;
  }
`;

const Description = styled.p`
  font-size: 18px;
  margin-bottom: 12px;
  color: #4b5563;
  line-height: 1.6;
  
  &:last-of-type {
    margin-bottom: 35px;
  }
`;

const PaymentButton = styled.button`
  background: linear-gradient(135deg, #fbbf24, #b45309);
  color: white;
  border: none;
  padding: 18px 35px;
  border-radius: 50px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 25px;
  width: 100%;
  max-width: 320px;
  box-shadow: 0 10px 25px rgba(251, 191, 36, 0.3);
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
  
  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 15px 30px rgba(251, 191, 36, 0.4);
    
    &::before {
      left: 100%;
    }
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    background: linear-gradient(135deg, #d1d5db, #9ca3af);
  }
  
  &:active:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(251, 191, 36, 0.35);
  }
`;

const AmountDisplay = styled.div`
  font-size: 28px;
  font-weight: bold;
  color: #1f2937;
  margin: 25px 0;
  padding: 15px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 15px;
  display: inline-block;
`;

const PaymentDetails = styled.div`
  margin: 20px 0;
  padding: 20px;
  background: #f9fafb;
  border-radius: 15px;
  text-align: left;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  font-weight: 600;
  color: #4b5563;
`;

const DetailValue = styled.span`
  font-weight: 700;
  color: #1f2937;
`;

interface PaymentComponentProps {
  selectedSubscription: "user" | "studio";
  userType: "buyer" | "seller";
  userId: string;
  onPaymentSuccess: () => void;
  onPaymentError: (message: string) => void;
  onSkipPayment: () => void;
}

const PaymentComponent: React.FC<PaymentComponentProps> = ({
  selectedSubscription,
  userType,
  userId,
  onPaymentSuccess,
  onPaymentError,
  onSkipPayment
}) => {
  const navigate = useNavigate();
  const amount = selectedSubscription === 'user' ? 5 : 10;
  
  const handlePaymentSuccess = () => {
    toast.success('Payment successful! Redirecting to home...');
    setTimeout(() => {
      onPaymentSuccess();
      navigate('/');
    }, 1500);
  };
  
  const handlePaymentError = (msg: string) => {
    onPaymentError(msg);
  };
  
  const handleSkipPayment = () => {
    toast.info('You can complete payment later');
    setTimeout(() => {
      onSkipPayment();
      navigate('/');
    }, 1000);
  };
  
  const getPlanName = () => {
    return selectedSubscription === "user" ? "Basic Plan" : "Pro Plan";
  };
  
  const getPlanDescription = () => {
    return selectedSubscription === "user" 
      ? "Perfect for individual users" 
      : "Advanced features for professionals";
  };

  return (
    <Container>
      <PaymentSubscriptionBox
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div>
          <Title>Complete Your Subscription</Title>
          
          <PaymentDetails>
            <DetailRow>
              <DetailLabel>Subscription Plan:</DetailLabel>
              <DetailValue>{getPlanName()}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>User Type:</DetailLabel>
              <DetailValue>
                {userType === "buyer" ? "👤 Buyer" : "🏪 Seller"}
              </DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Description:</DetailLabel>
              <DetailValue>{getPlanDescription()}</DetailValue>
            </DetailRow>
          </PaymentDetails>
          
          <AmountDisplay>
            Total Amount: ${amount}
          </AmountDisplay>
          
          <Description>Secure payment powered by PayPal</Description>
          
          <PayPalButtonWrapper 
            amount={amount} 
            userId={userId} 
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
          
          <PaymentButton 
            onClick={handleSkipPayment}
            style={{ marginTop: '15px', background: 'linear-gradient(135deg, #6b7280, #4b5563)' }}
          >
            Skip for Now
          </PaymentButton>
          
          <Description style={{ marginTop: '25px', fontSize: '14px', color: '#6b7280' }}>
            Note: You can complete payment later from your profile settings
          </Description>
        </div>
      </PaymentSubscriptionBox>
    </Container>
  );
};

export default PaymentComponent;