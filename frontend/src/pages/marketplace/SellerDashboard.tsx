// src/pages/seller/SellerDashboard.tsx
import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { 
  getSellerOrders, 
  getReceivedOffers, 
  checkStripeStatus, 
  createStripeAccount,
  marketplaceAPI,
  updateListingStatus,
  markAsActive,
  markAsInactive,
  toggleVideoStatus,
  deleteMedia,
  deleteListing,
  getVideoDurationFormatted,
  formatBytes,
  canEditListing,
  canDeleteListing,
  canActivateVideo,
  canDeactivateVideo
} from '../../api';
import axios from 'axios';
import { getCurrentUserId } from '../../utilities/helperfFunction';
import StripeSetupModal from '../../components/marketplae/seller/StripeSetupModal';
import OrderCreation from '../../components/marketplae/seller/OrderCreation';
import PaymentStatusBadge from '../../components/marketplae/seller/PaymentStatusBadge';
import StripeAccountStatus from '../../components/marketplae/seller/StripeAccountStatus';
import StatCard from '../../components/marketplae/seller/StatCard';
import UserListings from '../../components/marketplae/seller/UserListings';
import OrderReceivedPage from '../../components/marketplae/seller/OrderReceivedPage';
import OrderDetailsModal from '../../components/marketplae/seller/OrderDetailsModal';
import EditListingModal from '../../components/marketplae/seller/EditListingModal';
import VideoManagementModal from '../../components/marketplae/seller/VideoManagementModal';
import ConfirmationModal from '../../components/marketplae/seller/ConfirmationModal';
import { toast } from 'react-toastify';

const API_BASE_URL = 'http://localhost:3000';

interface StripeStatus {
  connected: boolean;
  status: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  stripeAccountId?: string;
}

interface Order {
  _id: string;
  status: string;
  amount: number;
  buyerId: {
    _id: string;
    username: string;
  };
  listingId: {
    _id: string;
    title: string;
    price?: number;
  };
  createdAt: string;
  paymentMethod: string;
  shippingAddress: string;
  notes?: string;
  stripePaymentIntentId?: string;
  paymentStatus?: string;
}

interface Offer {
  _id: string;
  status: string;
  amount: number;
  message?: string;
  createdAt: string;
  listingId: {
    _id: string;
    title: string;
    price?: number;
  };
  buyerId: {
    _id: string;
    username: string;
  };
}

interface MediaItem {
  _id: string;
  url: string;
  type: 'image' | 'video' | 'document' | 'audio';
  thumbnail?: string;
  duration?: number;
  fileSize?: number;
  filename?: string;
  mimeType?: string;
  resolution?: string;
  isActive?: boolean;
  isPrimary?: boolean;
  isPreview?: boolean;
  order?: number;
}

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  category: string;
  status: 'draft' | 'active' | 'inactive' | 'sold' | 'pending_review';
  mediaUrls: MediaItem[];
  isVideoListing: boolean;
  videoStatus?: 'active' | 'processing' | 'deactivated' | 'failed';
  primaryVideo?: {
    url: string;
    thumbnail: string;
    duration: number;
    quality: string;
  };
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  favoriteCount?: number;
  purchaseCount?: number;
  stockQuantity?: number;
}

interface ListingsData {
  listings: Listing[];
  user: {
    _id: string;
    username: string;
  };
}

const SellerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [listingsData, setListingsData] = useState<ListingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [showOrderCreation, setShowOrderCreation] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // New states for listing management
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<string | null>(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [currentListingForVideo, setCurrentListingForVideo] = useState<Listing | null>(null);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount || 0);
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'completed':
      case 'accepted':
      case 'active':
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'pending_payment':
      case 'pending_acceptance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'shipped':
      case 'sold':
      case 'in_progress':
      case 'in_transit':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
      case 'rejected':
      case 'inactive':
      case 'failed':
      case 'declined':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Stats calculation
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(order => 
    order.status === 'pending_payment' || 
    order.paymentStatus === 'pending' ||
    order.status === 'pending_acceptance'
  ).length;
  const completedOrders = orders.filter(order => order.status === 'completed').length;
  const totalRevenue = orders
    .filter(order => order.status === 'completed' || order.paymentStatus === 'paid')
    .reduce((sum, order) => sum + order.amount, 0);
  const pendingOffers = offers.filter(offer => offer.status === 'pending').length;
  
  // Listings stats
  const totalListings = listingsData?.listings?.length || 0;
  const activeListings = listingsData?.listings?.filter((listing) => listing.status === 'active').length || 0;
  const soldListings = listingsData?.listings?.filter((listing) => listing.status === 'sold').length || 0;
  const draftListings = listingsData?.listings?.filter((listing) => listing.status === 'draft').length || 0;
  const videoListings = listingsData?.listings?.filter((listing) => listing.isVideoListing).length || 0;

  useEffect(() => {
    console.log('🎯 SellerDashboard mounted');
    fetchDashboardData();
    checkStripeAccountStatus();
    handleStripeReturn();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');

      const currentUserId = getCurrentUserId();
      console.log('👤 Current User ID:', currentUserId);

      if (!currentUserId) {
        setError('User not authenticated. Please log in again.');
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      const [ordersResponse, offersResponse, listingsResponse] = await Promise.allSettled([
        // Fetch orders
        (async () => {
          try {
            console.log('📦 Fetching seller orders from /marketplace/my-sales');
            const response = await axios.get(
              `${API_BASE_URL}/marketplace/my-sales`,
              {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
              }
            );
            
            console.log('✅ Orders API Response:', {
              success: response.data.success,
              salesCount: response.data.sales?.length,
              data: response.data
            });
            
            if (response.data.success && response.data.sales) {
              return response.data.sales;
            }
            
            return response.data.data || response.data.orders || [];
          } catch (err: any) {
            console.error('❌ Error fetching orders:', err.response?.data || err.message);
            
            try {
              console.log('🔄 Trying fallback API function getSellerOrders()');
              const fallback = await getSellerOrders();
              console.log('Fallback response:', fallback);
              return Array.isArray(fallback) ? fallback : (fallback?.data || fallback?.sales || []);
            } catch (fallbackErr) {
              console.error('Fallback also failed:', fallbackErr);
              return [];
            }
          }
        })(),
        
        // Fetch offers
        (async () => {
          try {
            const offers = await getReceivedOffers();
            return Array.isArray(offers) ? offers : (offers?.data || []);
          } catch (err) {
            console.error('Error fetching offers:', err);
            return [];
          }
        })(),
        
        // Fetch listings with enhanced data
        (async () => {
          try {
            const response = await axios.get(
              `${API_BASE_URL}/marketplace/listings/user/${currentUserId}/listings`,
              {
                params: { 
                  page: 1, 
                  limit: 1000,
                  includeMedia: true,
                  includeStats: true 
                },
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
              }
            );
            console.log('📝 Listings fetched successfully');
            return response.data;
          } catch (err) {
            console.log('Listings fetch failed, continuing without listings data');
            return null;
          }
        })()
      ]);

      // Process orders response
      let ordersData = [];
      if (ordersResponse.status === 'fulfilled') {
        const result = ordersResponse.value;
        ordersData = Array.isArray(result) ? result : [];
      }

      // Process offers response
      let offersData = [];
      if (offersResponse.status === 'fulfilled') {
        const result = offersResponse.value;
        offersData = Array.isArray(result) ? result : [];
      }

      // Process listings response
      if (listingsResponse.status === 'fulfilled' && listingsResponse.value?.success) {
        setListingsData(listingsResponse.value);
      }

      setOrders(ordersData);
      setOffers(offersData);
      
      console.log('✅ Dashboard data loaded:', {
        orders: ordersData.length,
        offers: offersData.length,
        listings: listingsData?.listings?.length || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      console.log('🔄 Checking Stripe account status...');
      setDebugInfo('Checking Stripe status...');
      
      const response = await checkStripeStatus();
      console.log('✅ Stripe status response:', response);
      setStripeStatus(response);
      
      setDebugInfo(`Stripe Status: ${response.connected ? 'Connected' : 'Not Connected'}, Charges Enabled: ${response.chargesEnabled}`);
      
      if (response.connected && response.chargesEnabled) {
        setShowStripeSetup(false);
        console.log('🎉 Stripe is connected and active - hiding setup modal');
      } else {
        console.log('ℹ️ Stripe not fully setup:', response);
      }
    } catch (err) {
      console.error('❌ Error checking Stripe status:', err);
      setStripeStatus({ 
        connected: false, 
        status: 'error',
        chargesEnabled: false 
      });
      setDebugInfo('Error checking Stripe status');
    }
  };

  const handleStripeReturn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const stripeStatus = urlParams.get('stripe');
    const accountId = urlParams.get('account_id');
    
    console.log('🔍 Checking URL params for Stripe return:', {
      stripeStatus,
      accountId,
      fullUrl: window.location.href
    });
    
    if (stripeStatus === 'success') {
      console.log('🎉 Returned from Stripe onboarding - refreshing status');
      setSuccessMessage('Stripe account setup completed successfully!');
      
      setTimeout(() => {
        checkStripeAccountStatus();
        fetchDashboardData();
        
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        console.log('🧹 Cleaned URL after Stripe return');
      }, 3000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setDebugInfo('Refreshing dashboard...');
    await Promise.all([
      fetchDashboardData(),
      checkStripeAccountStatus()
    ]);
    setRefreshing(false);
    setDebugInfo('Dashboard refreshed');
  };

  const handleDebugStripe = async () => {
    try {
      setDebugInfo('Running debug check...');
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const response = await axios.get(
        `${API_BASE_URL}/marketplace/stripe/debug-stripe-status`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      console.log('🔧 Debug Stripe Status:', response.data);
      setDebugInfo(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('Debug error:', error);
      setDebugInfo('Debug failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleViewListingDetails = (listingId: string) => {
    window.location.href = `/listings/${listingId}`;
  };

  // Function to handle order view
  const handleViewOrderDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderModal(true);
  };

  // ✅ NEW: Handle listing edit
  const handleEditListing = (listing: Listing) => {
    setSelectedListing(listing);
    setShowEditModal(true);
  };

  // ✅ NEW: Handle video management
  const handleManageVideos = (listing: Listing) => {
    setCurrentListingForVideo(listing);
    setShowVideoModal(true);
  };

  // ✅ NEW: Handle listing deletion confirmation
  const handleDeleteListing = (listingId: string) => {
    setDeletingListingId(listingId);
    setShowDeleteConfirm(true);
  };

  // ✅ NEW: Confirm listing deletion
  const confirmDeleteListing = async () => {
    if (!deletingListingId) return;
    
    try {
      setProcessingAction('deleting');
      await deleteListing(deletingListingId, setProcessingAction);
      toast.success('Listing deleted successfully!');
      
      // Update listings data
      if (listingsData) {
        const updatedListings = listingsData.listings.filter(
          listing => listing._id !== deletingListingId
        );
        setListingsData({
          ...listingsData,
          listings: updatedListings
        });
      }
      
      setShowDeleteConfirm(false);
      setDeletingListingId(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete listing');
    } finally {
      setProcessingAction(null);
    }
  };

  // ✅ NEW: Handle media deletion
  const handleDeleteMedia = async (listingId: string, mediaId: string) => {
    try {
      setProcessingAction('deleting-media');
      await deleteMedia(listingId, mediaId, setProcessingAction);
      toast.success('Media deleted successfully!');
      
      // Update listings data
      if (listingsData) {
        const updatedListings = listingsData.listings.map(listing => {
          if (listing._id === listingId) {
            const updatedMedia = listing.mediaUrls.filter(media => media._id !== mediaId);
            const isVideoListing = updatedMedia.some(media => media.type === 'video');
            return {
              ...listing,
              mediaUrls: updatedMedia,
              isVideoListing
            };
          }
          return listing;
        });
        setListingsData({
          ...listingsData,
          listings: updatedListings
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete media');
    } finally {
      setProcessingAction(null);
    }
  };

  // ✅ NEW: Handle video activation/deactivation
  const handleToggleVideoStatus = async (listingId: string, status: 'activated' | 'deactivated') => {
    try {
      setProcessingAction('toggling-video');
      await toggleVideoStatus(listingId, status, setProcessingAction);
      
      const message = status === 'activated' 
        ? 'Video activated successfully!' 
        : 'Video deactivated successfully!';
      toast.success(message);
      
      // Update listings data
      if (listingsData) {
        const updatedListings = listingsData.listings.map(listing => {
          if (listing._id === listingId) {
            return {
              ...listing,
              videoStatus: status === 'activated' ? 'active' : 'deactivated',
              mediaUrls: listing.mediaUrls.map(media => ({
                ...media,
                isActive: media.type === 'video' ? status === 'activated' : media.isActive
              }))
            };
          }
          return listing;
        });
        setListingsData({
          ...listingsData,
          listings: updatedListings
        });
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update video status');
    } finally {
      setProcessingAction(null);
    }
  };

  // ✅ NEW: Handle listing status update
  const handleUpdateListingStatus = async (listingId: string, status: 'active' | 'inactive') => {
    try {
      setProcessingAction('updating-status');
      
      if (status === 'active') {
        await markAsActive(listingId, setProcessingAction);
      } else {
        await markAsInactive(listingId, setProcessingAction);
      }
      
      toast.success(`Listing ${status === 'active' ? 'activated' : 'deactivated'} successfully!`);
      
      // Update listings data
      if (listingsData) {
        const updatedListings = listingsData.listings.map(listing => {
          if (listing._id === listingId) {
            return {
              ...listing,
              status
            };
          }
          return listing;
        });
        setListingsData({
          ...listingsData,
          listings: updatedListings
        });
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${status === 'active' ? 'activate' : 'deactivate'} listing`);
    } finally {
      setProcessingAction(null);
    }
  };

  // ✅ NEW: Handle listing update from edit modal
  const handleListingUpdated = (updatedListing: Listing) => {
    if (listingsData) {
      const updatedListings = listingsData.listings.map(listing => 
        listing._id === updatedListing._id ? updatedListing : listing
      );
      setListingsData({
        ...listingsData,
        listings: updatedListings
      });
    }
    setShowEditModal(false);
    setSelectedListing(null);
  };

  // Function to handle order update from modal
  const handleOrderUpdateFromModal = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(order => 
      order._id === orderId ? { ...order, status: newStatus } : order
    ));
    handleOrderUpdate(orderId, newStatus);
  };

  // ✅ IMPROVED: Accept offer with better error handling
  const handleOfferAction = async (offerId: string, action: string) => {
    try {
      setError('');
      setSuccessMessage('');
      
      const offer = offers.find(o => o._id === offerId);
      if (!offer) {
        setError('Offer not found');
        return;
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      if (action === 'accept') {
        try {
          const response = await axios.put(
            `${API_BASE_URL}/marketplace/offers/accept-offer/${offerId}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            }
          );

          if (response.data.success) {
            setSuccessMessage('Offer accepted successfully! Buyer will now complete payment.');
            console.log('✅ Offer accepted:', response.data);
            
            setOffers(prev => prev.map(o => 
              o._id === offerId ? { ...o, status: 'accepted' } : o
            ));
            
            if (response.data.order) {
              setOrders(prev => [response.data.order, ...prev]);
            }
            
            setTimeout(() => {
              fetchDashboardData();
            }, 1000);
          }
        } catch (err: any) {
          console.error('Error accepting offer:', err);
          const errorMessage = err.response?.data?.error || 
                             err.response?.data?.details || 
                             err.message || 
                             'Failed to accept offer';
          setError(errorMessage);
        }
      } else {
        try {
          const response = await axios.put(
            `${API_BASE_URL}/marketplace/offers/reject-offer/${offerId}`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 10000
            }
          );

          if (response.data.success) {
            setSuccessMessage('Offer rejected successfully');
            setOffers(prev => prev.map(o => 
              o._id === offerId ? { ...o, status: 'rejected' } : o
            ));
          }
        } catch (err: any) {
          console.error('Error rejecting offer:', err);
          const errorMessage = err.response?.data?.error || 
                             err.response?.data?.details || 
                             err.message || 
                             'Failed to reject offer';
          setError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Error updating offer:', error);
      setError(error.message || 'Failed to update offer');
    }
  };

  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    fetchDashboardData();
  };

  const handleOrderUpdate = async (orderId: string, newStatus: string) => {
    try {
      console.log(`Updating order ${orderId} to ${newStatus}`);
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating order:', error);
      setError('Failed to update order');
    }
  };

  const handleStripeSetupSuccess = () => {
    console.log('✅ Stripe setup success handler called');
    setShowStripeSetup(false);
    setSuccessMessage('Stripe account setup completed!');
    setTimeout(() => {
      checkStripeAccountStatus();
      fetchDashboardData();
    }, 2000);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      timers.push(timer);
    }
    
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 8000);
      timers.push(timer);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [successMessage, error]);

  // ✅ NEW: Render media preview component
  const renderMediaPreview = (media: MediaItem) => {
    if (media.type === 'video') {
      return (
        <div className="relative group">
          <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
            {media.thumbnail ? (
              <img 
                src={media.thumbnail} 
                alt={media.filename || 'Video thumbnail'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
              {getVideoDurationFormatted(media.duration || 0)}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-600 truncate">
              {media.filename || 'Video'}
            </span>
            {media.isActive ? (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Active</span>
            ) : (
              <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Inactive</span>
            )}
          </div>
        </div>
      );
    } else if (media.type === 'image') {
      return (
        <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
          <img 
            src={media.url} 
            alt={media.filename || 'Image'}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return null;
  };

  // ✅ NEW: Render listing card with actions
  const renderListingCard = (listing: Listing) => {
    const primaryMedia = listing.mediaUrls.find(media => media.isPrimary) || listing.mediaUrls[0];
    const videoCount = listing.mediaUrls.filter(media => media.type === 'video').length;
    const isEditable = canEditListing(listing.status);
    const isDeletable = canDeleteListing(listing.status);
    
    return (
      <div key={listing._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        {/* Listing Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg truncate">{listing.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{listing.category}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(listing.status)}`}>
                {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
              </span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(listing.price)}</span>
            </div>
          </div>
        </div>

        {/* Media Preview */}
        <div className="p-4">
          {primaryMedia ? (
            <div className="mb-4">
              {renderMediaPreview(primaryMedia)}
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-gray-400">No media</span>
            </div>
          )}
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{listing.viewCount || 0}</div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-yellow-600">{listing.favoriteCount || 0}</div>
              <div className="text-xs text-gray-600">Favorites</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{listing.purchaseCount || 0}</div>
              <div className="text-xs text-gray-600">Sales</div>
            </div>
          </div>

          {/* Video Status (if applicable) */}
          {listing.isVideoListing && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="text-sm font-medium text-blue-900">
                    {videoCount} video{videoCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  listing.videoStatus === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {listing.videoStatus || 'Inactive'}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleViewListingDetails(listing._id)}
              className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </button>
            
            {isEditable && (
              <button
                onClick={() => handleEditListing(listing)}
                className="flex-1 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            
            {listing.isVideoListing && (
              <button
                onClick={() => handleManageVideos(listing)}
                className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Videos
              </button>
            )}
            
            {isDeletable && (
              <button
                onClick={() => handleDeleteListing(listing._id)}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center"
                disabled={processingAction === 'deleting'}
              >
                {processingAction === 'deleting' && deletingListingId === listing._id ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            )}
          </div>

          {/* Status Toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Listing Status:</span>
              <div className="flex space-x-2">
                {listing.status === 'active' ? (
                  <button
                    onClick={() => handleUpdateListingStatus(listing._id, 'inactive')}
                    className="text-sm bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1 rounded-lg transition-colors"
                    disabled={processingAction === 'updating-status'}
                  >
                    {processingAction === 'updating-status' ? 'Processing...' : 'Deactivate'}
                  </button>
                ) : listing.status === 'inactive' ? (
                  <button
                    onClick={() => handleUpdateListingStatus(listing._id, 'active')}
                    className="text-sm bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1 rounded-lg transition-colors"
                    disabled={processingAction === 'updating-status'}
                  >
                    {processingAction === 'updating-status' ? 'Processing...' : 'Activate'}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600 font-medium">Loading dashboard...</p>
            <p className="text-sm text-gray-500 mt-2">Getting your seller information...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
                <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleDebugStripe}
                  className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Debug Stripe</span>
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg 
                    className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Debug Info */}
          {debugInfo && (
            <div className="mb-4 bg-gray-100 border border-gray-300 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Debug Info:</span>
                <button 
                  onClick={() => setDebugInfo('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <pre className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Alert */}
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

          {/* Stripe Status */}
          <StripeAccountStatus 
            stripeStatus={stripeStatus}
            onSetupClick={() => setShowStripeSetup(true)}
          />

          {/* Navigation Tabs */}
          <div className="mb-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'offers', label: 'Offers', icon: '💼', badge: pendingOffers },
                { id: 'listings', label: 'My Listings', icon: '🏠', badge: totalListings },
                { id: 'orders', label: 'Orders Received', icon: '📦', badge: totalOrders }
              ].map(({ id, label, icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center whitespace-nowrap transition-all duration-200 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{icon}</span>
                  {label}
                  {badge !== undefined && badge > 0 && (
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
              onSuccess={handleStripeSetupSuccess}
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

          {/* Order Details Modal */}
          {selectedOrderId && (
            <OrderDetailsModal
              orderId={selectedOrderId}
              isOpen={showOrderModal}
              onClose={() => {
                setShowOrderModal(false);
                setSelectedOrderId(null);
              }}
              onOrderUpdate={handleOrderUpdateFromModal}
            />
          )}

          {/* Edit Listing Modal */}
          {showEditModal && selectedListing && (
            <EditListingModal
              listing={selectedListing}
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setSelectedListing(null);
              }}
              onListingUpdated={handleListingUpdated}
            />
          )}

          {/* Video Management Modal */}
          {showVideoModal && currentListingForVideo && (
            <VideoManagementModal
              listing={currentListingForVideo}
              isOpen={showVideoModal}
              onClose={() => {
                setShowVideoModal(false);
                setCurrentListingForVideo(null);
              }}
              onVideoStatusToggle={handleToggleVideoStatus}
              onMediaDelete={handleDeleteMedia}
            />
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <ConfirmationModal
              isOpen={showDeleteConfirm}
              onClose={() => {
                setShowDeleteConfirm(false);
                setDeletingListingId(null);
              }}
              onConfirm={confirmDeleteListing}
              title="Delete Listing"
              message="Are you sure you want to delete this listing? This action cannot be undone."
              confirmText={processingAction === 'deleting' ? 'Deleting...' : 'Delete'}
              cancelText="Cancel"
              isDanger={true}
              isLoading={processingAction === 'deleting'}
            />
          )}

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
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
                  title="Video Listings"
                  value={videoListings}
                  icon="🎬"
                  color="purple"
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

              {/* Recent Orders & Quick Actions */}
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
                          <p className="text-sm text-gray-400 mt-1">Start selling to see your orders here</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {orders.slice(0, 5).map(order => (
                            <div 
                              key={order._id} 
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-blue-50 transition-colors cursor-pointer"
                              onClick={() => handleViewOrderDetails(order._id)}
                            >
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
                                    {order.status ? order.status.replace('_', ' ') : 'unknown'}
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
                      {!(stripeStatus?.connected && stripeStatus?.chargesEnabled) && (
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
                        onClick={() => setActiveTab('listings')}
                        className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-medium py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Manage Listings
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
                        <span>Upload high-quality photos and videos</span>
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
                        <span>Use video previews to showcase products</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Received Offers</h2>
                  <p className="text-sm text-gray-600 mt-1">Manage and respond to offers from buyers</p>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
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
                              Received {new Date(offer.createdAt).toLocaleDateString()}
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

                        {/* Show info for accepted offers */}
                        {offer.status === 'accepted' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-green-800 text-sm">
                                  Offer accepted! Waiting for buyer to complete payment.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show info for rejected offers */}
                        {offer.status === 'rejected' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <p className="text-red-800 text-sm">
                                  Offer declined.
                                </p>
                              </div>
                            </div>
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
            <div className="space-y-6">
              {/* Listings Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 p-3 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Listings</p>
                      <p className="text-2xl font-bold text-gray-900">{totalListings}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="bg-green-100 p-3 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Active</p>
                      <p className="text-2xl font-bold text-gray-900">{activeListings}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="bg-purple-100 p-3 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Video Listings</p>
                      <p className="text-2xl font-bold text-gray-900">{videoListings}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="bg-yellow-100 p-3 rounded-lg mr-4">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Draft</p>
                      <p className="text-2xl font-bold text-gray-900">{draftListings}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Listings Grid */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
                    <p className="text-sm text-gray-600 mt-1">Manage your products and services</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                      onClick={() => window.location.href = '/create-listing'}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Listing
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  {listingsData?.listings?.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🏠</div>
                      <h3 className="text-lg font-medium text-gray-900">No listings yet</h3>
                      <p className="mt-2 text-gray-500">Create your first listing to start selling on the marketplace.</p>
                      <button
                        onClick={() => window.location.href = '/create-listing'}
                        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200"
                      >
                        Create Your First Listing
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {listingsData?.listings?.map(listing => renderListingCard(listing))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <OrderReceivedPage 
              orders={orders}
              onOrderUpdate={handleOrderUpdate}
              onViewOrderDetails={handleViewOrderDetails}
            />
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;