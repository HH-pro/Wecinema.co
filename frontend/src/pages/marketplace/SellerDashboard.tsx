import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getSellerOrders, getReceivedOffers, createOrder, checkStripeStatus, createStripeAccount } from '../../api';
import axios from 'axios';
import { decodeToken } from '../../utilities/helperfFunction';

// Constants
const API_BASE_URL = 'http://localhost:3000';

// Utility Functions
const getCurrentUserIdFromToken = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return null;

    let tokenData;
    try {
      tokenData = decodeToken(token);
    } catch (decodeError) {
      try {
        const payload = token.split('.')[1];
        if (payload) {
          const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
          tokenData = JSON.parse(atob(paddedPayload));
        }
      } catch (manualError) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          return userData.id || userData._id || userData.userId;
        }
        return null;
      }
    }

    return tokenData?.userId || tokenData?.id || tokenData?.user?.id || 
           tokenData?.user?._id || tokenData?.user_id || tokenData?.sub ||
           tokenData?.user?.userId || tokenData?.user?._id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
    case 'completed':
    case 'accepted':
    case 'active':
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'pending':
    case 'pending_payment':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'shipped':
    case 'sold':
    case 'in_progress':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled':
    case 'rejected':
    case 'inactive':
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'draft':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Stripe Setup Modal Component
const StripeSetupModal = ({ show, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStripeConnect = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await createStripeAccount();
      
      if (response.url) {
        // Redirect to Stripe onboarding
        window.location.href = response.url;
      } else {
        setError('Failed to start Stripe setup');
      }
    } catch (err) {
      console.error('Stripe connect error:', err);
      setError(err.response?.data?.error || 'Failed to connect Stripe account');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Connect Stripe Account</h2>
          <p className="text-gray-600 mt-1">Required to accept payments</p>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3 mt-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Why Stripe?</h4>
                <p className="text-blue-700 text-sm mt-1">
                  Stripe is required to securely process payments and transfer funds to your bank account.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Secure payment processing
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Direct bank transfers
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Industry-leading security
            </div>
            <div className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Takes only 2 minutes to set up
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
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
            onClick={handleStripeConnect}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </>
            ) : (
              'Connect Stripe Account'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Order Creation Component with Stripe Validation
const OrderCreation = ({ offer, onOrderCreated, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stripeCheckLoading, setStripeCheckLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [orderDetails, setOrderDetails] = useState({
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

    // Check Stripe status before creating order
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
        sellerId: getCurrentUserIdFromToken(),
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
    } catch (err) {
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
          {/* Stripe Status Indicator */}
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

// Payment Status Component
const PaymentStatusBadge = ({ order }) => {
  if (!order.stripePaymentIntentId) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
        Payment Pending
      </span>
    );
  }

  switch (order.paymentStatus) {
    case 'succeeded':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          Paid
        </span>
      );
    case 'processing':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          Processing
        </span>
      );
    case 'requires_payment_method':
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          Payment Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          Payment Pending
        </span>
      );
  }
};

// Stripe Account Status Component
const StripeAccountStatus = ({ stripeStatus, onSetupClick }) => {
  if (!stripeStatus) return null;

  return (
    <div className="mb-6">
      <div className={`rounded-xl p-4 border ${
        stripeStatus.connected && stripeStatus.status === 'active'
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-3 ${
              stripeStatus.connected && stripeStatus.status === 'active'
                ? 'bg-green-500'
                : 'bg-yellow-500'
            }`}></div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Payment Account: {stripeStatus.connected && stripeStatus.status === 'active' ? 'Active' : 'Setup Required'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {stripeStatus.connected && stripeStatus.status === 'active'
                  ? 'Your Stripe account is connected and ready to accept payments'
                  : 'Connect your Stripe account to start accepting payments from buyers'
                }
              </p>
            </div>
          </div>
          {!(stripeStatus.connected && stripeStatus.status === 'active') && (
            <button
              onClick={onSetupClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition duration-200"
            >
              Setup Payments
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Listing Card Component (unchanged, included for completeness)
const ListingCard = ({ listing, isCurrentUser, onEdit, onDelete }) => {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isVideo = (url) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.m3u8'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  const firstMediaUrl = listing.mediaUrls && listing.mediaUrls.length > 0 ? listing.mediaUrls[0] : null;

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200 relative group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {isCurrentUser && (
        <div className={`absolute top-3 left-3 flex gap-2 z-10 transition-all duration-300 ${
          showActions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(listing._id);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2.5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            title="Edit Listing"
          >
            <span className="text-sm">✏️</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(listing._id);
            }}
            className="bg-red-500 hover:bg-red-600 text-white p-2.5 rounded-full shadow-lg transition-all duration-200 transform hover:scale-110"
            title="Delete Listing"
          >
            <span className="text-sm">🗑️</span>
          </button>
        </div>
      )}

      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {firstMediaUrl ? (
          isVideo(firstMediaUrl) ? (
            <div className="w-full h-full bg-black flex items-center justify-center relative">
              <video 
                className="w-full h-full object-cover"
                controls
                muted
                preload="metadata"
                poster={listing.thumbnailUrl}
              >
                <source src={firstMediaUrl} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute bottom-3 right-3 bg-black bg-opacity-70 rounded-full p-2 backdrop-blur-sm">
                <span className="text-white text-xs">🎥</span>
              </div>
            </div>
          ) : (
            <>
              {imageLoading && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              )}
              <img
                src={firstMediaUrl}
                alt={listing.title}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
              {imageError && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-gray-400 text-4xl mb-2 block">📷</span>
                    <span className="text-gray-500 text-sm">Image not available</span>
                  </div>
                </div>
              )}
            </>
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <span className="text-gray-400 text-4xl mb-2 block">🏠</span>
              <span className="text-gray-500 text-sm">No media</span>
            </div>
          </div>
        )}
        
        <div className="absolute top-3 right-3">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-sm ${
              listing.status === 'active'
                ? 'bg-green-500 text-white border-green-600'
                : listing.status === 'sold'
                ? 'bg-orange-500 text-white border-orange-600'
                : listing.status === 'draft'
                ? 'bg-gray-500 text-white border-gray-600'
                : listing.status === 'inactive'
                ? 'bg-red-500 text-white border-red-600'
                : 'bg-purple-500 text-white border-purple-600'
            }`}
          >
            {listing.status?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>

        {listing.mediaUrls && listing.mediaUrls.length > 1 && (
          <div className="absolute top-3 left-3">
            <span className="bg-black bg-opacity-70 text-white px-2.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm border border-white border-opacity-20">
              📸 {listing.mediaUrls.length}
            </span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg backdrop-blur-sm border border-white border-opacity-20">
            <span className="text-lg font-bold">₹{listing.price?.toLocaleString() || '0'}</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-2 h-14 overflow-hidden text-gray-800 group-hover:text-blue-600 transition-colors">
          {listing.title || 'Untitled Listing'}
        </h3>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2 h-10 overflow-hidden leading-relaxed">
          {listing.description || 'No description available'}
        </p>

        <div className="flex justify-between items-center mb-3">
          {listing.category && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1.5 rounded-full font-medium border border-blue-200">
              {listing.category}
            </span>
          )}
          
          {listing.condition && (
            <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-1.5 rounded-full font-medium border border-gray-300">
              {listing.condition}
            </span>
          )}
        </div>

        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {listing.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded border border-gray-300"
              >
                #{tag}
              </span>
            ))}
            {listing.tags.length > 3 && (
              <span className="text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">
                +{listing.tags.length - 3} more
              </span>
            )}
          </div>
        )}

        {listing.sellerId && (
          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 flex-1">
              {listing.sellerId.avatar ? (
                <img
                  src={listing.sellerId.avatar}
                  alt={listing.sellerId.username}
                  className="w-6 h-6 rounded-full object-cover border border-gray-300"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs border border-gray-400 ${
                listing.sellerId.avatar ? 'hidden' : 'flex'
              }`}>
                👤
              </div>
              <span className="text-sm text-gray-700 font-medium truncate">
                {listing.sellerId.username || 'Unknown Seller'}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="text-center flex-1">
            <div className="font-medium">Created</div>
            <div>{new Date(listing.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="w-px h-6 bg-gray-200"></div>
          <div className="text-center flex-1">
            <div className="font-medium">Updated</div>
            <div>{new Date(listing.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// UserListings Component (unchanged, included for completeness)
const UserListings = ({ userId: propUserId }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [userInfo, setUserInfo] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const getTargetUserId = () => {
    return propUserId || currentUserId;
  };

  const checkIfCurrentUser = (targetUserId) => {
    return currentUserId === targetUserId;
  };

  const fetchListings = async (page = 1, status = '') => {
    const targetUserId = getTargetUserId();
    
    if (!targetUserId) {
      setError('Please login to view listings');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};

      const response = await axios.get(
        `${API_BASE_URL}/marketplace/listings/user/${targetUserId}/listings`,
        {
          params: { 
            page, 
            limit: pagination.limit, 
            status: status || undefined 
          },
          headers,
          timeout: 15000,
          withCredentials: true
        }
      );
      
      if (response.data.success) {
        setListings(response.data.listings || []);
        setUserInfo(response.data.user);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        });
        setSelectedStatus(status);
        setIsCurrentUser(checkIfCurrentUser(targetUserId));
      } else {
        setError(response.data.error || 'Failed to load listings');
      }
    } catch (err) {
      let errorMessage = 'Failed to load listings';
      
      if (err.response) {
        if (err.response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to view these listings.';
        } else if (err.response.status === 404) {
          errorMessage = 'User listings not found.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.response.data?.error || `Server error: ${err.response.status}`;
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const headers = token ? { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      } : {};

      await axios.delete(
        `${API_BASE_URL}/marketplace/listings/${listingId}`,
        { headers }
      );

      fetchListings(pagination.page, selectedStatus);
      alert('Listing deleted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete listing');
    }
  };

  const handleEditListing = (listingId) => {
    window.location.href = `/edit-listing/${listingId}`;
  };

  useEffect(() => {
    const initializeUser = async () => {
      const userIdFromToken = getCurrentUserIdFromToken();
      setCurrentUserId(userIdFromToken);

      if (userIdFromToken || propUserId) {
        await fetchListings();
      } else {
        setLoading(false);
        setError('Please login to view listings');
      }
    };

    initializeUser();
  }, [propUserId]);

  const handlePageChange = (newPage) => {
    fetchListings(newPage, selectedStatus);
  };

  const handleStatusFilter = (status) => {
    fetchListings(1, status);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 flex-col">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
        <span className="text-lg text-gray-600">Loading listings...</span>
      </div>
    );
  }

  if (error && listings.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-lg shadow border border-gray-200 px-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h3 className="text-2xl font-semibold text-gray-700 mb-3">
          Unable to Load Listings
        </h3>
        <p className="text-gray-500 text-lg mb-6 leading-relaxed">
          {error}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          {!currentUserId ? (
            <button 
              onClick={() => window.location.href = '/login'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
            >
              Login to Continue
            </button>
          ) : (
            <button 
              onClick={() => fetchListings()}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {userInfo && (
        <div className="mb-8 p-6 bg-white rounded-xl shadow-md border border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl font-bold text-gray-800">
                  {userInfo.username}'s Listings
                </h1>
                {isCurrentUser && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
                    Your Profile
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-lg">
                Total {pagination.total} listings found • {pagination.pages} pages
              </p>
            </div>
            
            {isCurrentUser && (
              <button
                onClick={() => window.location.href = '/create-listing'}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center shadow-md hover:shadow-lg"
              >
                <span className="mr-2 text-lg">+</span> Add New Listing
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="font-semibold mb-4 text-gray-700 text-lg">Filter by Status:</h3>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '', label: 'All Listings', color: 'blue' },
            { key: 'active', label: 'Active', color: 'green' },
            { key: 'sold', label: 'Sold', color: 'orange' },
            { key: 'draft', label: 'Draft', color: 'gray' },
            { key: 'inactive', label: 'Inactive', color: 'red' }
          ].map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => handleStatusFilter(key)}
              className={`px-5 py-2.5 rounded-lg transition-all duration-200 font-medium border ${
                selectedStatus === key 
                  ? `bg-${color}-500 text-white border-${color}-500 shadow-md` 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && listings.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-yellow-600 mr-3 text-xl">⚠️</span>
            <div>
              <p className="text-yellow-800 font-medium">Notice</p>
              <p className="text-yellow-700 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {listings.map((listing) => (
          <ListingCard 
            key={listing._id} 
            listing={listing} 
            isCurrentUser={isCurrentUser}
            onEdit={handleEditListing}
            onDelete={handleDeleteListing}
          />
        ))}
      </div>

      {listings.length === 0 && !error && (
        <div className="text-center py-20 bg-white rounded-xl shadow border border-gray-200 max-w-2xl mx-auto">
          <div className="text-7xl mb-6">🏠</div>
          <h3 className="text-2xl font-semibold text-gray-700 mb-4">
            No listings found
          </h3>
          <p className="text-gray-500 text-lg mb-8 max-w-md mx-auto leading-relaxed">
            {selectedStatus 
              ? `No ${selectedStatus} listings available at the moment.` 
              : 'No listings available yet. Start by creating your first listing!'
            }
          </p>
          {isCurrentUser && (
            <button
              onClick={() => window.location.href = '/create-listing'}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg text-lg"
            >
              Create Your First Listing
            </button>
          )}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex flex-col items-center gap-6 mt-12">
          <div className="flex justify-center items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium border border-gray-300"
            >
              ← Previous
            </button>
            
            <div className="flex gap-1 mx-4">
              {[...Array(Math.min(5, pagination.pages))].map((_, index) => {
                const pageNum = pagination.page <= 3 
                  ? index + 1 
                  : pagination.page >= pagination.pages - 2 
                    ? pagination.pages - 4 + index 
                    : pagination.page - 2 + index;
                
                if (pageNum < 1 || pageNum > pagination.pages) return null;
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium border ${
                      pagination.page === pageNum
                        ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-5 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center font-medium border border-gray-300"
            >
              Next →
            </button>
          </div>
          
          <div className="text-center text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            Page {pagination.page} of {pagination.pages} • 
            Showing {listings.length} of {pagination.total} items
          </div>
        </div>
      )}
    </div>
  );
};

// Order Received Page Component
const OrderReceivedPage = ({ orders, onOrderUpdate }) => {
  const [loading, setLoading] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Orders Received</h1>
          <p className="mt-2 text-gray-600">Manage and track all orders received from buyers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Orders ({orders.length})</h2>
          </div>
          
          <div className="p-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-lg font-medium text-gray-900">No orders received yet</h3>
                <p className="mt-2 text-gray-500">When buyers purchase your items, orders will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map(order => (
                  <div key={order._id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900">
                              Order #{order._id.slice(-8).toUpperCase()}
                            </h3>
                            <p className="text-gray-600 mt-1">
                              From: {order.buyerId?.username || 'Unknown Buyer'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                              {order.status ? order.status.charAt(0).toUpperCase() + order.status.slice(1) : 'Unknown'}
                            </span>
                            <PaymentStatusBadge order={order} />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Amount</p>
                            <p className="font-semibold text-green-600">{formatCurrency(order.amount)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Order Date</p>
                            <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Payment Method</p>
                            <p className="font-medium text-gray-900 capitalize">{order.paymentMethod || 'Not specified'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Shipping Address</p>
                            <p className="font-medium text-gray-900 line-clamp-1">{order.shippingAddress || 'Not provided'}</p>
                          </div>
                        </div>

                        {order.listingId && (
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-sm text-gray-600 mb-1">Listing</p>
                            <p className="font-medium text-gray-900">{order.listingId.title}</p>
                            {order.listingId.price && (
                              <p className="text-sm text-gray-600">
                                Original Price: {formatCurrency(order.listingId.price)}
                              </p>
                            )}
                          </div>
                        )}

                        {order.notes && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-600 mb-1">Seller Notes</p>
                            <p className="text-gray-900 bg-blue-50 rounded-lg p-3 text-sm border border-blue-200">
                              {order.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 lg:w-48">
                        <button
                          onClick={() => window.location.href = `/orders/${order._id}`}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                        >
                          View Details
                        </button>
                        {order.status === 'pending_payment' && (
                          <div className="text-xs text-gray-500 text-center">
                            Waiting for buyer payment
                          </div>
                        )}
                        {order.status === 'paid' && (
                          <button
                            onClick={() => onOrderUpdate(order._id, 'in_progress')}
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                          >
                            Start Work
                          </button>
                        )}
                        {order.status === 'in_progress' && (
                          <button
                            onClick={() => onOrderUpdate(order._id, 'completed')}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                          >
                            Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ 
  title, 
  value, 
  icon, 
  color = 'blue',
  trend,
  onClick 
}) => (
  <div 
    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 ${
      onClick ? 'cursor-pointer hover:border-blue-300 transform hover:-translate-y-1' : ''
    }`}
    onClick={onClick}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className={`text-xs font-medium mt-1 ${
            trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
        color === 'green' ? 'bg-green-50 border-green-200' :
        color === 'blue' ? 'bg-blue-50 border-blue-200' :
        color === 'purple' ? 'bg-purple-50 border-purple-200' :
        color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
        color === 'orange' ? 'bg-orange-50 border-orange-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        {icon}
      </div>
    </div>
  </div>
);

// Main SellerDashboard Component
const SellerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [offers, setOffers] = useState([]);
  const [listingsData, setListingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [showOrderCreation, setShowOrderCreation] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);

  // Stats calculation
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => order.status === 'pending_payment').length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;
  
  // Listings stats
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing) => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter((listing) => listing.status === 'sold').length || 0;

  useEffect(() => {
    fetchDashboardData();
    checkStripeAccountStatus();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserIdFromToken();

      const [ordersResponse, offersResponse] = await Promise.all([
        getSellerOrders(setLoading).catch(err => {
          console.error('Error fetching orders:', err);
          return [];
        }),
        getReceivedOffers(setLoading).catch(err => {
          console.error('Error fetching offers:', err);
          return [];
        })
      ]);

      let listingsResponse = null;
      if (currentUserId) {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
          const headers = token ? { Authorization: `Bearer ${token}` } : {};
          
          listingsResponse = await axios.get(
            `${API_BASE_URL}/marketplace/listings/user/${currentUserId}/listings`,
            {
              params: { page: 1, limit: 1000 },
              headers,
              timeout: 10000
            }
          );
        } catch (err) {
          console.log('Listings fetch failed, continuing without listings data');
        }
      }

      const ordersData = Array.isArray(ordersResponse) 
        ? ordersResponse 
        : (ordersResponse?.data || []);
      
      const offersData = Array.isArray(offersResponse) 
        ? offersResponse 
        : (offersResponse?.data || []);

      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setOffers(Array.isArray(offersData) ? offersData : []);
      
      if (listingsResponse?.data?.success) {
        setListingsData(listingsResponse.data);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      const response = await checkStripeStatus();
      setStripeStatus(response);
    } catch (err) {
      console.error('Error checking Stripe status:', err);
      setStripeStatus({ connected: false, status: 'unknown' });
    }
  };

  const handleViewListingDetails = (listingId) => {
    window.location.href = `/listings/${listingId}`;
  };

  const handleOfferAction = async (offerId, action) => {
    try {
      setError('');
      
      if (action === 'accept') {
        // Check Stripe status before showing order creation
        await checkStripeAccountStatus();
        
        if (!stripeStatus?.connected || stripeStatus?.status !== 'active') {
          setShowStripeSetup(true);
          return;
        }

        const offer = offers.find(o => o._id === offerId);
        if (offer) {
          setSelectedOffer(offer);
          setShowOrderCreation(true);
        }
      } else {
        console.log(`Rejecting offer:`, offerId);
        await fetchDashboardData();
      }
    } catch (error) {
      console.error('Error updating offer:', error);
      setError('Failed to update offer');
    }
  };

  const handleOrderCreated = (newOrder) => {
    setOrders(prev => [newOrder, ...prev]);
    fetchDashboardData();
  };

  const handleOrderUpdate = async (orderId, newStatus) => {
    try {
      console.log(`Updating order ${orderId} to ${newStatus}`);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating order:', error);
      setError('Failed to update order');
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Stripe Account Status */}
          <StripeAccountStatus 
            stripeStatus={stripeStatus}
            onSetupClick={() => setShowStripeSetup(true)}
          />

          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
                { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
                { id: 'orders', label: 'Orders Received', icon: '📦', badge: totalOrders }
              ].map(({ id, label, icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center transition-all duration-200 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                  {badge > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Modals */}
          {showStripeSetup && (
            <StripeSetupModal
              show={showStripeSetup}
              onClose={() => setShowStripeSetup(false)}
              onSuccess={() => {
                setShowStripeSetup(false);
                checkStripeAccountStatus();
              }}
            />
          )}

          {showOrderCreation && selectedOffer && (
            <OrderCreation
              offer={selectedOffer}
              onOrderCreated={handleOrderCreated}
              onClose={() => {
                setShowOrderCreation(false);
                setSelectedOffer(null);
              }}
            />
          )}

          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  icon="💰"
                  color="green"
                />
                <StatCard
                  title="Total Listings"
                  value={totalListings}
                  icon="🏠"
                  color="blue"
                  onClick={() => setActiveTab('listings')}
                />
                <StatCard
                  title="Active Listings"
                  value={activeListings}
                  icon="✅"
                  color="green"
                />
                <StatCard
                  title="Sold Listings"
                  value={soldListings}
                  icon="🛒"
                  color="orange"
                />
                <StatCard
                  title="Total Orders"
                  value={totalOrders}
                  icon="📦"
                  color="purple"
                  onClick={() => setActiveTab('orders')}
                />
                <StatCard
                  title="Pending Offers"
                  value={pendingOffers}
                  icon="💼"
                  color="yellow"
                  onClick={() => setActiveTab('offers')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                      <button 
                        onClick={() => setActiveTab('orders')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
                      >
                        View All
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6">
                      {orders.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-4">📦</div>
                          <p className="text-gray-500 font-medium">No orders yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div key={order._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border border-blue-200">
                                  <span className="text-sm font-medium text-blue-600">
                                    {order.buyerId?.username?.charAt(0).toUpperCase() || 'U'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {order.listingId?.title || 'Unknown Listing'}
                                  </p>
                                  <p className="text-sm text-gray-500">{order.buyerId?.username || 'Unknown Buyer'}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-green-600">{formatCurrency(order.amount || 0)}</p>
                                <div className="flex flex-col items-end gap-1 mt-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                    {order.status || 'unknown'}
                                  </span>
                                  <PaymentStatusBadge order={order} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <button
                        onClick={() => window.location.href = '/create-listing'}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create New Listing
                      </button>
                      {!(stripeStatus?.connected && stripeStatus?.status === 'active') && (
                        <button
                          onClick={() => setShowStripeSetup(true)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center shadow-md hover:shadow-lg"
                        >
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          Setup Payments
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        View All Orders
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tips for Success
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Upload high-quality photos of your items</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Write clear and detailed descriptions</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Respond quickly to buyer inquiries</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Setup Stripe payments to accept orders</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'offers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Received Offers</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and respond to offers from buyers</p>
                </div>
                <button
                  onClick={fetchDashboardData}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              <div className="p-6">
                {offers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">💼</div>
                    <h3 className="text-lg font-medium text-gray-900">No offers yet</h3>
                    <p className="mt-2 text-gray-500">When buyers make offers on your listings, they'll appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {offers.map(offer => (
                      <div key={offer._id} className="border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <h3 
                                className="text-lg font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors"
                                onClick={() => handleViewListingDetails(offer.listingId._id)}
                              >
                                {offer.listingId?.title || 'Unknown Listing'}
                              </h3>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(offer.status)}`}>
                                {offer.status ? offer.status.charAt(0).toUpperCase() + offer.status.slice(1) : 'Unknown'}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div>
                                <p className="text-sm text-gray-600">Buyer</p>
                                <p className="font-medium text-gray-900">{offer.buyerId?.username || 'Unknown Buyer'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Original Price</p>
                                <p className="font-medium text-gray-900">{formatCurrency(offer.listingId?.price || 0)}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-600">Offer Amount</p>
                                <p className="font-medium text-green-600">{formatCurrency(offer.amount || 0)}</p>
                              </div>
                            </div>

                            {offer.message && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-600 mb-1">Buyer's Message</p>
                                <p className="text-gray-900 bg-gray-50 rounded-lg p-3 text-sm border border-gray-200">
                                  {offer.message}
                                </p>
                              </div>
                            )}

                            <div className="text-sm text-gray-500">
                              Received {formatDate(offer.createdAt)}
                            </div>
                          </div>
                        </div>

                        {offer.status === 'pending' && (
                          <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleOfferAction(offer._id, 'accept')}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                            >
                              Accept Offer
                            </button>
                            <button
                              onClick={() => handleOfferAction(offer._id, 'reject')}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md hover:shadow-lg"
                            >
                              Decline Offer
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'listings' && (
            <UserListings />
          )}

          {activeTab === 'orders' && (
            <OrderReceivedPage 
              orders={orders}
              onOrderUpdate={handleOrderUpdate}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;