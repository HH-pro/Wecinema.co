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
      console.error('Stripe not loaded');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      console.error('Card element not found');
      return;
    }

    setProcessing(true);

    try {
      // ✅ Use the hook to process payment
      const success = await processCardPayment(orderId, cardElement, amount);
      
      if (success) {
        console.log('✅ Payment successful!');
        onSuccess();
      } else {
        console.log('❌ Payment failed');
        // Error is already set by the hook
      }
    } catch (err) {
      console.error('Payment processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  // ✅ FIX: Handle card element changes with error filtering
  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    
    // Clear previous errors when user starts typing
    if (event.empty) {
      // Reset error when user starts entering card details
    }
    
    // Ignore Stripe tracking-related errors in card element
    if (event.error && event.error.message && 
        (event.error.message.includes('stripe.com/b') || 
         event.error.message.includes('r.stripe.com'))) {
      console.warn('🟡 Stripe tracking error in card element:', event.error);
      return;
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
        padding: '10px 12px',
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
      },
    },
    hidePostalCode: true,
  };

  return (
    <div className="payment-form-container">
      <div className="payment-header">
        <h3>Complete Payment</h3>
        <div className="payment-amount">${amount.toFixed(2)}</div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-section">
          <label className="form-label">Card Details</label>
          <div className="card-element-container">
            <CardElement
              options={cardElementOptions}
              onChange={handleCardChange}
            />
          </div>
        </div>

        {/* ✅ FIX: Only show non-tracking errors */}
        {error && !error.includes('stripe.com/b') && !error.includes('r.stripe.com') && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="payment-actions">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing || loading}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!stripe || !cardComplete || processing || loading}
            className="btn btn-primary"
          >
            {processing || loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
          </button>
        </div>

        <div className="payment-security">
          <div className="security-badge">
            🔒 Secure payment processed by Stripe
          </div>
          <div className="test-mode-notice">
            <small>Test Mode: Use 4242 4242 4242 4242</small>
          </div>
        </div>
      </form>
    </div>
  );
};

// ✅ FIX: Error boundary for non-tracking errors
class StripeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // Ignore Stripe tracking errors
    if (error.message && 
        (error.message.includes('stripe.com/b') || 
         error.message.includes('r.stripe.com'))) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Only log non-tracking errors
    if (!error.message.includes('stripe.com/b') && !error.message.includes('r.stripe.com')) {
      console.error('Stripe Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h3>Payment Error</h3>
          <p>Something went wrong with the payment system. Please try again.</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <StripeErrorBoundary>
      <Elements stripe={stripePromise}>
        <PaymentFormContent {...props} />
      </Elements>
    </StripeErrorBoundary>
  );
};