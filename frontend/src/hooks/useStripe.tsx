import { useState } from 'react';
import { PaymentIntent, ApiResponse } from '../types/marketplace';

export const useStripe = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create payment intent
  const createPaymentIntent = async (orderId: string): Promise<ApiResponse<PaymentIntent>> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/marketplace/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      const result: ApiResponse<PaymentIntent> = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Failed to create payment intent');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create payment';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Confirm payment
  const confirmPayment = async (orderId: string, paymentIntentId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch('/api/marketplace/payments/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, paymentIntentId }),
      });

      return await response.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to confirm payment'
      };
    }
  };

  // Capture payment (release funds)
  const capturePayment = async (orderId: string): Promise<ApiResponse<any>> => {
    try {
      const response = await fetch('/api/marketplace/payments/capture-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      return await response.json();
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to capture payment'
      };
    }
  };

  return {
    loading,
    error,
    createPaymentIntent,
    confirmPayment,
    capturePayment,
  };
};