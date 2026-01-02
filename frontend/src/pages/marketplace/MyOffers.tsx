// src/pages/marketplace/MyOffers.tsx
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { 
  FiCreditCard, FiCheck, FiX, FiAlertCircle, FiLoader, 
  FiClock, FiCheckCircle, FiXCircle, FiEye, FiDollarSign,
  FiCalendar, FiMessageSquare, FiPackage, FiUser, FiTag,
  FiShoppingBag, FiRefreshCw, FiExternalLink, FiInfo, FiLock,
  FiPlay, FiVideo, FiImage
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
    sellerId: {
      _id: string;
      username: string;
      email?: string;
      avatar?: string;
    };
    type?: string;
    condition?: string;
    location?: string;
  };
  buyerId: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  sellerId: string;
  amount: number;
  status: 'pending' | 'pending_payment' | 'paid' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  message?: string;
  requirements?: string;
  expectedDelivery?: string;
  paymentIntentId?: string;
  stripePaymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  cancelledAt?: string;
  rejectionReason?: string;
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
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid' | 'accepted' | 'rejected'>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const navigate = useLocation();

  // Check for success message from location state
  useEffect(() => {
    if (navigate.state?.message) {
      setSuccessMessage(navigate.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
    }
    
    if (navigate.state?.paymentSuccess) {
      setSuccessMessage('Payment completed successfully!');
      setTimeout(() => {
        fetchOffers();
        window.history.replaceState({}, document.title);
      }, 2000);
    }
  }, [navigate]);

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

      // Process the response data
      let offersData = response.data?.offers || [];
      
      // If data is nested differently
      if (response.data?.data?.offers) {
        offersData = response.data.data.offers;
      }
      
      // Normalize the offer data
      const normalizedOffers = offersData.map((offer: any) => {
        const listing = offer.listingId || offer.listing || {};
        const buyer = offer.buyerId || offer.buyer || {};
        
        return {
          _id: offer._id || offer.id,
          listingId: {
            _id: listing._id || listing.id || '',
            title: listing.title || 'Untitled Listing',
            price: listing.price || 0,
            mediaUrls: listing.mediaUrls || [],
            category: listing.category || 'Uncategorized',
            description: listing.description || 'No description available',
            sellerId: listing.sellerId || {
              _id: '',
              username: 'Unknown Seller',
              email: ''
            },
            type: listing.type,
            condition: listing.condition,
            location: listing.location
          },
          buyerId: {
            _id: buyer._id || buyer.id || '',
            username: buyer.username || 'Unknown Buyer',
            email: buyer.email || '',
            avatar: buyer.avatar
          },
          sellerId: offer.sellerId || '',
          amount: offer.amount || offer.offeredPrice || 0,
          status: (offer.status || 'pending').toLowerCase() as Offer['status'],
          message: offer.message,
          requirements: offer.requirements,
          expectedDelivery: offer.expectedDelivery,
          paymentIntentId: offer.paymentIntentId || offer.stripePaymentIntentId,
          stripePaymentIntentId: offer.stripePaymentIntentId || offer.paymentIntentId,
          createdAt: offer.createdAt || new Date().toISOString(),
          updatedAt: offer.updatedAt || new Date().toISOString(),
          paidAt: offer.paidAt,
          acceptedAt: offer.acceptedAt,
          rejectedAt: offer.rejectedAt,
          cancelledAt: offer.cancelledAt,
          rejectionReason: offer.rejectionReason
        };
      });
      
      console.log('✅ Normalized offers:', normalizedOffers);
      console.log('📊 Offers count:', normalizedOffers.length);
      
      setOffers(normalizedOffers);
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

  // Handle click on offer card - opens payment modal for pending offers
  const handleOfferClick = async (offer: Offer) => {
    console.log('🎯 Offer clicked:', offer._id, 'Status:', offer.status);
    
    // Only open payment modal for pending or pending_payment offers
    if (offer.status === 'pending' || offer.status === 'pending_payment') {
      await handlePayOffer(offer);
    } else {
      // For other statuses, show details or navigate
      navigate(`/marketplace/listings/${offer.listingId._id}`);
    }
  };

  // Handle payment for pending payment offer
  const handlePayOffer = async (offer: Offer) => {
    try {
      setSelectedOffer(offer);
      setShowPaymentModal(true);
      setError('');
      setPaymentStatus('idle');
      setClientSecret('');

      console.log('🔄 Initiating payment for offer:', offer._id);
      console.log('💰 Offer amount:', offer.amount);
      console.log('📝 Offer status:', offer.status);

      // Simulate API call for testing - remove this in production
      // setTimeout(() => {
      //   setClientSecret('pi_3Lt6tq2eZvKYlo2C1rIq0FwL_secret_mZ4o7t6X9Q8j3r5t7y9u0i1o2p3');
      //   console.log('✅ Mock client secret set for testing');
      // }, 1000);

      // Real API call - uncomment this in production
      try {
        const response = await marketplaceApi.payments.createOfferPaymentIntent(offer._id);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to create payment intent');
        }

        if (response.data?.clientSecret) {
          setClientSecret(response.data.clientSecret);
          console.log('✅ Payment intent created, clientSecret received');
        } else {
          throw new Error('No client secret received from server');
        }
      } catch (apiError: any) {
        console.error('❌ API Error:', apiError);
        
        // Fallback: Try general payment intent endpoint
        try {
          const fallbackResponse = await marketplaceApi.payments.createPaymentIntent({
            offerId: offer._id,
            amount: offer.amount,
            currency: 'usd'
          });
          
          if (fallbackResponse.success && fallbackResponse.data?.clientSecret) {
            setClientSecret(fallbackResponse.data.clientSecret);
            console.log('✅ Fallback payment intent created');
          } else {
            throw new Error('Payment setup failed');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          throw new Error('Unable to setup payment. Please try again later.');
        }
      }
      
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
  const handleCancelOffer = async (offerId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering offer click
    
    if (!window.confirm('Are you sure you want to cancel this offer? This action cannot be undone.')) return;

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

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'pending_payment':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'paid':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'rejected':
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
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
        return <FiInfo className="mr-1" size={14} />;
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

  // Get thumbnail URL with video support
  const getThumbnailUrl = (listing: any): string => {
    if (!listing?.mediaUrls || listing.mediaUrls.length === 0) {
      return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
    }
    
    const firstMedia = listing.mediaUrls[0];
    if (firstMedia.startsWith('http')) {
      return firstMedia;
    }
    
    // If it's a relative path, make it absolute
    if (firstMedia.startsWith('/')) {
      return `http://localhost:3000${firstMedia}`;
    }
    
    return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
  };

  // Check if media is a video
  const isVideo = (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  // Check if media is an image
  const isImage = (url: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
  };

  // Get media type icon
  const getMediaTypeIcon = (url: string) => {
    if (isVideo(url)) return <FiVideo className="text-white" size={20} />;
    if (isImage(url)) return <FiImage className="text-white" size={20} />;
    return null;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Get time since offer
  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Handle image preview
  const handleImagePreview = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewImage(url);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading your offers...</p>
            <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch your data</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 animate-fade-in bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <FiCheckCircle className="text-green-500 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-green-800 text-sm font-medium">{successMessage}</p>
                </div>
                <button
                  onClick={() => setSuccessMessage('')}
                  className="text-green-500 hover:text-green-700 p-1 hover:bg-green-100 rounded-full transition-colors"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 animate-fade-in bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <FiAlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <p className="text-red-800 text-sm font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-full transition-colors"
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
                <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  My Offers
                </h1>
                <p className="mt-2 text-gray-600">
                  Track and manage all your offers in one place
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 rounded-xl text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
                >
                  {refreshing ? (
                    <>
                      <FiLoader className="animate-spin mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      Refresh
                    </>
                  )}
                </button>
                <button 
                  onClick={() => window.location.href = '/marketplace'}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent rounded-xl text-base font-medium text-white bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-sm hover:shadow"
                >
                  <FiShoppingBag className="mr-2" />
                  Browse Listings
                </button>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-100 to-yellow-50 flex items-center justify-center">
                  <FiClock className="text-yellow-600" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {offers.filter(o => ['pending', 'pending_payment'].includes(o.status)).length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-100 to-blue-50 flex items-center justify-center">
                  <FiDollarSign className="text-blue-600" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {offers.filter(o => o.status === 'paid').length}
                  </div>
                  <div className="text-sm text-gray-600">Paid</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-100 to-green-50 flex items-center justify-center">
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
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-100 to-red-50 flex items-center justify-center">
                  <FiXCircle className="text-red-600" size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {offers.filter(o => ['rejected', 'cancelled', 'expired'].includes(o.status)).length}
                  </div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-100 to-gray-50 flex items-center justify-center">
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

          {/* Tabs */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {[
                  { key: 'all', label: 'All Offers', count: offers.length },
                  { key: 'pending', label: 'Pending', count: offers.filter(o => ['pending', 'pending_payment'].includes(o.status)).length },
                  { key: 'paid', label: 'Paid', count: offers.filter(o => o.status === 'paid').length },
                  { key: 'accepted', label: 'Accepted', count: offers.filter(o => o.status === 'accepted').length },
                  { key: 'rejected', label: 'Rejected', count: offers.filter(o => ['rejected', 'cancelled', 'expired'].includes(o.status)).length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.key ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center gap-2">
                      {tab.label}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                        {tab.count}
                      </span>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Offers List */}
          {filteredOffers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
                  <FiPackage size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  No offers found
                </h3>
                <p className="text-gray-600 text-base mb-8">
                  {activeTab === 'all' 
                    ? "You haven't made any offers yet. Start by browsing listings and making your first offer!"
                    : activeTab === 'pending'
                    ? "You don't have any pending offers. Make an offer on a listing to get started!"
                    : `You don't have any ${activeTab} offers.`}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => window.location.href = '/marketplace'}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <FiShoppingBag className="mr-2" />
                    Browse Listings
                  </button>
                  <button 
                    onClick={handleRefresh}
                    className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <FiRefreshCw className="mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {offers.map((offer, index) => {
                // Filter offers based on active tab
                if (activeTab !== 'all') {
                  if (activeTab === 'pending' && !['pending', 'pending_payment'].includes(offer.status)) return null;
                  if (activeTab === 'paid' && offer.status !== 'paid') return null;
                  if (activeTab === 'accepted' && offer.status !== 'accepted') return null;
                  if (activeTab === 'rejected' && !['rejected', 'cancelled', 'expired'].includes(offer.status)) return null;
                }

                return (
                  <div 
                    key={offer._id || index} 
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer ${
                      (offer.status === 'pending' || offer.status === 'pending_payment') 
                        ? 'hover:border-yellow-400' 
                        : 'hover:border-gray-300'
                    }`}
                    onClick={() => handleOfferClick(offer)}
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Thumbnail with Media Type */}
                        <div className="w-full lg:w-64 flex-shrink-0">
                          <div className="relative w-full h-64 rounded-xl overflow-hidden border border-gray-200 group">
                            {offer.listingId.mediaUrls && offer.listingId.mediaUrls.length > 0 ? (
                              <>
                                {isVideo(offer.listingId.mediaUrls[0]) ? (
                                  <div className="relative w-full h-full">
                                    <video
                                      className="w-full h-full object-cover"
                                      poster={getThumbnailUrl(offer.listingId)}
                                      controls
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <source src={offer.listingId.mediaUrls[0]} type="video/mp4" />
                                      Your browser does not support the video tag.
                                    </video>
                                    <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                      <FiVideo size={12} />
                                      Video
                                    </div>
                                  </div>
                                ) : (
                                  <img
                                    src={getThumbnailUrl(offer.listingId)}
                                    alt={offer.listingId.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    onClick={(e) => handleImagePreview(getThumbnailUrl(offer.listingId), e)}
                                  />
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                <FiImage className="text-gray-400" size={48} />
                              </div>
                            )}
                            
                            {/* Media Gallery Count */}
                            {offer.listingId.mediaUrls && offer.listingId.mediaUrls.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                +{offer.listingId.mediaUrls.length - 1} more
                              </div>
                            )}
                            
                            {/* Click to Pay Overlay for Pending Offers */}
                            {(offer.status === 'pending' || offer.status === 'pending_payment') && (
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="text-center p-4">
                                  <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center mx-auto mb-3">
                                    <FiCreditCard className="text-white" size={24} />
                                  </div>
                                  <h4 className="text-white font-semibold text-lg mb-1">
                                    Complete Payment
                                  </h4>
                                  <p className="text-yellow-200 text-sm">
                                    Click to pay {marketplaceApi.utils.formatCurrency(offer.amount)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Media Thumbnails Gallery */}
                          {offer.listingId.mediaUrls && offer.listingId.mediaUrls.length > 1 && (
                            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                              {offer.listingId.mediaUrls.slice(0, 4).map((url, idx) => (
                                <div 
                                  key={idx}
                                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 cursor-pointer hover:border-yellow-500 transition-colors"
                                  onClick={(e) => handleImagePreview(url, e)}
                                >
                                  {isVideo(url) ? (
                                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                      <FiVideo className="text-white" size={16} />
                                    </div>
                                  ) : (
                                    <img
                                      src={url.startsWith('http') ? url : `http://localhost:3000${url}`}
                                      alt={`${offer.listingId.title} - ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  {idx === 3 && offer.listingId.mediaUrls.length > 4 && (
                                    <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">
                                        +{offer.listingId.mediaUrls.length - 4}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Offer Details */}
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-3 mb-3">
                                <h3 className="text-xl font-semibold text-gray-900">
                                  {offer.listingId.title}
                                </h3>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(offer.status)} flex items-center gap-1`}>
                                  {getStatusIcon(offer.status)}
                                  {getStatusText(offer.status)}
                                </span>
                              </div>
                              
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                {offer.listingId.description}
                              </p>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center gap-2">
                                  <FiTag className="text-gray-400 flex-shrink-0" size={16} />
                                  <span className="text-sm text-gray-700">
                                    {offer.listingId.category || 'Uncategorized'}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <FiUser className="text-gray-400 flex-shrink-0" size={16} />
                                  <span className="text-sm text-gray-700">
                                    Seller: <span className="font-medium">{offer.listingId.sellerId.username}</span>
                                  </span>
                                </div>
                                
                                {offer.listingId.type && (
                                  <div className="flex items-center gap-2">
                                    <FiPackage className="text-gray-400 flex-shrink-0" size={16} />
                                    <span className="text-sm text-gray-700">{offer.listingId.type}</span>
                                  </div>
                                )}
                                
                                <div className="flex items-center gap-2">
                                  <FiCalendar className="text-gray-400 flex-shrink-0" size={16} />
                                  <span className="text-sm text-gray-700">
                                    Offered: <span className="font-medium">{getTimeSince(offer.createdAt)}</span>
                                  </span>
                                </div>
                              </div>
                              
                              {offer.message && (
                                <div className="mb-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FiMessageSquare className="text-gray-400" size={14} />
                                    <span className="text-sm font-medium text-gray-700">Your Message:</span>
                                  </div>
                                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <p className="text-sm text-gray-600">{offer.message}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Price and Actions */}
                            <div className="md:w-56 flex-shrink-0">
                              <div className="text-center md:text-right mb-4">
                                <div className="text-2xl font-bold text-green-600 mb-1">
                                  {marketplaceApi.utils.formatCurrency(offer.amount)}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Original: {marketplaceApi.utils.formatCurrency(offer.listingId.price)}
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Offer ID: {offer._id.substring(0, 8)}...
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {/* Status Specific Content */}
                                {(offer.status === 'pending' || offer.status === 'pending_payment') && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePayOffer(offer);
                                      }}
                                      className="w-full px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow"
                                    >
                                      <FiCreditCard size={14} />
                                      {offer.status === 'pending_payment' ? 'Complete Payment' : 'Make Payment'}
                                    </button>
                                    
                                    <button
                                      onClick={(e) => handleCancelOffer(offer._id, e)}
                                      className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                    >
                                      <FiX size={14} />
                                      Cancel Offer
                                    </button>
                                    
                                    <div className="text-xs text-gray-500 text-center mt-2">
                                      Click anywhere on the card to open payment
                                    </div>
                                  </>
                                )}
                                
                                {offer.status === 'paid' && (
                                  <div className="text-center py-3 px-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="text-sm text-blue-700 font-medium mb-1">
                                      ✅ Payment Completed
                                    </div>
                                    <div className="text-xs text-blue-600">
                                      Awaiting seller acceptance
                                    </div>
                                    {offer.paidAt && (
                                      <div className="text-xs text-blue-500 mt-1">
                                        Paid on {formatDate(offer.paidAt)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {offer.status === 'accepted' && (
                                  <div className="text-center py-3 px-3 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="text-sm text-green-700 font-medium mb-1">
                                      🎉 Offer Accepted!
                                    </div>
                                    <div className="text-xs text-green-600">
                                      Your offer has been accepted
                                    </div>
                                    {offer.acceptedAt && (
                                      <div className="text-xs text-green-500 mt-1">
                                        Accepted on {formatDate(offer.acceptedAt)}
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {['rejected', 'cancelled', 'expired'].includes(offer.status) && (
                                  <div className="text-center py-3 px-3 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="text-sm text-red-700 font-medium mb-1">
                                      {offer.status === 'rejected' && '❌ Offer Rejected'}
                                      {offer.status === 'cancelled' && '🚫 Offer Cancelled'}
                                      {offer.status === 'expired' && '⏰ Offer Expired'}
                                    </div>
                                    {offer.rejectionReason && (
                                      <div className="text-xs text-red-600 mt-1">
                                        Reason: {offer.rejectionReason}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button 
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-2 z-10"
              onClick={() => setPreviewImage(null)}
            >
              <FiX size={24} />
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOffer && (
        <PaymentModal
          offer={selectedOffer}
          clientSecret={clientSecret}
          paymentStatus={paymentStatus}
          onSuccess={handlePaymentSuccess}
          onClose={handleClosePaymentModal}
          setPaymentStatus={setPaymentStatus}
          setError={setError}
        />
      )}
    </MarketplaceLayout>
  );
};

// Payment Modal Component
interface PaymentModalProps {
  offer: Offer;
  clientSecret: string;
  paymentStatus: 'idle' | 'processing' | 'success' | 'failed';
  onSuccess: () => void;
  onClose: () => void;
  setPaymentStatus: (status: 'idle' | 'processing' | 'success' | 'failed') => void;
  setError: (error: string) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  offer,
  clientSecret,
  paymentStatus,
  onSuccess,
  onClose,
  setPaymentStatus,
  setError
}) => {
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
          return_url: `${window.location.origin}/marketplace/offers?paymentSuccess=true`,
          metadata: {
            offerId: offer._id,
            listingId: offer.listingId._id,
            buyerId: offer.buyerId._id,
            amount: offer.amount.toString()
          }
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        console.error('❌ Stripe error:', stripeError);
        throw new Error(stripeError.message || 'Payment failed. Please try again.');
      }

      if (paymentIntent) {
        console.log('✅ Payment intent status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          // Update offer status via API
          try {
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
            
          } catch (apiError: any) {
            console.error('❌ API error:', apiError);
            
            // If API fails but Stripe succeeded, still show success
            setLocalError('Payment succeeded but there was an issue updating the offer status. Please contact support.');
            setPaymentStatus('success');
            setTimeout(() => {
              onSuccess();
            }, 3000);
          }
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

  // Get thumbnail with video support
  const getThumbnailUrl = (listing: any): string => {
    if (!listing?.mediaUrls || listing.mediaUrls.length === 0) {
      return 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
    }
    
    const firstMedia = listing.mediaUrls[0];
    if (firstMedia.startsWith('http')) {
      return firstMedia;
    }
    
    return firstMedia.startsWith('/') 
      ? `http://localhost:3000${firstMedia}`
      : 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop';
  };

  // Check if media is a video
  const isVideo = (url: string): boolean => {
    return ['.mp4', '.webm', '.ogg', '.mov', '.avi'].some(ext => url.toLowerCase().endsWith(ext));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-md sm:max-w-lg mx-4">
        <div className="bg-white rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-yellow-50 to-yellow-100 border-b border-yellow-200 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Complete Offer Payment
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Complete payment for your offer
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-yellow-200 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={paymentStatus === 'processing'}
            >
              <FiX size={20} className="text-gray-700" />
            </button>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {/* Listing Preview with Video Support */}
              <div className="mb-6 bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-lg overflow-hidden border border-gray-300 flex-shrink-0">
                    {offer.listingId.mediaUrls && offer.listingId.mediaUrls.length > 0 && isVideo(offer.listingId.mediaUrls[0]) ? (
                      <div className="relative w-full h-full">
                        <video
                          className="w-full h-full object-cover"
                          poster={getThumbnailUrl(offer.listingId)}
                          controls
                        >
                          <source src={offer.listingId.mediaUrls[0]} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        <div className="absolute bottom-1 right-1 bg-black bg-opacity-60 rounded-full p-1">
                          <FiPlay size={12} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={getThumbnailUrl(offer.listingId)}
                        alt={offer.listingId.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                      {offer.listingId.title}
                    </h4>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {offer.listingId.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <FiUser size={10} />
                      <span>Seller: {offer.listingId.sellerId.username}</span>
                    </div>
                    {offer.expectedDelivery && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <FiCalendar size={10} />
                        <span>Expected: {new Date(offer.expectedDelivery).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Offer Details */}
                <div className="mt-4 pt-4 border-t border-gray-300">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">Offer Amount</div>
                      <div className="text-2xl font-bold text-green-600">
                        {marketplaceApi.utils.formatCurrency(offer.amount)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-700">Original Price</div>
                      <div className="text-lg text-gray-500 line-through">
                        {marketplaceApi.utils.formatCurrency(offer.listingId.price)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              {clientSecret ? (
                <div className="mb-6">
                  <Elements stripe={stripePromise} options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#ca8a04',
                        borderRadius: '0.75rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }
                    }
                  }}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Payment Element */}
                      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
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
                          <div className="min-h-[200px] border border-gray-300 rounded-lg p-3 bg-gray-50">
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
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
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
                        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center">
                              <FiCheck className="text-white" size={16} />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-green-800">Payment Successful!</h4>
                              <p className="text-sm text-green-700">Your offer has been submitted to the seller.</p>
                              <p className="text-xs text-green-600 mt-1">Redirecting to offers page...</p>
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
                          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-all text-sm font-medium flex items-center justify-center gap-2 shadow-sm hover:shadow"
                        >
                          <FiX size={16} />
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
                          className="flex-1 py-3 px-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow disabled:shadow-none"
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
                  </Elements>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-8 mb-4 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 font-medium mb-2">Setting up payment...</p>
                  <p className="text-gray-500 text-sm">Please wait while we prepare your payment details</p>
                </div>
              )}

              {/* Security Info */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 flex items-center justify-center flex-shrink-0">
                    <FiLock className="text-white" size={14} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Secure Payment</h4>
                    <p className="text-xs text-blue-800">
                      • Your payment is processed securely via Stripe<br/>
                      • Funds are held in escrow until the seller accepts your offer<br/>
                      • All transactions are protected by our buyer protection policy<br/>
                      • 256-bit SSL encryption for all data
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

// Filter offers function (moved inside component for proper closure)
const MyOffersWithFilter: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid' | 'accepted' | 'rejected'>('all');

  // Fetch offers logic here...

  const filteredOffers = offers.filter(offer => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return ['pending', 'pending_payment'].includes(offer.status);
    if (activeTab === 'paid') return offer.status === 'paid';
    if (activeTab === 'accepted') return offer.status === 'accepted';
    if (activeTab === 'rejected') return ['rejected', 'cancelled', 'expired'].includes(offer.status);
    return true;
  });

  return (
    <MyOffers />
  );
};

export default MyOffers;