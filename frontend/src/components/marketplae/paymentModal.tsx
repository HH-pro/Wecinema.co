import React, { useState } from 'react';
import { FiCheck, FiX, FiUser, FiMail, FiCreditCard, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { Elements, PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import marketplaceApi from '../../api/marketplaceApi';

// Initialize Stripe
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ";
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
  show: boolean;
  clientSecret: string;
  offerData: any;
  onClose: () => void;
  onSuccess: () => void;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed';
  setPaymentStatus: (status: 'idle' | 'processing' | 'success' | 'failed') => void;
  billingDetails: any;
  onBillingDetailsChange: (details: any) => void;
  currentUser: any;
  getThumbnailUrl: (listing: any) => string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  show,
  clientSecret,
  offerData,
  onClose,
  onSuccess,
  paymentStatus,
  setPaymentStatus,
  billingDetails,
  onBillingDetailsChange,
  currentUser,
  getThumbnailUrl
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-md sm:max-w-lg mx-4">
        <div className="bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {offerData?.type === 'direct_purchase' ? 'Complete Purchase' : 'Complete Offer Payment'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {offerData?.type === 'direct_purchase' ? 'Complete your purchase securely' : 'Complete payment for your offer'}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paymentStatus === 'processing'}
            >
              <FiX size={20} className="text-gray-600" />
            </button>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Payment Summary */}
              <div className="mb-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                      <FiCreditCard className="text-white" size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">
                        {offerData?.type === 'direct_purchase' ? 'Purchase Amount' : 'Offer Amount'}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {marketplaceApi.utils.formatCurrency(offerData?.amount)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {offerData?.listing && (
                  <div className="mt-3 pt-3 border-t border-yellow-300">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0 bg-gray-100">
                        {getThumbnailUrl(offerData.listing) ? (
                          <img
                            src={getThumbnailUrl(offerData.listing)}
                            alt={offerData.listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <FiImage className="text-gray-400" size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {offerData.listing.title}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {offerData.listing.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Form */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <Elements stripe={stripePromise} options={{ 
                  clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#ca8a04',
                      borderRadius: '0.5rem',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }
                  }
                }}>
                  <PaymentForm 
                    offerData={offerData}
                    onSuccess={onSuccess}
                    onClose={onClose}
                    paymentStatus={paymentStatus}
                    setPaymentStatus={setPaymentStatus}
                    billingDetails={billingDetails}
                    onBillingDetailsChange={onBillingDetailsChange}
                    currentUser={currentUser}
                  />
                </Elements>
              </div>

              {/* Security Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <FiCheck className="text-blue-600" size={14} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Secure Payment</h4>
                    <p className="text-xs text-blue-700">
                      Your payment is processed securely via Stripe. Your funds are held in escrow until the order is completed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Payment Form Component
const PaymentForm = ({ 
  offerData, 
  onSuccess, 
  onClose, 
  paymentStatus, 
  setPaymentStatus,
  billingDetails,
  onBillingDetailsChange,
  currentUser
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBillingForm, setShowBillingForm] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Payment system not ready. Please refresh the page and try again.');
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus('processing');
    setError('');

    try {
      console.log('🔄 Confirming payment...');

      // Get user info
      const userInfo = {
        name: currentUser?.username || billingDetails.name || 'Customer',
        email: currentUser?.email || billingDetails.email || '',
        phone: billingDetails.phone || ''
      };

      // Prepare billing details for confirmPayment
      const billingDetailsForStripe = {
        name: userInfo.name,
        email: userInfo.email || undefined,
        phone: userInfo.phone || undefined,
        address: {
          line1: billingDetails.address.line1 || 'N/A',
          line2: billingDetails.address.line2 || undefined,
          city: billingDetails.address.city || 'N/A',
          state: billingDetails.address.state || 'N/A',
          postal_code: billingDetails.address.postal_code || '00000',
          country: billingDetails.address.country || 'US'
        }
      };

      console.log('📋 Billing details for Stripe:', billingDetailsForStripe);

      // Direct confirmation without submit()
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/payment/success`,
          payment_method_data: {
            billing_details: billingDetailsForStripe
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        console.error('❌ Stripe payment error:', stripeError);
        setError(stripeError.message || 'Payment failed. Please try again.');
        setPaymentStatus('failed');
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Stripe payment successful:', {
        paymentIntentId: paymentIntent?.id,
        status: paymentIntent?.status
      });

      // Prepare confirmation data
      let confirmationPayload;
      let confirmationEndpoint;

      if (offerData?.type === 'direct_purchase') {
        // For direct purchase, use the orders API
        confirmationEndpoint = '/marketplace/orders/confirm-payment';
        confirmationPayload = {
          orderId: offerData.order?._id,
          paymentIntentId: paymentIntent?.id,
          billingDetails: billingDetailsForStripe
        };
      } else {
        // For offers, use the offers API
        confirmationEndpoint = '/marketplace/offers/confirm-offer-payment';
        confirmationPayload = {
          offerId: offerData?.offer?._id || offerData?.offerId,
          paymentIntentId: paymentIntent?.id,
          billingDetails: billingDetailsForStripe
        };
      }

      console.log('📤 Sending confirmation to server:', {
        endpoint: confirmationEndpoint,
        payload: confirmationPayload
      });

      // Use marketplaceApi for the confirmation
      let response;
      if (offerData?.type === 'direct_purchase') {
        // Note: You'll need to add a confirmDirectPayment method to your orders API
        // For now, we'll use the offers API confirmOfferPayment as a fallback
        response = await marketplaceApi.offers.confirmOfferPayment({
          offerId: offerData.offer?._id,
          paymentIntentId: paymentIntent?.id
        });
      } else {
        response = await marketplaceApi.offers.confirmOfferPayment({
          offerId: offerData?.offer?._id || offerData?.offerId,
          paymentIntentId: paymentIntent?.id
        });
      }

      if (!response.success) {
        throw new Error(response.error || 'Payment confirmation failed');
      }

      console.log('✅ Server confirmation successful:', response.data);
      setPaymentStatus('success');
      
      // Wait a moment before redirecting to show success state
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('❌ Payment processing error:', err);
      
      let errorMessage = 'Payment failed. Please try again.';
      
      if (err.error) {
        errorMessage = err.error;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setPaymentStatus('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressChange = (event: any) => {
    if (event.complete) {
      const address = event.value.address;
      onBillingDetailsChange({
        address: {
          line1: address.line1 || '',
          line2: address.line2 || '',
          city: address.city || '',
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country || 'US'
        }
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <FiUser size={14} />
            Billing Information
          </h4>
          <button
            type="button"
            onClick={() => setShowBillingForm(!showBillingForm)}
            className="text-xs text-yellow-600 hover:text-yellow-500"
          >
            {showBillingForm ? 'Hide' : 'Edit'}
          </button>
        </div>
        
        {showBillingForm ? (
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={billingDetails.name || currentUser?.username || ''}
                onChange={(e) => onBillingDetailsChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={billingDetails.email || currentUser?.email || ''}
                onChange={(e) => onBillingDetailsChange({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your email"
                required
              />
            </div>

            {/* Phone Input (Optional) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={billingDetails.phone || ''}
                onChange={(e) => onBillingDetailsChange({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Enter your phone number"
              />
            </div>

            {/* Address Element */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Billing Address
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <AddressElement 
                  options={{
                    mode: 'billing',
                    allowedCountries: ['US', 'CA', 'GB', 'AU', 'IN'],
                    fields: {
                      phone: 'always'
                    },
                    validation: {
                      phone: {
                        required: 'never'
                      }
                    },
                    defaultValues: {
                      name: billingDetails.name || currentUser?.username || '',
                      phone: billingDetails.phone || '',
                      address: {
                        line1: billingDetails.address.line1 || '',
                        line2: billingDetails.address.line2 || '',
                        city: billingDetails.address.city || '',
                        state: billingDetails.address.state || '',
                        postal_code: billingDetails.address.postal_code || '',
                        country: billingDetails.address.country || 'US'
                      }
                    }
                  }}
                  onChange={handleAddressChange}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <FiUser size={14} />
              <span>{billingDetails.name || currentUser?.username || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-2">
              <FiMail size={14} />
              <span>{billingDetails.email || currentUser?.email || 'Not provided'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Element */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-gray-800 flex items-center gap-2">
              <FiCreditCard size={14} />
              Payment Details
            </label>
            <div className="flex items-center gap-1">
              <div className="w-6 h-4 bg-blue-500 rounded-sm"></div>
              <div className="w-6 h-4 bg-red-500 rounded-sm"></div>
              <div className="w-6 h-4 bg-yellow-500 rounded-sm"></div>
            </div>
          </div>
          <div className="min-h-[200px]">
            <PaymentElement 
              options={{
                layout: 'tabs',
                wallets: {
                  applePay: 'auto',
                  googlePay: 'auto'
                },
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: {
                      country: 'auto',
                      postalCode: 'auto'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Payment Error</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <FiCheck className="text-green-600" size={16} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-green-800">Payment Successful!</h4>
              <p className="text-sm text-green-700">Redirecting to your orders...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          <FiX size={16} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow disabled:shadow-none"
        >
          {paymentStatus === 'processing' || isSubmitting ? (
            <>
              <FiLoader className="animate-spin" size={16} />
              Processing...
            </>
          ) : paymentStatus === 'success' ? (
            <>
              <FiCheck size={16} />
              Success!
            </>
          ) : (
            `Pay ${marketplaceApi.utils.formatCurrency(offerData?.amount)}`
          )}
        </button>
      </div>
    </form>
  );
};

export default PaymentModal;