import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements, AddressElement } from '@stripe/react-stripe-js';
import {
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiCheck, FiAlertCircle,
  FiLoader, FiUser, FiCalendar, FiMail, FiPlay, FiPause, FiVolume2,
  FiVolumeX, FiMaximize, FiEye, FiHeart, FiImage, FiVideo, FiClock, FiDollarSign
} from 'react-icons/fi';
import ListingCard from '../../components/marketplae/ListingCard';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import marketplaceApi from '../../api/marketplaceApi';
import VideoPlayerModal from '../../components/marketplae/VideoPlayerModal';
import PaymentModal from '../../components/marketplae/paymentModal';
import OfferModal from '../../components/marketplae/OfferModal';

// Constants
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ";
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const ERROR_IMAGE = 'https://via.placeholder.com/300x200/cccccc/ffffff?text=Preview+Unavailable';

// Initialize Stripe
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

const Browse: React.FC = () => {
  // State
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  // Modal states
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showVideoPopup, setShowVideoPopup] = useState<boolean>(false);
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);

  // Selected items
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  // Payment states
  const [clientSecret, setClientSecret] = useState<string>('');
  const [offerData, setOfferData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');

  // Filters
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });

  // Offer form
  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Billing details
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US'
    }
  });

  // Memoized filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      if (!listing.title || listing.status !== 'active') return false;
      
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return listing.title.toLowerCase().includes(searchLower) ||
               listing.description?.toLowerCase().includes(searchLower) ||
               listing.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      }
      return true;
    });
  }, [listings, searchQuery]);

  // Fetch data on mount
  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      if (user) {
        setCurrentUser(user);
        setBillingDetails(prev => ({
          ...prev,
          name: user.username || 'Customer',
          email: user.email || '',
          phone: user.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      setImageErrors({});

      const response = await marketplaceApi.listings.getAllListings({
        type: filters.type || undefined,
        category: filters.category || undefined,
        minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
        sortBy: filters.sortBy
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch listings');
      }

      const listingsData = response.data?.listings || [];
      setListings(listingsData);
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError(error.message || 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleViewDetails = useCallback((listingId: string) => {
    navigate(`/marketplace/listings/${listingId}`);
  }, [navigate]);

  const handleMakeOffer = useCallback((listing: Listing) => {
    setSelectedListing(listing);
    setOfferForm({
      amount: listing.price.toString(),
      message: '',
      requirements: '',
      expectedDelivery: ''
    });
    setShowOfferModal(true);
    setError('');
  }, []);

  const handleVideoClick = useCallback((videoUrl: string, title: string) => {
    setSelectedVideo(videoUrl);
    setSelectedVideoTitle(title);
    setShowVideoPopup(true);
  }, []);

  const handleCloseVideoPopup = useCallback(() => {
    setShowVideoPopup(false);
    setSelectedVideo('');
    setSelectedVideoTitle('');
  }, []);

  const handleDirectPayment = useCallback(async (listing: Listing) => {
    if (!listing._id) return;

    try {
      setPaymentStatus('processing');
      setError('');

      const response = await marketplaceApi.offers.createDirectPayment(
        listing._id,
        ''
      );

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received');
      }

      setClientSecret(response.data.clientSecret);
      setOfferData({
        ...response.data,
        type: 'direct_purchase',
        amount: listing.price,
        listing: listing,
        order: response.data.order
      });
      setShowPaymentModal(true);
      setPaymentStatus('idle');
    } catch (error: any) {
      console.error('❌ Error creating direct payment:', error);
      setPaymentStatus('failed');
      setError(error.message || 'Failed to initiate payment');
    }
  }, []);

  const handlePaymentSuccess = useCallback(() => {
    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('success');
    
    navigate('/marketplace/my-orders', {
      state: {
        message: 'Payment completed successfully! Your order has been placed.',
        type: 'success'
      }
    });
  }, [navigate]);

  const handlePaymentClose = useCallback(() => {
    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('idle');
    setError('');
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      type: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest'
    });
    setSearchQuery('');
    setError('');
  }, []);

  const handleImageError = useCallback((listingId: string) => {
    setImageErrors(prev => ({ ...prev, [listingId]: true }));
  }, []);

  // Helper functions
  const isVideoUrl = useCallback((url: string): boolean => {
    if (!url) return false;
    
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    const videoDomains = [
      'youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com',
      'twitch.tv', 'streamable.com', 'cloudinary.com', 'vidyard.com', 'wistia.com'
    ];
    
    return videoExtensions.test(url) || videoDomains.some(domain => url.includes(domain));
  }, []);

  const getFirstVideoUrl = useCallback((listing: Listing): string => {
    if (!listing.mediaUrls?.length) return '';
    return listing.mediaUrls.find(url => isVideoUrl(url)) || '';
  }, [isVideoUrl]);

  const generateVideoThumbnail = useCallback((videoUrl: string): string => {
    // YouTube
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    
    // Vimeo
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) return `https://vumbnail.com/${videoId}.jpg`;
    }
    
    return VIDEO_PLACEHOLDER;
  }, []);

  const getThumbnailUrl = useCallback((listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    if (imageErrors[listingId]) return ERROR_IMAGE;
    if (!listing.mediaUrls?.length) return PLACEHOLDER_IMAGE;

    // Find image
    const imageUrl = listing.mediaUrls.find(url => 
      /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url)
    );
    if (imageUrl) return imageUrl;

    // Find video thumbnail
    const videoUrl = getFirstVideoUrl(listing);
    if (videoUrl) return generateVideoThumbnail(videoUrl);

    return listing.mediaUrls[0] || PLACEHOLDER_IMAGE;
  }, [imageErrors, getFirstVideoUrl, generateVideoThumbnail]);

  const getMediaType = useCallback((listing: Listing): 'image' | 'video' | 'none' => {
    if (!listing.mediaUrls?.length) return 'none';
    if (listing.mediaUrls.some(url => isVideoUrl(url))) return 'video';
    if (listing.mediaUrls.some(url => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url))) return 'image';
    return 'none';
  }, [isVideoUrl]);

  // Loading state
  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 text-lg">Loading listings...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <HeaderSection
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            clearFilters={clearFilters}
            navigate={navigate}
          />

          {/* Filters Section */}
          {showFilters && (
            <FiltersSection
              filters={filters}
              setFilters={setFilters}
              clearFilters={clearFilters}
            />
          )}

          {/* Results Count */}
          <ResultsSection
            filteredListings={filteredListings}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <EmptyState
              searchQuery={searchQuery}
              filters={filters}
              navigate={navigate}
            />
          ) : (
            <ListingsGrid
              listings={filteredListings}
              getThumbnailUrl={getThumbnailUrl}
              getFirstVideoUrl={getFirstVideoUrl}
              getMediaType={getMediaType}
              handleImageError={handleImageError}
              handleMakeOffer={handleMakeOffer}
              handleVideoClick={handleVideoClick}
              handleDirectPayment={handleDirectPayment}
              isVideoUrl={isVideoUrl}
            />
          )}
        </div>
      </div>

      {/* Video Popup Modal */}
      <VideoPlayerModal
        isOpen={showVideoPopup}
        onClose={handleCloseVideoPopup}
        videoUrl={selectedVideo}
        videoTitle={selectedVideoTitle}
      />

      {/* Offer Modal */}
      <OfferModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        selectedListing={selectedListing}
        offerForm={offerForm}
        setOfferForm={setOfferForm}
        onSubmit={handleSubmitOffer}
        paymentStatus={paymentStatus}
        error={error}
        getThumbnailUrl={getThumbnailUrl}
      />

      {/* Payment Modal */}
      {showPaymentModal && clientSecret && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={handlePaymentClose}
          onSuccess={handlePaymentSuccess}
          clientSecret={clientSecret}
          offerData={offerData}
          paymentStatus={paymentStatus}
          setPaymentStatus={setPaymentStatus}
          billingDetails={billingDetails}
          setBillingDetails={setBillingDetails}
          currentUser={currentUser}
          getThumbnailUrl={getThumbnailUrl}
        />
      )}
    </MarketplaceLayout>
  );
};

