import React from 'react';
import { PaymentForm } from './PaymentForm';

interface PaymentModalProps {
  isOpen: boolean;
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  orderId,
  amount,
  onSuccess,
  onClose,
}) => {
  if (!isOpen) return null;

  const handleSuccess = () => {
    onSuccess();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content payment-modal">
        <div className="modal-header">
          <h2>Complete Your Purchase</h2>
          <button onClick={onClose} className="close-button">
            ×
          </button>
        </div>
        
        <div className="modal-body">
          <PaymentForm
            orderId={orderId}
            amount={amount}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;