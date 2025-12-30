import React, { useState, useEffect } from 'react';
import {
  CardElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useStripePayment } from '../hooks/useStripePayment'; // ✅ Fixed import path

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  orderId: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
  className?: string;
}

const PaymentFormContent: React.FC<PaymentFormProps> = ({
  orderId,
  amount,
  onSuccess,
  onCancel,
  className = '',
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const {
    loading,
    error,
    processCardPayment,
    clearError,
  } = useStripePayment();

  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        // Call your backend to create payment intent
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId,
            amount: Math.round(amount * 100), // Convert to cents
          }),
        });

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
      }
    };

    if (amount > 0) {
      createPaymentIntent();
    }
  }, [orderId, amount]);

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
    clearError();

    try {
      // ✅ Use the hook to process payment
      const success = await processCardPayment(orderId, cardElement, amount);
      
      if (success) {
        console.log('✅ Payment successful!');
        onSuccess();
      } else {
        console.log('❌ Payment failed');
      }
    } catch (err: any) {
      console.error('Payment processing error:', err);
      // Error is already set by the hook
    } finally {
      setProcessing(false);
    }
  };

  // ✅ Handle card element changes
  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    clearError(); // Clear errors when user types
    
    // Log but ignore Stripe tracking errors
    if (event.error && event.error.message && 
        (event.error.message.includes('stripe.com/b') || 
         event.error.message.includes('r.stripe.com'))) {
      console.warn('Stripe tracking error in card element:', event.error);
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

  const isDisabled = !stripe || !cardComplete || processing || loading;

  return (
    <div className={`payment-form-container ${className}`}>
      <div className="payment-header">
        <h3 className="text-xl font-bold mb-2">Complete Payment</h3>
        <div className="payment-amount text-2xl font-bold text-green-600">
          ${amount.toFixed(2)}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="payment-form mt-4">
        <div className="form-section mb-4">
          <label className="form-label block text-sm font-medium mb-2">
            Card Details
          </label>
          <div className="card-element-container border rounded-lg p-3 bg-white">
            <CardElement
              options={cardElementOptions}
              onChange={handleCardChange}
            />
          </div>
        </div>

        {/* ✅ Only show meaningful errors */}
        {error && !error.includes('stripe.com/b') && !error.includes('r.stripe.com') && (
          <div className="error-message bg-red-50 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="payment-actions flex justify-between mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing || loading}
            className="btn btn-outline px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isDisabled}
            className="btn btn-primary bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing || loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              `Pay $${amount.toFixed(2)}`
            )}
          </button>
        </div>

        <div className="payment-security mt-8 pt-6 border-t">
          <div className="security-badge flex items-center text-sm text-gray-600 mb-2">
            <span className="mr-2">🔒</span>
            Secure payment processed by Stripe
          </div>
          <div className="test-mode-notice text-xs text-gray-500">
            Test Mode: Use card number <code className="bg-gray-100 px-1 rounded">4242 4242 4242 4242</code>, any future expiry, and any CVC
          </div>
        </div>
      </form>
    </div>
  );
};

// ✅ Error Boundary Component
class StripeErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: any) {
    // Ignore Stripe tracking errors
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('stripe.com/b') || errorMsg.includes('r.stripe.com')) {
      return { hasError: false, errorMessage: '' };
    }
    return { hasError: true, errorMessage: errorMsg };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Only log meaningful errors
    const errorMsg = error.message || String(error);
    if (!errorMsg.includes('stripe.com/b') && !errorMsg.includes('r.stripe.com')) {
      console.error('Stripe Error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container p-6 bg-red-50 rounded-lg">
          <h3 className="text-lg font-bold text-red-700 mb-2">Payment Error</h3>
          <p className="text-red-600 mb-4">
            {this.state.errorMessage || 'Something went wrong with the payment system.'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn btn-primary bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ✅ Main PaymentForm Component
export const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const [stripeLoaded, setStripeLoaded] = useState(false);

  useEffect(() => {
    // Check if Stripe is loaded
    const checkStripe = async () => {
      try {
        await stripePromise;
        setStripeLoaded(true);
      } catch (error) {
        console.error('Failed to load Stripe:', error);
      }
    };

    checkStripe();
  }, []);

  if (!stripeLoaded) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3">Loading payment system...</span>
      </div>
    );
  }

  return (
    <StripeErrorBoundary>
      <Elements stripe={stripePromise}>
        <PaymentFormContent {...props} />
      </Elements>
    </StripeErrorBoundary>
  );
};

// ✅ Optional: Add default props
PaymentFormContent.defaultProps = {
  className: '',
};

export default PaymentForm;