// Sub-components
const HeaderSection = React.memo(({
  searchQuery,
  setSearchQuery,
  showFilters,
  setShowFilters,
  clearFilters,
  navigate
}: any) => (
  <div className="mb-8">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Video Marketplace</h1>
        <p className="mt-2 text-gray-600">
          Discover amazing video content, scripts, and creative assets
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3">
        {marketplaceApi.utils.checkAuth() && (
          <>
            <button 
              onClick={() => navigate('/marketplace/create')}
              className="btn-primary"
            >
              <FiPlus className="mr-2" size={18} />
              <span className="hidden sm:inline">Create Listing</span>
              <span className="sm:hidden">Create</span>
            </button>
            <button 
              onClick={() => navigate('/marketplace/my-orders')}
              className="btn-secondary"
            >
              <FiCreditCard className="mr-2" size={18} />
              <span className="hidden sm:inline">My Offers</span>
              <span className="sm:hidden">Offers</span>
            </button>
          </>
        )}
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary"
        >
          <FiFilter className="mr-2" size={18} />
          <span className="hidden sm:inline">Filters</span>
          <span className="sm:hidden">Filter</span>
        </button>
      </div>
    </div>

    {/* Search Bar */}
    <div className="mt-6 max-w-2xl">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FiSearch className="text-gray-400" size={20} />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search videos, scripts, or creative assets..."
          className="search-input"
        />
      </div>
    </div>
  </div>
));

