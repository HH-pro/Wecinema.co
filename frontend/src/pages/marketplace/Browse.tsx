import React, { useState, useEffect, useRef } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { 
  FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiAlertCircle, 
  FiLoader, FiUser, FiPlay, FiImage, FiVideo, FiEye, FiHeart,
  FiTrendingUp, FiZap, FiClock, FiShoppingBag, FiTag,
  FiTarget, FiBarChart2, FiDollarSign, FiVideoOff, FiCheckCircle
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import marketplaceApi from '../../api/marketplaceApi';
import VideoPlayerModal from '../../components/marketplae/VideoPlayerModal';
import PaymentModal from '../../components/marketplae/PaymentModal';
import OfferModal from '../../components/marketplae/OfferModal';

// Constants for placeholder images
const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const VIDEO_PLACEHOLDER = 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
const ERROR_IMAGE = 'https://via.placeholder.com/300x200/333333/ffffff?text=Preview+Unavailable';

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
      
      const filteredData = listingsData.filter((listing: Listing) => {
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
            listing.title.toLowerCase().includes(searchLower) ||
            listing.description.toLowerCase().includes(searchLower) ||
            (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchLower)));
          if (!matchesSearch) return false;
        }
        
        if (activeCategory && listing.category !== activeCategory) {
          return false;
        }
        
        if (listing.status !== 'active') return false;
        
        return true;
      });

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
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'price_low':
        return sortedData.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sortedData.sort((a, b) => b.price - a.price);
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
    
    return false;
  };

  const getFirstVideoUrl = (listing: Listing): string => {
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) return '';
    
    const videoUrl = listing.mediaUrls.find(url => isVideoUrl(url));
    
    return videoUrl || '';
  };

  const generateVideoThumbnail = (videoUrl: string): string => {
    if (!videoUrl) return VIDEO_PLACEHOLDER;
    
    if (videoUrl.includes('cloudinary.com') && videoUrl.includes('/video/')) {
      try {
        let thumbnailUrl = videoUrl.replace('/video/upload/', '/image/upload/w_600,h_400,c_fill,q_auto,f_auto/');
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
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }
    
    if (videoUrl.includes('vimeo.com')) {
      const videoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return `https://vumbnail.com/${videoId}.jpg`;
      }
    }
    
    return VIDEO_PLACEHOLDER;
  };

  const getThumbnailUrl = (listing: Listing): string => {
    const listingId = listing._id || 'unknown';
    
    if (imageErrors[listingId]) {
      return ERROR_IMAGE;
    }
    
    if (listing.thumbnail && listing.thumbnail !== '') {
      if (isVideoUrl(listing.thumbnail)) {
        return generateVideoThumbnail(listing.thumbnail);
      }
      return listing.thumbnail;
    }
    
    if (!listing.mediaUrls || listing.mediaUrls.length === 0) {
      return PLACEHOLDER_IMAGE;
    }
    
    const imageUrl = listing.mediaUrls.find(url => 
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) && !isVideoUrl(url)
    );
    
    if (imageUrl) {
      return imageUrl;
    }
    
    const videoUrl = getFirstVideoUrl(listing);
    if (videoUrl) {
      return generateVideoThumbnail(videoUrl);
    }
    
    const firstUrl = listing.mediaUrls[0];
    if (firstUrl) {
      if (isVideoUrl(firstUrl)) {
        return generateVideoThumbnail(firstUrl);
      }
      return firstUrl;
    }
    
    return PLACEHOLDER_IMAGE;
  };

  const handleImageError = (listingId: string) => {
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
      url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)
    );
    
    if (imageUrl) {
      return 'image';
    }
    
    return 'none';
  };

  const getQualityBadge = (quality?: string) => {
    switch (quality?.toLowerCase()) {
      case '4k':
      case 'ultra hd':
        return { color: 'bg-gradient-to-r from-purple-600 to-pink-600', label: '4K' };
      case 'hd':
      case '1080p':
        return { color: 'bg-gradient-to-r from-blue-600 to-cyan-500', label: 'HD' };
      case 'sd':
      case '720p':
        return { color: 'bg-gradient-to-r from-green-600 to-emerald-500', label: 'SD' };
      default:
        return { color: 'bg-gradient-to-r from-gray-600 to-gray-500', label: 'STD' };
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="absolute inset-0 animate-pulse bg-yellow-500 opacity-20 rounded-full blur-xl"></div>
              <div className="relative animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-yellow-500 border-r-yellow-400 mx-auto"></div>
            </div>
            <p className="mt-8 text-white text-xl font-bold tracking-wider">LOADING PREMIUM CONTENT</p>
            <p className="mt-2 text-gray-400 text-sm">Discovering exclusive videos and creative assets</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-black py-8">
        {/* Animated Background Effects */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-yellow-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-600 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse delay-500"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-gradient-to-r from-yellow-900/50 to-amber-900/30 backdrop-blur-xl border-l-4 border-yellow-500 rounded-r-lg shadow-2xl p-6 animate-slideIn">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-600 to-amber-500 flex items-center justify-center animate-pulse">
                    <FiAlertCircle className="text-white" size={24} />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-white text-lg font-bold">⚠️ {error}</p>
                </div>
                <button
                  onClick={() => setError('')}
                  className="text-yellow-300 hover:text-white p-2 hover:bg-yellow-900/50 rounded-lg transition-all"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Header Section */}
          <div className="mb-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full animate-pulse">
                    <span className="text-black text-sm font-bold tracking-wider">PREMIUM MARKETPLACE</span>
                  </div>
                  <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                    <span className="text-yellow-300 text-xs font-bold">⚡ HIGH QUALITY</span>
                  </div>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent animate-gradient">
                    VIDEO VAULT
                  </span>
                </h1>
                <p className="text-gray-300 text-xl max-w-2xl">
                  Premium <span className="text-yellow-400 font-bold">video content</span> from top creators. 
                  Direct downloads, instant access, exclusive rights
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                {marketplaceApi.utils.checkAuth() && (
                  <>
                    <button 
                      onClick={() => navigate('/marketplace/create')}
                      className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <FiPlus className="relative mr-3" size={20} />
                      <span className="relative tracking-wider">UPLOAD VIDEO</span>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-orange-500 to-red-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                    </button>
                    <button 
                      onClick={() => navigate('/marketplace/my-orders')}
                      className="group relative inline-flex items-center justify-center px-6 py-3 border-2 border-yellow-500/50 text-white font-semibold rounded-xl backdrop-blur-sm bg-yellow-900/20 hover:bg-yellow-900/40 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <FiCreditCard className="mr-3" size={18} />
                      MY ORDERS
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-yellow-400/30 rounded-xl transition-all duration-300"></div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Quick Categories */}
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-gray-300">
                <FiFilter className="text-yellow-500" />
                <span className="font-semibold">QUICK FILTERS:</span>
              </div>
              {['All', 'Video', 'Music', 'Animation', 'Templates', 'Scripts'].map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(activeCategory === category.toLowerCase() ? '' : category.toLowerCase());
                    setSearchQuery('');
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 transform hover:scale-105 ${
                    activeCategory === category.toLowerCase()
                      ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black shadow-lg shadow-yellow-500/30'
                      : 'bg-gradient-to-r from-gray-900 to-gray-800 text-gray-300 border border-gray-700 hover:border-yellow-500/50'
                  }`}
                >
                  {category.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="mt-10 max-w-4xl mx-auto relative">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 blur-xl rounded-3xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative flex items-center">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <FiSearch className="text-yellow-400 group-focus-within:text-amber-400 transition-colors duration-300" size={22} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for 4K videos, animations, music, templates..."
                    className="flex-1 pl-14 pr-6 py-5 border-2 border-yellow-500/30 rounded-2xl bg-gray-900/80 backdrop-blur-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-white shadow-xl transition-all duration-300 text-base"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-6 flex items-center text-gray-400 hover:text-white transition-colors"
                    >
                      <FiX size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Simple Stats */}
          <div className="mb-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">{listings.length}</div>
              <div className="text-gray-400 text-sm font-semibold">PREMIUM LISTINGS</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-900/30 to-amber-800/20 backdrop-blur-sm border border-yellow-700/30 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {listings.filter(l => getMediaType(l) === 'video').length}
              </div>
              <div className="text-yellow-300 text-sm font-semibold">VIDEO CONTENT</div>
            </div>
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-800/20 backdrop-blur-sm border border-amber-700/30 rounded-2xl p-6 text-center">
              <div className="text-3xl font-bold text-white mb-2">
                {new Set(listings.map(l => l.sellerId?._id)).size}
              </div>
              <div className="text-amber-300 text-sm font-semibold">CREATORS</div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
            <div className="mb-8 bg-gradient-to-br from-gray-900/80 to-gray-800/50 backdrop-blur-xl border border-gray-700 rounded-3xl shadow-2xl p-8 animate-fadeIn">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-600/20 to-amber-600/20 flex items-center justify-center border border-yellow-500/30">
                    <FiFilter className="text-yellow-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">ADVANCED FILTERS</h3>
                    <p className="text-gray-400 text-sm">Refine your search to find perfect content</p>
                  </div>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 text-sm font-bold text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 rounded-xl border border-gray-600 transition-all duration-300 transform hover:scale-105"
                >
                  CLEAR ALL FILTERS
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-300">
                    <FiShoppingBag className="inline mr-2" />
                    CONTENT TYPE
                  </label>
                  <select 
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full px-4 py-4 border-2 border-yellow-500/30 rounded-xl bg-gray-900/50 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-300"
                  >
                    <option value="" className="bg-gray-900">ALL TYPES</option>
                    <option value="video" className="bg-gray-900">🎥 VIDEO</option>
                    <option value="music" className="bg-gray-900">🎵 MUSIC</option>
                    <option value="animation" className="bg-gray-900">✨ ANIMATION</option>
                    <option value="template" className="bg-gray-900">📁 TEMPLATE</option>
                    <option value="script" className="bg-gray-900">📝 SCRIPT</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-300">
                    <FiTag className="inline mr-2" />
                    QUALITY
                  </label>
                  <select 
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-4 border-2 border-yellow-500/30 rounded-xl bg-gray-900/50 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-300"
                  >
                    <option value="" className="bg-gray-900">ALL QUALITY</option>
                    <option value="4k" className="bg-gray-900">🎬 4K ULTRA HD</option>
                    <option value="hd" className="bg-gray-900">📹 FULL HD</option>
                    <option value="sd" className="bg-gray-900">📽️ STANDARD</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-300">
                    <FiTrendingUp className="inline mr-2" />
                    SORT BY
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-4 py-4 border-2 border-yellow-500/30 rounded-xl bg-gray-900/50 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-300"
                  >
                    <option value="latest">✨ LATEST</option>
                    <option value="popular">🔥 POPULAR</option>
                    <option value="price_low">💰 PRICE: LOW TO HIGH</option>
                    <option value="price_high">💰 PRICE: HIGH TO LOW</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-300">
                    <FiTarget className="inline mr-2" />
                    PRICE RANGE
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        placeholder="MIN"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border-2 border-yellow-500/30 rounded-xl bg-gray-900/50 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-300"
                      />
                    </div>
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        placeholder="MAX"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3 border-2 border-yellow-500/30 rounded-xl bg-gray-900/50 text-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Toggle Filters Button */}
          <div className="flex justify-center mb-8">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="group relative inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold rounded-2xl border border-gray-700 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
            >
              <FiFilter className="mr-3" size={20} />
              {showFilters ? 'HIDE FILTERS' : 'SHOW ADVANCED FILTERS'}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
            </button>
          </div>

          {/* Listings Grid */}
          {listings.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700 p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-yellow-600/20 to-amber-600/20 rounded-full flex items-center justify-center border border-yellow-500/30 shadow-2xl">
                  <FiVideoOff size={48} className="text-yellow-400" />
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  {searchQuery || activeCategory || Object.values(filters).some(Boolean) 
                    ? 'NO CONTENT FOUND' 
                    : 'WELCOME TO VIDEO VAULT!'
                  }
                </h3>
                <p className="text-gray-400 text-lg mb-10">
                  {searchQuery || activeCategory || Object.values(filters).some(Boolean)
                    ? 'Try different filters or browse categories'
                    : 'Upload your first premium video content and start earning!'
                  }
                </p>
                {marketplaceApi.utils.checkAuth() && (
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="group relative inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  >
                    <FiPlus className="mr-3" size={22} />
                    UPLOAD FIRST VIDEO
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map(listing => {
                const thumbnailUrl = getThumbnailUrl(listing);
                const videoUrl = getFirstVideoUrl(listing);
                const mediaType = getMediaType(listing);
                const isVideo = mediaType === 'video';
                const qualityBadge = getQualityBadge(listing.quality);
                
                return (
                  <div 
                    key={listing._id} 
                    className="group relative bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 overflow-hidden hover:-translate-y-2"
                  >
                    {/* Quality Badge */}
                    <div className={`absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full ${qualityBadge.color} text-white text-xs font-bold flex items-center gap-1.5 shadow-lg`}>
                      {qualityBadge.label}
                    </div>
                    
                    {/* Video Indicator */}
                    {isVideo && (
                      <div className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold flex items-center gap-1.5 border border-yellow-500/30">
                        <FiVideo size={10} />
                        VIDEO
                      </div>
                    )}
                    
                    {/* Media Container */}
                    <div className="relative h-64 overflow-hidden">
                      {/* Glow Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-amber-500/5 group-hover:opacity-20 transition-opacity duration-500"></div>
                      
                      {/* Thumbnail with improved loading */}
                      <img
                        src={thumbnailUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        onError={() => handleImageError(listing._id)}
                        loading="lazy"
                        onLoad={(e) => {
                          // Image loaded successfully
                          console.log(`✅ Thumbnail loaded for: ${listing.title}`);
                        }}
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
                      
                      {/* Play Button for Videos */}
                      {isVideo && videoUrl && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('▶️ Play button clicked for:', listing.title, 'URL:', videoUrl);
                            handleVideoClick(videoUrl, listing.title, listing);
                          }}
                          className="absolute inset-0 flex items-center justify-center group/play"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 animate-ping bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full opacity-30"></div>
                            <div className="relative w-20 h-20 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 flex items-center justify-center border-4 border-white/20 shadow-2xl transform group-hover/play:scale-110 transition-all duration-300">
                              <FiPlay className="text-black ml-2" size={28} />
                            </div>
                          </div>
                        </button>
                      )}
                      
                      {/* Price Tag */}
                      <div className="absolute bottom-4 left-4">
                        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold text-lg shadow-2xl">
                          {marketplaceApi.utils.formatCurrency(listing.price)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5">
                      {/* Title and Duration */}
                      <div className="mb-4">
                        <h3 className="font-bold text-white text-lg mb-2 group-hover:text-yellow-400 transition-colors line-clamp-1">
                          {listing.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-gray-800/50 rounded-full text-gray-300 text-xs font-semibold border border-gray-700">
                            {listing.category?.toUpperCase() || 'GENERAL'}
                          </span>
                          <span className="text-gray-400 text-xs flex items-center gap-1">
                            <FiClock size={12} />
                            {listing.duration || 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-gray-400 text-sm mb-5 line-clamp-2">
                        {listing.description}
                      </p>
                      
                      {/* Seller Info */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 p-0.5">
                              {listing.sellerId?.avatar ? (
                                <img 
                                  src={listing.sellerId.avatar} 
                                  alt={listing.sellerId.username}
                                  className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-gray-800 flex items-center justify-center">
                                  <FiUser size={18} className="text-gray-400" />
                                </div>
                              )}
                            </div>
                            {listing.sellerId?.verified && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                                <FiCheckCircle size={10} className="text-black" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-white text-sm font-semibold">
                              {listing.sellerId?.username || 'Anonymous'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {listing.sellerId?.salesCount || 0} sales
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleMakeOffer(listing)}
                          className="flex-1 group/offer relative bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold py-3 rounded-xl transition-all duration-300 overflow-hidden"
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            <FiDollarSign size={16} />
                            BUY NOW
                          </span>
                          <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 to-amber-600 opacity-0 group-hover/offer:opacity-100 transition-opacity duration-300"></div>
                        </button>
                        
                        {isVideo && videoUrl && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVideoClick(videoUrl, listing.title, listing);
                            }}
                            className="px-5 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl border border-gray-700 transition-all duration-300 flex items-center gap-2 group/play"
                          >
                            <FiPlay size={16} className="group-hover/play:scale-110 transition-transform" />
                            PREVIEW
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button */}
          {listings.length > 0 && listings.length >= 12 && (
            <div className="mt-12 text-center">
              <button 
                onClick={fetchListings}
                className="group relative inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold rounded-2xl border border-gray-700 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <FiPlus className="mr-3" size={20} />
                LOAD MORE PREMIUM CONTENT
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
              </button>
            </div>
          )}

          {/* Call to Action Footer */}
          <div className="mt-16 text-center">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-3">
                READY TO ACCESS PREMIUM CONTENT?
              </h2>
              <p className="text-gray-400 text-lg">
                Start downloading premium videos today or upload your own
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/marketplace/create')}
                className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold rounded-2xl shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
              >
                START UPLOADING
              </button>
              <button 
                onClick={() => setShowFilters(true)}
                className="px-10 py-4 bg-gradient-to-r from-gray-800 to-gray-900 text-white font-bold rounded-2xl border border-gray-700 shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 transition-all duration-300"
              >
                BROWSE CATALOG
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