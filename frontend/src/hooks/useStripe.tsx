import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { marketplaceAPI } from '../services/api';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

interface UseStripePaymentReturn {
  loading: boolean;
  error: string | null;
  createPaymentIntent: (orderId: string) => Promise<PaymentIntent | null>;
  confirmPayment: (orderId: string, paymentIntentId: string) => Promise<boolean>;
  capturePayment: (orderId: string) => Promise<boolean>;
  cancelPayment: (orderId: string) => Promise<boolean>;
  processCardPayment: (orderId: string, cardElement: any) => Promise<boolean>;
}

export const useStripePayment = (): UseStripePaymentReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async (orderId: string): Promise<PaymentIntent | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await marketplaceAPI.payments.createIntent(orderId, setLoading);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        setError(result.error || 'Failed to create payment intent');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const confirmPayment = async (orderId: string, paymentIntentId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await marketplaceAPI.payments.confirm(orderId, paymentIntentId, setLoading);
      
      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Failed to confirm payment');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm payment';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const capturePayment = async (orderId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await marketplaceAPI.payments.capture(orderId, setLoading);
      
      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Failed to capture payment');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture payment';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelPayment = async (orderId: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await marketplaceAPI.payments.cancel(orderId, setLoading);
      
      if (result.success) {
        return true;
      } else {
        setError(result.error || 'Failed to cancel payment');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel payment';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const processCardPayment = async (orderId: string, cardElement: any): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Create payment intent first
      const paymentIntent = await createPaymentIntent(orderId);
      if (!paymentIntent) return false;

      const stripe = await stripePromise;
      if (!stripe) {
        setError('Stripe not loaded');
        return false;
      }

      // Confirm card payment
      const { error: stripeError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(
        paymentIntent.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        return false;
      }

      if (confirmedIntent?.status === 'succeeded') {
        // Confirm payment with our backend
        return await confirmPayment(orderId, paymentIntent.paymentIntentId);
      }

      return false;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createPaymentIntent,
    confirmPayment,
    capturePayment,
    cancelPayment,
    processCardPayment,
  };
};