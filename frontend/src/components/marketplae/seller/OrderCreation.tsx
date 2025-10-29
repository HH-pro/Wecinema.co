import React, { useState, useEffect } from 'react';
import { createOrder, checkStripeStatus } from '../../../api';
import { getCurrentUserId } from '../../../utilities/helperfFunction';

interface OrderDetails {
  shippingAddress: string;
  paymentMethod: string;
  notes: string;
  expectedDeliveryDays: number;
}

interface Offer {
  _id: string;
  listingId: {
    _id: string;
    title: string;
    price?: number;
  };
  buyerId: {
    _id: string;
    username: string;
  };
  amount: number;
}

interface StripeStatus {
  connected: boolean;
  status: string;
}

interface OrderCreationProps {
  offer: Offer;
  onOrderCreated: (order: any) => void;
  onClose: () => void;
}

const OrderCreation: React.FC<OrderCreationProps> = ({ offer, onOrderCreated, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripeCheckLoading, setStripeCheckLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails>({
    shippingAddress: '',
    paymentMethod: 'card',
    notes: '',
    expectedDeliveryDays: 7
  });

  useEffect(() => {
    checkStripeAccount();
  }, []);

  const checkStripeAccount = async () => {
    try {
      setStripeCheckLoading(true);
      const response = await checkStripeStatus();
      setStripeStatus(response);
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      setStripeStatus({ connected: false, status: 'unknown' });
    } finally {
      setStripeCheckLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!orderDetails.shippingAddress.trim()) {
      setError('Please enter shipping address');
      return;
    }

    if (!stripeStatus?.connected || stripeStatus?.status !== 'active') {
      setError('Please connect and activate your Stripe account before creating orders');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const orderData = {
        offerId: offer._id,
        listingId: offer.listingId._id,
        buyerId: offer.buyerId._id,
        sellerId: getCurrentUserId(),
        amount: offer.amount,
        shippingAddress: orderDetails.shippingAddress,
        paymentMethod: orderDetails.paymentMethod,
        notes: orderDetails.notes,
        expectedDeliveryDays: orderDetails.expectedDeliveryDays
      };

      const result = await createOrder(orderData);
      
      if (result.success) {
        alert('Order created successfully! The buyer will now complete the payment.');
        onOrderCreated(result.order);
        onClose();
      } else {
        if (result.stripeSetupRequired) {
          setError('Stripe account setup required. Please connect your Stripe account.');
        } else {
          setError(result.error || 'Failed to create order');
        }
      }
    } catch (err: any) {
      console.error('Error creating order:', err);
      if (err.response?.data?.stripeSetupRequired) {
        setError('Stripe account setup required. Please connect your Stripe account.');
      } else {
        setError(err.response?.data?.error || 'Failed to create order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (stripeCheckLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-700">Checking payment setup...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Order</h2>
          <p className="text-gray-600 mt-1">Confirm order details and create order</p>
        </div>

        <div className="p-6 space-y-4">
          <div className={`rounded-lg p-4 border ${
            stripeStatus?.connected && stripeStatus?.status === 'active'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  stripeStatus?.connected && stripeStatus?.status === 'active'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                }`}></div>
                <span className="font-medium text-sm">
                  Stripe Account: {stripeStatus?.connected && stripeStatus?.status === 'active' ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              {!(stripeStatus?.connected && stripeStatus?.status === 'active') && (
                <button
                  onClick={() => window.location.href = '/seller/settings?tab=payments'}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Setup
                </button>
              )}
            </div>
            {stripeStatus?.connected && stripeStatus?.status !== 'active' && (
              <p className="text-red-600 text-xs mt-1">
                Complete your Stripe onboarding to receive payments
              </p>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-2">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Listing:</span>
                <span className="font-medium">{offer.listingId?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Buyer:</span>
                <span className="font-medium">{offer.buyerId?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Offer Amount:</span>
                <span className="font-medium text-green-600">₹{offer.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your Payout:</span>
                <span className="font-medium text-blue-600">
                  ₹{Math.round(offer.amount * 0.85)?.toLocaleString()}
                  <span className="text-gray-500 text-xs ml-1">(after 15% fee)</span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shipping Address *
            </label>
            <textarea
              value={orderDetails.shippingAddress}
              onChange={(e) => setOrderDetails(prev => ({
                ...prev,
                shippingAddress: e.target.value
              }))}
              placeholder="Enter complete shipping address including city, state, and PIN code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Delivery (Days)
            </label>
            <select
              value={orderDetails.expectedDeliveryDays}
              onChange={(e) => setOrderDetails(prev => ({
                ...prev,
                expectedDeliveryDays: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={3}>3 days (Express)</option>
              <option value={7}>7 days (Standard)</option>
              <option value={14}>14 days (Economy)</option>
              <option value={30}>30 days (Custom)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              value={orderDetails.paymentMethod}
              onChange={(e) => setOrderDetails(prev => ({
                ...prev,
                paymentMethod: e.target.value
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="card">Credit/Debit Card</option>
              <option value="upi">UPI</option>
              <option value="netbanking">Net Banking</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={orderDetails.notes}
              onChange={(e) => setOrderDetails(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              placeholder="Any additional instructions or notes for the buyer..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={2}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
              {error.includes('Stripe') && (
                <button
                  onClick={() => window.location.href = '/seller/settings?tab=payments'}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
                >
                  Go to Payment Settings
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateOrder}
            disabled={loading || !(stripeStatus?.connected && stripeStatus?.status === 'active')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Order...
              </>
            ) : (
              'Create Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCreation;