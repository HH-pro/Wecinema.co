import React, { useState, useEffect } from 'react';
import {
  CardElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useStripePayment } from '../../hooks/useStripePayment';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({
  orderId,
  amount,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const {
    loading,
    error,
    processCardPayment,
  } = useStripePayment();

  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    setProcessing(true);
    const success = await processCardPayment(orderId, cardElement);
    setProcessing(false);

    if (success) {
      onSuccess();
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  };

  return (
    <div className="payment-form-container">
      <div className="payment-header">
        <h3>Complete Payment</h3>
        <div className="payment-amount">${amount}</div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-section">
          <label>Card Details</label>
          <div className="card-element-container">
            <CardElement
              options={cardElementOptions}
              onChange={(e) => setCardComplete(e.complete)}
            />
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="payment-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || !cardComplete || processing || loading}
            className="btn btn-primary"
          >
            {processing || loading ? 'Processing...' : `Pay $${amount}`}
          </button>
        </div>

        <div className="payment-security">
          <div className="security-badge">
            🔒 Secure payment processed by Stripe
          </div>
        </div>
      </form>
    </div>
  );
};

export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentFormContent {...props} />
    </Elements>
  );
};