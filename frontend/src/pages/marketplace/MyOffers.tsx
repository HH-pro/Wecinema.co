// src/pages/marketplace/MyOffers.tsx
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { 
  FiCreditCard, FiCheck, FiX, FiAlertCircle, FiLoader, 
  FiClock, FiCheckCircle, FiXCircle, FiEye, FiDollarSign,
  FiCalendar, FiMessageSquare, FiPackage, FiUser, FiTag,
  FiShoppingBag
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import marketplaceApi from '../../api/marketplaceApi';

// Get Stripe key from environment variable
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ";

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface Offer {
  _id: string;
  listingId: {
    _id: string;
    title: string;
    price: number;
    mediaUrls: string[];
    category: string;
    description: string;
    sellerId?: {
      _id: string;
      username: string;
      avatar?: string;
    };
  };
  buyerId: {
    _id: string;
    username: string;
    email: string;
  };
  amount: number;
  status: 'pending' | 'pending_payment' | 'paid' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  message?: string;
  requirements?: string;
  expectedDelivery?: string;
  paymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
}

const MyOffers: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'pending' | 'paid' | 'accepted' | 'rejected' | 'all'>('pending');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from location state
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  }, [location]);

  // Fetch offers on component mount
  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Fetching offers...');
      
      const response = await marketplaceApi.offers.getMyOffers();
      
      console.log('📦 Offers API Response:', response);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch offers');
      }

      console.log('✅ Offers data:', response.data);
      console.log('📊 Offers count:', response.data?.offers?.length);
      
      setOffers(response.data?.offers || []);
    } catch (error: any) {
      console.error('❌ Error fetching offers:', error);
      setError(error.message || 'Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh offers
  const handleRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  // Handle view listing
  const handleViewListing = (listingId: string) => {
    navigate(`/marketplace/listings/${listingId}`);
  };

  // Handle payment for pending payment offer
  const handlePayOffer = async (offer: Offer) => {
    if (offer.status !== 'pending_payment') {
      setError('This offer is not ready for payment.');
      return;
    }

    try {
      setSelectedOffer(offer);
      setShowPaymentModal(true);
      setError('');
      setPaymentStatus('idle');

      // Debug log
      console.log('🔄 Creating payment intent for offer:', offer._id);
      console.log('💰 Offer amount:', offer.amount);
      
      // Try different API endpoints
      let paymentResponse;
      
      try {
        // Try offer-specific payment endpoint first
        paymentResponse = await marketplaceApi.payments.createOfferPaymentIntent(offer._id);
      } catch (err) {
        console.log('⚠️ Offer payment endpoint failed, trying general endpoint...');
        
        // Fallback to general payment intent endpoint
        paymentResponse = await marketplaceApi.payments.createPaymentIntent({
          offerId: offer._id,
          amount: offer.amount,
          currency: 'usd'
        });
      }

      console.log('💳 Payment intent response:', paymentResponse);
      
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.error || 'Failed to create payment intent');
      }

      if (!paymentResponse.data?.clientSecret) {
        throw new Error('No client secret received from server');
      }

      setClientSecret(paymentResponse.data.clientSecret);
      console.log('✅ Payment intent created, clientSecret received');
      
    } catch (error: any) {
      console.error('❌ Error setting up payment:', error);
      setError(error.message || 'Failed to setup payment. Please try again.');
      setShowPaymentModal(false);
    }
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedOffer(null);
    setClientSecret('');
    setPaymentStatus('success');
    setSuccessMessage('Payment completed successfully! Your offer has been submitted to the seller.');
    
    // Refresh offers after payment
    setTimeout(() => {
      fetchOffers();
    }, 2000);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedOffer(null);
    setClientSecret('');
    setPaymentStatus('idle');
    setError('');
  };

  // Cancel offer
  const handleCancelOffer = async (offerId: string) => {
    if (!window.confirm('Are you sure you want to cancel this offer?')) return;

    try {
      setError('');
      
      const response = await marketplaceApi.offers.cancelOffer(offerId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel offer');
      }

      setSuccessMessage('Offer cancelled successfully.');
      fetchOffers(); // Refresh offers
    } catch (error: any) {
      console.error('Error cancelling offer:', error);
      setError(error.message || 'Failed to cancel offer. Please try again.');
    }
  };

  // Filter offers based on active tab
  const filteredOffers = offers.filter(offer => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return offer.status === 'pending' || offer.status === 'pending_payment';
    if (activeTab === 'paid') return offer.status === 'paid';
    if (activeTab === 'accepted') return offer.status === 'accepted';
    if (activeTab === 'rejected') return offer.status === 'rejected' || offer.status === 'cancelled' || offer.status === 'expired';
    return true;
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800';
      case 'paid':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return <FiClock className="mr-1" size={14} />;
      case 'paid':
        return <FiDollarSign className="mr-1" size={14} />;
      case 'accepted':
        return <FiCheckCircle className="mr-1" size={14} />;
      case 'rejected':
      case 'cancelled':
      case 'expired':
        return <FiXCircle className="mr-1" size={14} />;
      default:
        return null;
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending Review';
      case 'pending_payment':
        return 'Payment Required';
      case 'paid':
        return 'Payment Completed';
      case 'accepted':
        return 'Accepted by Seller';
      case 'rejected':
        return 'Rejected';
      case 'cancelled':
        return 'Cancelled';
      case 'expired':
        return 'Expired';
      default:
        return status;
    }
  };

  // Get thumbnail URL
  const getThumbnailUrl = (listing: any): string => {
    if (!listing?.mediaUrls || listing.mediaUrls.length === 0) {
      return 'https://via.placeholder.com/300x200.png?text=No+Image';
    }
    return listing.mediaUrls[0];
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading your offers...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FiCheckCircle className="text-green-500 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-green-800 text-sm font-medium">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="text-green-500 hover:text-green-700 p-1"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">My Offers</h1>
                <p className="mt-2 text-gray-600">
                  Track and manage all your offers in one place
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {refreshing ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    'Refresh Offers'
                  )}
                </button>
                <button 
                  onClick={() => navigate('/marketplace')}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                >
                  <FiShoppingBag className="mr-2" />
                  Browse Listings
                </button>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          <div className="mb-6 bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Total Offers: <span className="font-bold">{offers.length}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pending Payment: {offers.filter(o => o.status === 'pending_payment').length} |
                  Paid: {offers.filter(o => o.status === 'paid').length} |
                  Accepted: {offers.filter(o => o.status === 'accepted').length}
                </p>
              </div>
              <button 
                onClick={() => console.log('Offers data:', offers)}
                className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
              >
                Debug Data
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'pending' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <FiClock size={16} />
                    Pending Payment
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                      {offers.filter(o => o.status === 'pending_payment').length}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('paid')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'paid' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <FiDollarSign size={16} />
                    Paid
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                      {offers.filter(o => o.status === 'paid').length}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('accepted')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'accepted' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <FiCheckCircle size={16} />
                    Accepted
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">
                      {offers.filter(o => o.status === 'accepted').length}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('rejected')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rejected' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    <FiXCircle size={16} />
                    Rejected/Cancelled
                    <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full">
                      {offers.filter(o => ['rejected', 'cancelled', 'expired'].includes(o.status)).length}
                    </span>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('all')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'all' ? 'border-gray-500 text-gray-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-2">
                    All Offers
                    <span className="ml-2 bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded-full">
                      {offers.length}
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Offers List */}
          {filteredOffers.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiPackage size={24} className="text-gray-400 sm:w-8 sm:h-8" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  No offers found
                </h3>
                <p className="text-gray-600 text-sm sm:text-base mb-6">
                  {activeTab === 'pending' 
                    ? "You don't have any pending offers. Make an offer on a listing to get started!" 
                    : `You don't have any ${activeTab} offers.`}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => navigate('/marketplace')}
                    className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                  >
                    Browse Listings
                  </button>
                  <button 
                    onClick={handleRefresh}
                    className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 text-sm sm:text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOffers.map((offer, index) => (
                <div key={offer._id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      {/* Thumbnail */}
                      <div 
                        className="w-full lg:w-48 h-48 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 cursor-pointer"
                        onClick={() => handleViewListing(offer.listingId._id)}
                      >
                        <img
                          src={getThumbnailUrl(offer.listingId)}
                          alt={offer.listingId.title || 'Listing Image'}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200.png?text=No+Image';
                          }}
                        />
                      </div>

                      {/* Offer Details */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {offer.listingId?.title || 'Untitled Listing'}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(offer.status)} flex items-center`}>
                                {getStatusIcon(offer.status)}
                                {getStatusText(offer.status)}
                              </span>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                              {offer.listingId?.description || 'No description available'}
                            </p>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                <FiTag className="text-gray-400" size={16} />
                                <span className="text-sm text-gray-700">
                                  {offer.listingId?.category || 'Uncategorized'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <FiUser className="text-gray-400" size={16} />
                                <span className="text-sm text-gray-700">
                                  Seller: {offer.listingId?.sellerId?.username || 'Unknown Seller'}
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <FiCalendar className="text-gray-400" size={16} />
                                <span className="text-sm text-gray-700">
                                  Offered: {formatDate(offer.createdAt)}
                                </span>
                              </div>
                              
                              {offer.expectedDelivery && (
                                <div className="flex items-center gap-2">
                                  <FiCalendar className="text-gray-400" size={16} />
                                  <span className="text-sm text-gray-700">
                                    Expected: {formatDate(offer.expectedDelivery)}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            {offer.message && (
                              <div className="mb-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <FiMessageSquare className="text-gray-400" size={14} />
                                  <span className="text-sm font-medium text-gray-700">Your Message:</span>
                                </div>
                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                                  {offer.message}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Price and Actions */}
                          <div className="sm:w-48 flex-shrink-0">
                            <div className="text-center sm:text-right mb-4">
                              <div className="text-2xl font-bold text-green-600">
                                {marketplaceApi.utils.formatCurrency(offer.amount)}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Original: {marketplaceApi.utils.formatCurrency(offer.listingId?.price || 0)}
                              </div>
                            </div>
                            
                            <div className="space-y-2">
                              {/* View Listing Button */}
                              <button
                                onClick={() => handleViewListing(offer.listingId._id)}
                                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                              >
                                <FiEye size={14} />
                                View Listing
                              </button>
                              
                              {/* Action Buttons based on status */}
                              {offer.status === 'pending_payment' && (
                                <button
                                  onClick={() => handlePayOffer(offer)}
                                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <FiCreditCard size={14} />
                                  Complete Payment
                                </button>
                              )}
                              
                              {(offer.status === 'pending' || offer.status === 'pending_payment') && (
                                <button
                                  onClick={() => handleCancelOffer(offer._id)}
                                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                >
                                  <FiX size={14} />
                                  Cancel Offer
                                </button>
                              )}
                              
                              {offer.status === 'paid' && (
                                <div className="text-center">
                                  <div className="text-sm text-green-600 font-medium mb-2">
                                    Awaiting Seller Acceptance
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Paid on {offer.paidAt ? formatDate(offer.paidAt) : formatDate(offer.createdAt)}
                                  </div>
                                </div>
                              )}
                              
                              {offer.status === 'accepted' && (
                                <div className="text-center">
                                  <div className="text-sm text-green-600 font-medium mb-2">
                                    Offer Accepted!
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Accepted on {offer.acceptedAt ? formatDate(offer.acceptedAt) : formatDate(offer.updatedAt)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats Summary */}
          {offers.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <FiClock className="text-yellow-600" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {offers.filter(o => o.status === 'pending_payment').length}
                    </div>
                    <div className="text-sm text-gray-600">Pending Payment</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FiDollarSign className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {offers.filter(o => o.status === 'paid').length}
                    </div>
                    <div className="text-sm text-gray-600">Payment Completed</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <FiCheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {offers.filter(o => o.status === 'accepted').length}
                    </div>
                    <div className="text-sm text-gray-600">Accepted</div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <FiPackage className="text-gray-600" size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {offers.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Offers</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal for Pending Payment Offers */}
      {showPaymentModal && selectedOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md sm:max-w-lg mx-4">
            <div className="bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Complete Offer Payment
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Complete payment for your offer on "{selectedOffer.listingId?.title || 'Listing'}"
                  </p>
                </div>
                <button 
                  onClick={handleClosePaymentModal}
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
                            Offer Amount
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {marketplaceApi.utils.formatCurrency(selectedOffer.amount)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-yellow-300">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                          <img
                            src={getThumbnailUrl(selectedOffer.listingId)}
                            alt={selectedOffer.listingId?.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=Preview';
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {selectedOffer.listingId?.title || 'Listing'}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {selectedOffer.listingId?.description || 'No description available'}
                          </p>
                          {selectedOffer.expectedDelivery && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                              <FiCalendar size={12} />
                              <span>Expected: {formatDate(selectedOffer.expectedDelivery)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Form - Only show if clientSecret is available */}
                  {clientSecret ? (
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
                        <OfferPaymentForm 
                          offer={selectedOffer}
                          clientSecret={clientSecret}
                          onSuccess={handlePaymentSuccess}
                          onClose={handleClosePaymentModal}
                          paymentStatus={paymentStatus}
                          setPaymentStatus={setPaymentStatus}
                          setError={setError}
                        />
                      </Elements>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 text-center">
                      <div className="py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Setting up payment...</p>
                      </div>
                    </div>
                  )}

                  {/* Security Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FiCheck className="text-blue-600" size={14} />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Secure Payment</h4>
                        <p className="text-xs text-blue-700">
                          Your payment is processed securely via Stripe. Funds are held in escrow until the seller accepts your offer.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
};

// Offer Payment Form Component
const OfferPaymentForm = ({ 
  offer, 
  clientSecret,
  onSuccess, 
  onClose, 
  paymentStatus, 
  setPaymentStatus,
  setError
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setLocalError('Payment system not ready. Please refresh the page and try again.');
      return;
    }

    setIsSubmitting(true);
    setPaymentStatus('processing');
    setLocalError('');
    setError('');

    try {
      console.log('🔄 Processing payment for offer:', offer._id);

      // Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/offers?payment_success=true`,
          metadata: {
            offerId: offer._id,
            listingId: offer.listingId?._id,
            buyerId: offer.buyerId?._id
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        console.error('❌ Stripe error:', stripeError);
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (paymentIntent) {
        console.log('✅ Payment intent status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          // Update offer status via API
          const response = await marketplaceApi.payments.updateOfferPayment({
            offerId: offer._id,
            paymentIntentId: paymentIntent.id,
            status: 'paid'
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to update offer status');
          }

          setPaymentStatus('success');
          setTimeout(() => {
            onSuccess();
          }, 1500);
        } else {
          throw new Error(`Payment status: ${paymentIntent.status}`);
        }
      }

    } catch (err: any) {
      console.error('❌ Payment processing error:', err);
      
      let errorMessage = 'Payment failed. Please try again.';
      if (err.message) {
        errorMessage = err.message;
      }

      setLocalError(errorMessage);
      setPaymentStatus('failed');
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      {localError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={18} />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-800 mb-1">Payment Error</h4>
              <p className="text-sm text-red-700">{localError}</p>
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
              <p className="text-sm text-green-700">Your offer has been submitted to the seller.</p>
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
            `Pay ${marketplaceApi.utils.formatCurrency(offer.amount)}`
          )}
        </button>
      </div>
    </form>
  );
};

export default MyOffers;