const FiltersSection = React.memo(({ filters, setFilters, clearFilters }: any) => (
  <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-gray-900">Filters</h3>
      <button
        onClick={clearFilters}
        className="text-sm text-yellow-600 hover:text-yellow-500 font-medium"
      >
        Clear all
      </button>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Listing Type
        </label>
        <select 
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="filter-input"
        >
          <option value="">All Types</option>
          <option value="for_sale">For Sale</option>
          <option value="licensing">Licensing</option>
          <option value="adaptation_rights">Adaptation Rights</option>
          <option value="commission">Commission</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <input
          type="text"
          value={filters.category}
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          placeholder="Video, Script, Music, Animation..."
          className="filter-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Min Price
        </label>
        <input
          type="number"
          placeholder="$0"
          value={filters.minPrice}
          onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
          className="filter-input"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort By
        </label>
        <select 
          value={filters.sortBy}
          onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          className="filter-input"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>
    </div>
  </div>
));

const ResultsSection = React.memo(({ filteredListings, searchQuery, setSearchQuery }: any) => (
  <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
    <p className="text-gray-600 text-sm sm:text-base">
      Showing <span className="font-semibold">{filteredListings.length}</span> listings
      {searchQuery && (
        <span> for "<span className="font-semibold">{searchQuery}</span>"</span>
      )}
    </p>
    
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="text-sm text-yellow-600 hover:text-yellow-500 font-medium self-start sm:self-auto"
      >
        Clear search
      </button>
    )}
  </div>
));

const EmptyState = React.memo(({ searchQuery, filters, navigate }: any) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
    <div className="max-w-md mx-auto">
      <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
        <FiSearch size={24} className="text-gray-400 sm:w-8 sm:h-8" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
        {searchQuery || Object.values(filters).some(Boolean) 
          ? 'No listings found' 
          : 'No listings yet'
        }
      </h3>
      <p className="text-gray-600 text-sm sm:text-base mb-6">
        {searchQuery || Object.values(filters).some(Boolean)
          ? 'Try adjusting your search or filters to find what you\'re looking for.'
          : 'Be the first to create a listing and start trading!'
        }
      </p>
      {marketplaceApi.utils.checkAuth() && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button 
            onClick={() => navigate('/marketplace/create')}
            className="btn-primary"
          >
            <FiPlus className="mr-2" size={18} />
            Create First Listing
          </button>
        </div>
      )}
    </div>
  </div>
));

