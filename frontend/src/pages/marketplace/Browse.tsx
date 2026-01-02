import React, { useState, useEffect, useRef } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiAlertCircle, 
  FiLoader, FiUser, FiPlay, FiClock, FiShoppingBag, FiTag,
  FiTarget, FiTrendingUp, FiDollarSign, FiEye, FiHeart, FiVideo
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../api/marketplaceApi';
import VideoPlayerModal from '../../components/marketplae/VideoPlayerModal';
import PaymentModal from '../../components/marketplae/PaymentModal';
import OfferModal from '../../components/marketplae/OfferModal';

// Constants for placeholder images - Light theme friendly
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1579546929662-711aa81148cf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const ERROR_IMAGE = 'https://via.placeholder.com/300x200/F3F4F6/6B7280?text=Video+Preview';

const Browse: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [offerData, setOfferData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [showVideoPopup, setShowVideoPopup] = useState<boolean>(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [videoListing, setVideoListing] = useState<Listing | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  
  // New state for image loading errors
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'latest'
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Video player ref
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch listings and user data on component mount
  useEffect(() => {
    fetchListings();
    fetchCurrentUser();
  }, [filters]);

  const fetchCurrentUser = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      if (user) {
        setCurrentUser(user);
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
      
      // ✅ FIXED: Proper params passing to API
      const params: any = {};
      
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.minPrice) params.minPrice = parseFloat(filters.minPrice);
      if (filters.maxPrice) params.maxPrice = parseFloat(filters.maxPrice);
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (searchQuery) params.search = searchQuery;
      
      console.log('📡 Fetching listings with params:', params);

      const response = await marketplaceApi.listings.getAllListings(params);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch listings');
      }

      const listingsData = response.data?.listings || [];
      
      console.log('✅ Listings fetched:', listingsData.length);
      
      // Apply local filtering for active category
      let filteredData = listingsData;
      
      if (activeCategory && activeCategory !== 'all') {
        filteredData = filteredData.filter((listing: Listing) => 
          listing.category?.toLowerCase() === activeCategory.toLowerCase()
        );
      }
      
      // Filter by status - only show active listings
      filteredData = filteredData.filter((listing: Listing) => 
        listing.status === 'active'
      );

      const sortedData = sortListings(filteredData, filters.sortBy);
      
      setListings(sortedData);
      
    } catch (error: any) {
      console.error('Error fetching listings:', error);
      setError(error.message || 'Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sortListings = (data: Listing[], sortBy: string) => {
    const sortedData = [...data];
    
    switch (sortBy) {
      case 'latest':
        return sortedData.sort((a, b) => 
          new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
        );
      case 'price_low':
        return sortedData.sort((a, b) => (a.price || 0) - (b.price || 0));
      case 'price_high':
        return sortedData.sort((a, b) => (b.price || 0) - (a.price || 0));
      case 'popular':
        return sortedData.sort((a, b) => {
          const viewsA = a.views || 0;
          const viewsB = b.views || 0;
          return viewsB - viewsA;
        });
      default:
        return sortedData;
    }
  };

  const handleViewDetails = (listingId: string) => {
    navigate(`/marketplace/listings/${listingId}`);
  };

  const handleMakeOffer = (listing: Listing) => {
    setSelectedListing(listing);
    setOfferForm({
      amount: listing.price.toString(),
      message: '',
      requirements: '',
      expectedDelivery: ''
    });
    setShowOfferModal(true);
    setError('');
  };

  const handleVideoClick = (videoUrl: string, title: string, listing: Listing) => {
    console.log('🎬 Opening video:', videoUrl);
    setSelectedVideo(videoUrl);
    setVideoTitle(title);
    setVideoListing(listing);
    setShowVideoPopup(true);
  };

  const handleCloseVideoPopup = () => {
    setShowVideoPopup(false);
    setSelectedVideo('');
    setVideoTitle('');
    setVideoListing(null);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handleOfferFormChange = (field: string, value: string) => {
    setOfferForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      const response = await marketplaceApi.offers.makeOffer({
        listingId: selectedListing._id,
        amount: parseFloat(offerForm.amount),
        message: offerForm.message,
        requirements: offerForm.requirements,
        expectedDelivery: offerForm.expectedDelivery
      });

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received from server. Please try again.');
      }

      setClientSecret(response.data.clientSecret);
      
      setOfferData({
        ...response.data,
        type: 'offer',
        amount: parseFloat(offerForm.amount),
        offer: response.data.offer
      });
      
      setShowOfferModal(false);
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error submitting offer with payment:', error);
      setPaymentStatus('failed');
      
      const errorMessage = error.message || 
                        error.error || 
                        'Failed to submit offer';
      
      setError(errorMessage);
    }
  };

  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;

    try {
      setPaymentStatus('processing');
      setError('');
      
      const response = await marketplaceApi.offers.createDirectPayment(
        listing._id,
        ''
      );

      if (!response.success || !response.data?.clientSecret) {
        throw new Error(response.error || 'No client secret received from server. Please try again.');
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
      
      const errorMessage = error.message || 
                        error.error || 
                        'Failed to initiate payment';
      
      setError(errorMessage);
    }
  };
  
  const handlePaymentSuccess = async () => {
    try {
      const user = marketplaceApi.utils.getCurrentUser();
      console.log('✅ Payment completed successfully for:', {
        buyerName: user?.username || 'A buyer',
        type: offerData?.type,
        amount: offerData?.amount
      });

    } catch (error) {
      console.error('Error in payment success handling:', error);
    }

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
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('idle');
    setError('');
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'latest'
    });
    setSearchQuery('');
    setActiveCategory('');
    setError('');
  };

  const isVideoUrl = (url: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    
    const videoExtensions = /\.(mp4|mov|avi|wmv|flv|mkv|webm|m4v|ogg|ogv|3gp|3g2)$/i;
    
    if (videoExtensions.test(url)) {
      return true;
    }
    
    if (url.includes('cloudinary.com') && url.includes('/video/')) {
      return true;
    }
    
    // ✅ Check for video URLs in mediaUrls
    if (url.includes('/video/') || url.includes('.mp4') || url.includes('.mov')) {
      return true;
    }
    
    return false;
  };

  const getFirstVideoUrl = (listing: Listing): string => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) return '';
    
    // ✅ First check for video URLs
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    if (videoUrl) return videoUrl;
    
    // ✅ If listing has a videoUrl field
    if (listing.videoUrl && isVideoUrl(listing.videoUrl)) {
      return listing.videoUrl;
    }
    
    return '';
  };

  const generateVideoThumbnail = (videoUrl: string): string => {
    if (!videoUrl) return VIDEO_PLACEHOLDER;
    
    console.log('🔍 Generating thumbnail for:', videoUrl);
    
    if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/')) {
      try {
        let thumbnailUrl = videoUrl.replace('/video/upload/', '/image/upload/w_400,h_225,c_fill,q_auto,f_auto/');
        thumbnailUrl = thumbnailUrl.replace(/\.(mp4|mov|avi|webm)$/i, '.jpg');
        console.log('📸 Generated Cloudinary thumbnail:', thumbnailUrl);
        return thumbnailUrl;
      } catch (error) {
        console.error('Error generating thumbnail:', error);
        return VIDEO_PLACEHOLDER;
      }
    }
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
    
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }
    
    // ✅ For direct video URLs, return placeholder
    if (isVideoUrl(videoUrl)) {
      return VIDEO_PLACEHOLDER;
    }
    
    return videoUrl; // Return the URL itself if it's not a video (might be an image)
  };

  const getThumbnailUrl = (listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    // ✅ FIXED: Check listing.thumbnail first
    if (listing.thumbnail && listing.thumbnail.trim() !== '') {
      console.log('📸 Using listing thumbnail:', listing.thumbnail);
      return listing.thumbnail;
    }
    
    // ✅ Check mediaUrls for images or videos
    if (listing.mediaUrls && listing.mediaUrls.length > 0) {
      // First try to find an image
      const imageUrl = listing.mediaUrls.find(url => 
        url && url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
      );
      
      if (imageUrl) {
        console.log('📸 Found image URL:', imageUrl);
        return imageUrl;
      }
      
      // Then try to find video and generate thumbnail
      const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
      if (videoUrl) {
        const thumbnail = generateVideoThumbnail(videoUrl);
        console.log('📸 Generated video thumbnail:', thumbnail);
        return thumbnail;
      }
      
      // Return first media URL if nothing else works
      const firstUrl = listing.mediaUrls[0];
      if (firstUrl) {
        console.log('📸 Using first media URL:', firstUrl);
        return firstUrl;
      }
    }
    
    console.log('📸 Using default placeholder');
    return VIDEO_PLACEHOLDER;
  };

  const handleImageError = (listingId: string) => {
    console.error('🖼️ Image failed to load for listing:', listingId);
    setImageErrors(prev => ({
      ...prev,
      [listingId]: true
    }));
  };

  const getMediaType = (listing: Listing): 'image' | 'video' | 'none' => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return 'none';
    }
    
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    if (videoUrl) {
      return 'video';
    }
    
    const imageUrl = listing.mediaUrls.find(url => 
      url && url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) {
      return 'image';
    }
    
    return 'none';
  };

  const getQualityBadge = (quality?: string) => {
    if (!quality) return { color: 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-800', label: '' };
    
    switch (quality.toLowerCase()) {
      case '4k':
      case 'ultra hd':
        return { color: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white', label: '4K' };
      case 'hd':
      case '1080p':
        return { color: 'bg-gradient-to-r from-blue-500 to-blue-400 text-white', label: 'HD' };
      default:
        return { color: 'bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-800', label: '' };
    }
  };

  // Handle search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!loading) {
        fetchListings();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center p-4">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 animate-pulse bg-yellow-400 opacity-20 rounded-full blur-xl"></div>
              <div className="relative animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-yellow-500 border-r-amber-500 mx-auto"></div>
            </div>
            <p className="mt-8 text-gray-900 text-xl font-bold tracking-wider">LOADING VIDEO CONTENT</p>
            <p className="mt-2 text-gray-600 text-sm">Discovering premium videos and creative assets</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
        {/* Animated Background Effects - Light version */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse delay-1000"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Error Banner - Light theme */}
          {error && (
            <div className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 backdrop-blur-xl border-l-4 border-yellow-500 rounded-r-lg shadow-lg p-6 animate-slideIn">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-center animate-pulse">
                    <FiAlertCircle className="text-white" size={24} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 text-lg font-bold">⚠️ {error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-yellow-600 hover:text-yellow-800 p-2 hover:bg-yellow-100 rounded-lg transition-all"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section - Clean Light Design */}
          <div className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                  Video Marketplace
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl">
                  Buy and sell premium video content. High-quality videos, instant delivery, commercial rights.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    {/* ✅ FIXED: Yellow-White Gradient Button */}
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="group relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-gray-800 font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 overflow-hidden border border-yellow-200"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                      <FiPlus className="relative mr-2" size={18} />
                      <span className="relative">Upload Video</span>
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                    >
                      <FiCreditCard className="mr-2" size={18} />
                      My Orders
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
                >
                  <FiFilter className="mr-2" size={18} />
                  {showFilters ? 'Hide Filters' : 'Filters'}
                </button>
              </div>
            </div>

            {/* Quick Categories */}
            <div className="mt-8 flex flex-wrap gap-2">
              <div className="flex items-center gap-2 text-gray-600">
                <FiFilter className="text-yellow-500" />
                <span className="font-medium">Browse:</span>
              </div>
              {['All', 'Videos', 'Music', 'Templates', 'Animations', 'Scripts'].map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    const cat = category.toLowerCase();
                    setActiveCategory(activeCategory === cat ? '' : cat);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeCategory === category.toLowerCase()
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-sm'
                      : 'bg-white text-gray-700 border border-gray-200 hover:border-yellow-400'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search Bar - Clean Design */}
            <div className="mt-8 max-w-3xl">
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="text-gray-400 group-focus-within:text-yellow-500 transition-colors" size={20} />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos, music, templates, animations..."
                  className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 shadow-sm hover:shadow transition-all duration-200 text-base"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Simple Stats - Clean Design */}
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900 mb-1">{listings.length}</div>
              <div className="text-gray-600 text-sm font-medium">Total Listings</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {listings.filter(l => getMediaType(l) === 'video').length}
              </div>
              <div className="text-gray-600 text-sm font-medium">Video Content</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 text-center shadow-sm">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {new Set(listings.map(l => l.sellerId?._id)).size}
              </div>
              <div className="text-gray-600 text-sm font-medium">Active Creators</div>
            </div>
          </div>

          {/* Filters Section - FIXED: Videos Category and Price Range */}
          {showFilters && (
            <div className="mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 flex items-center justify-center border border-yellow-100">
                    <FiFilter className="text-yellow-600" size={18} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Filters</h3>
                    <p className="text-gray-600 text-sm">Refine your search results</p>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 rounded-lg border border-yellow-200 transition-all duration-200"
                >
                  Clear all filters
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Content Type
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-300"
                  >
                    <option value="">All Types</option>
                    <option value="video">🎥 Video Content</option>
                    <option value="music">🎵 Music & Audio</option>
                    <option value="animation">✨ Animations</option>
                    <option value="template">📁 Templates</option>
                    <option value="script">📝 Scripts</option>
                    <option value="graphics">🎨 Graphics</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Category
                  </label>
                  <select 
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-300"
                  >
                    <option value="">All Categories</option>
                    <option value="4k">🎬 4K Ultra HD Videos</option>
                    <option value="hd">📹 Full HD Videos</option>
                    <option value="background">🌅 Background Videos</option>
                    <option value="stock">📹 Stock Footage</option>
                    <option value="music">🎵 Background Music</option>
                    <option value="sfx">🔊 Sound Effects</option>
                    <option value="animation">✨ Motion Graphics</option>
                    <option value="ae">🎬 After Effects Templates</option>
                    <option value="premiere">🎥 Premiere Pro Templates</option>
                    <option value="script">📝 Video Scripts</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm transition-all duration-200 bg-white hover:border-gray-300"
                  >
                    <option value="latest">✨ Latest First</option>
                    <option value="popular">🔥 Popular First</option>
                    <option value="price_low">💰 Price: Low to High</option>
                    <option value="price_high">💰 Price: High to Low</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-800">
                    Price Range ($)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Min:</span>
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</div>
                        <input
                          type="number"
                          placeholder="0"
                          value={filters.minPrice}
                          onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">Max:</span>
                      <div className="relative flex-1">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</div>
                        <input
                          type="number"
                          placeholder="1000"
                          value={filters.maxPrice}
                          onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={fetchListings}
                  className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
                <p className="text-gray-800 text-sm font-medium">
                  Showing <span className="text-yellow-700 font-semibold">{listings.length}</span> listings
                  {searchQuery && (
                    <span> for "<span className="text-yellow-700 font-semibold">{searchQuery}</span>"</span>
                  )}
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <FiX size={14} />
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Listings Grid - 3 Videos Per Row */}
          {listings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-full flex items-center justify-center border border-yellow-100 shadow-inner">
                  <FiVideo size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No listings found' 
                    : 'Welcome to Video Marketplace!'
                  }
                </h3>
                <p className="text-gray-600 text-base mb-8">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to upload a video and start selling!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-gray-800 font-semibold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 border border-yellow-200"
                  >
                    <FiPlus className="mr-2" size={18} />
                    Upload Your First Video
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map(listing => {
                const thumbnailUrl = getThumbnailUrl(listing);
                const videoUrl = getFirstVideoUrl(listing);
                const mediaType = getMediaType(listing);
                const isVideo = mediaType === 'video';
                const qualityBadge = getQualityBadge(listing.quality);
                
                return (
                  <div key={listing._id} className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden hover:-translate-y-1">
                    {/* Video Preview Container */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      {/* Thumbnail Image */}
                      <div className="relative w-full h-full">
                        <img
                          src={thumbnailUrl}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={() => handleImageError(listing._id)}
                          loading="lazy"
                          onLoad={() => console.log('✅ Thumbnail loaded:', listing.title)}
                        />
                        
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                        
                        {/* Quality Badge */}
                        {qualityBadge.label && (
                          <div className={`absolute top-3 left-3 z-10 px-2 py-1 rounded ${qualityBadge.color} text-xs font-bold shadow-sm`}>
                            {qualityBadge.label}
                          </div>
                        )}
                        
                        {/* Video Indicator */}
                        {isVideo && (
                          <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded bg-black/60 text-white text-xs font-medium flex items-center gap-1">
                            <FiVideo size={10} />
                            Video
                          </div>
                        )}
                        
                        {/* Play Button Overlay for Videos */}
                        {isVideo && videoUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoClick(videoUrl, listing.title, listing);
                            }}
                            className="absolute inset-0 flex items-center justify-center group/play opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          >
                            <div className="relative">
                              <div className="absolute inset-0 animate-ping bg-yellow-400 rounded-full opacity-20"></div>
                              <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center border-4 border-white/70 shadow-lg transform group-hover/play:scale-110 transition-all duration-300">
                                <FiPlay className="text-white ml-1" size={20} />
                              </div>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 truncate text-sm group-hover:text-yellow-600 transition-colors">
                          {listing.title}
                        </h3>
                      </div>
                      
                      <p className="text-gray-600 text-xs mb-3 line-clamp-2">
                        {listing.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                            {listing.sellerId?.avatar ? (
                              <img 
                                src={listing.sellerId.avatar} 
                                alt={listing.sellerId.username}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/24/F3F4F6/9CA3AF?text=U';
                                }}
                              />
                            ) : (
                              <FiUser size={12} className="text-gray-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-700 truncate max-w-[80px]">
                            {listing.sellerId?.username || 'Seller'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiEye size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-500">{listing.views || 0}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-gray-500">
                          <FiClock className="inline mr-1" size={10} />
                          {listing.duration || 'N/A'}
                        </div>
                        <div className="text-green-600 font-bold text-sm">
                          {marketplaceApi.utils.formatCurrency(listing.price)}
                        </div>
                      </div>
                      
                      {/* ✅ FIXED: Yellow-White Gradient Button */}
                      <button
                        onClick={() => handleMakeOffer(listing)}
                        className="w-full bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-400 text-gray-800 text-sm py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn font-medium border border-yellow-200 shadow-sm hover:shadow"
                      >
                        <FiDollarSign size={14} className="group-hover/btn:scale-110 transition-transform" />
                        Buy Now - {marketplaceApi.utils.formatCurrency(listing.price)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {listings.length > 0 && listings.length >= 12 && (
            <div className="mt-8 text-center">
              <button 
                onClick={fetchListings}
                className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-gray-800 font-medium rounded-lg border border-yellow-200 hover:from-yellow-600 hover:via-yellow-500 hover:to-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 transition-all duration-200 shadow-sm hover:shadow"
              >
                Load more videos
              </button>
            </div>
          )}

          {/* Call to Action Footer */}
          <div className="mt-12 text-center">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Ready to buy or sell premium content?
              </h2>
              <p className="text-gray-600">
                Join thousands of creators and buyers on our platform
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={() => navigate('/marketplace/create')}
                className="px-8 py-3 bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-gray-800 font-semibold rounded-lg border border-yellow-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Selling Videos
              </button>
              <button 
                onClick={() => setShowFilters(true)}
                className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg bg-white hover:bg-gray-50 shadow-sm hover:shadow transition-all duration-200"
              >
                Browse Catalog
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Popup Modal */}
      <VideoPlayerModal
        show={showVideoPopup}
        videoUrl={selectedVideo}
        videoTitle={videoTitle}
        videoThumbnail={videoListing ? getThumbnailUrl(videoListing) : ''}
        onClose={handleCloseVideoPopup}
      />

      {/* Offer Modal */}
      <OfferModal
        show={showOfferModal}
        selectedListing={selectedListing}
        offerForm={offerForm}
        onClose={() => setShowOfferModal(false)}
        onSubmit={handleSubmitOffer}
        onOfferFormChange={handleOfferFormChange}
        paymentStatus={paymentStatus}
        error={error}
        getThumbnailUrl={getThumbnailUrl}
      />

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        clientSecret={clientSecret}
        offerData={offerData}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
        paymentStatus={paymentStatus}
        setPaymentStatus={setPaymentStatus}
        currentUser={currentUser}
        getThumbnailUrl={getThumbnailUrl}
      />
    </MarketplaceLayout>
  );
};

export default Browse;