const ListingsGrid = React.memo(({
  listings,
  getThumbnailUrl,
  getFirstVideoUrl,
  getMediaType,
  handleImageError,
  handleMakeOffer,
  handleVideoClick,
  handleDirectPayment,
  isVideoUrl
}: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {listings.map(listing => {
      const thumbnailUrl = getThumbnailUrl(listing);
      const videoUrl = getFirstVideoUrl(listing);
      const mediaType = getMediaType(listing);
      
      return (
        <ListingCard
          key={listing._id}
          listing={listing}
          thumbnailUrl={thumbnailUrl}
          videoUrl={videoUrl}
          mediaType={mediaType}
          onImageError={() => handleImageError(listing._id)}
          onMakeOffer={() => handleMakeOffer(listing)}
          onVideoClick={() => handleVideoClick(videoUrl, listing.title)}
          onDirectPayment={() => handleDirectPayment(listing)}
          isVideoUrl={isVideoUrl}
        />
      );
    })}
  </div>
));

// Payment Form Component
const PaymentForm = ({ 
  offerData, 
  onSuccess, 
  onClose, 
  paymentStatus, 
  setPaymentStatus,
  billingDetails,
  setBillingDetails,
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
      const userInfo = {
        name: currentUser?.username || billingDetails.name || 'Customer',
        email: currentUser?.email || billingDetails.email || '',
        phone: billingDetails.phone || ''
      };

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
        throw new Error(stripeError.message || 'Payment failed');
      }

      let response;
      if (offerData?.type === 'direct_purchase') {
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

      setPaymentStatus('success');
      setTimeout(() => onSuccess(), 1500);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddressChange = (event: any) => {
    if (event.complete) {
      const address = event.value.address;
      setBillingDetails(prev => ({
        ...prev,
        address: {
          line1: address.line1 || '',
          line2: address.line2 || '',
          city: address.city || '',
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country || 'US'
        }
      }));
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
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={billingDetails.name || currentUser?.username || ''}
                onChange={(e) => setBillingDetails(prev => ({ ...prev, name: e.target.value }))}
                className="input-field"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={billingDetails.email || currentUser?.email || ''}
                onChange={(e) => setBillingDetails(prev => ({ ...prev, email: e.target.value }))}
                className="input-field"
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={billingDetails.phone || ''}
                onChange={(e) => setBillingDetails(prev => ({ ...prev, phone: e.target.value }))}
                className="input-field"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Billing Address
              </label>
              <div className="border border-gray-300 rounded-md overflow-hidden">
                <AddressElement 
                  options={{
                    mode: 'billing',
                    allowedCountries: ['US', 'CA', 'GB', 'AU', 'IN'],
                    fields: { phone: 'always' },
                    validation: { phone: { required: 'never' } },
                    defaultValues: {
                      name: billingDetails.name || currentUser?.username || '',
                      phone: billingDetails.phone || '',
                      address: billingDetails.address
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
                wallets: { applePay: 'auto', googlePay: 'auto' },
                fields: {
                  billingDetails: {
                    name: 'auto',
                    email: 'auto',
                    phone: 'auto',
                    address: { country: 'auto', postalCode: 'auto' }
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
          className="btn-cancel"
        >
          <FiX size={16} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success' || isSubmitting}
          className="btn-submit"
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

// CSS Classes
const styles = {
  btnPrimary: "inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200",
  btnSecondary: "inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200",
  searchInput: "block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm sm:text-base",
  filterInput: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm",
  inputField: "w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500",
  btnCancel: "flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm font-medium flex items-center justify-center gap-2",
  btnSubmit: "flex-1 py-3 px-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium shadow-sm hover:shadow disabled:shadow-none"
};

// Apply styles as CSS classes
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  .btn-primary { ${styles.btnPrimary} }
  .btn-secondary { ${styles.btnSecondary} }
  .search-input { ${styles.searchInput} }
  .filter-input { ${styles.filterInput} }
  .input-field { ${styles.inputField} }
  .btn-cancel { ${styles.btnCancel} }
  .btn-submit { ${styles.btnSubmit} }
`;
document.head.appendChild(styleSheet);

export default Browse;