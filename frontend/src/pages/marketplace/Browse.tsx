import React, { useState, useEffect } from 'react';
import ListingCard from '../../components/marketplae/ListingCard';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import emailjs from '@emailjs/browser';

// Initialize EmailJS with your credentials
emailjs.init("MIfBtNPcnoqBFU0LR"); // Replace with your actual EmailJS public key

// Temporary: Stripe test key for development
const stripePromise = loadStripe("pk_test_51SKw7ZHYamYyPYbDUlqbeydcW1hVGrHOvCZ8mBwSU1gw77TIRyzng31iSqAvPIQzTYKG8UWfDew7kdKgBxsw7vtq00WTLU3YCZ");

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
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    sortBy: 'newest'
  });

  const [offerForm, setOfferForm] = useState({
    amount: '',
    message: '',
    requirements: '',
    expectedDelivery: ''
  });

  // Fetch listings on component mount and when filters change
  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      
      const response = await axios.get(
        'http://localhost:3000/marketplace/listings/listings'
      );
      
      let filteredData = response.data;
      
      // Apply local filters
      if (filters.type) {
        filteredData = filteredData.filter((listing: Listing) => listing.type === filters.type);
      }
      
      if (filters.category) {
        filteredData = filteredData.filter((listing: Listing) => 
          listing.category.toLowerCase().includes(filters.category.toLowerCase())
        );
      }
      
      if (filters.minPrice) {
        filteredData = filteredData.filter((listing: Listing) => 
          listing.price >= parseFloat(filters.minPrice)
        );
      }
      
      if (filters.maxPrice) {
        filteredData = filteredData.filter((listing: Listing) => 
          listing.price <= parseFloat(filters.maxPrice)
        );
      }
      
      // Apply sorting
      filteredData = sortListings(filteredData, filters.sortBy);
      
      setListings(filteredData);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Local sorting function
  const sortListings = (data: Listing[], sortBy: string) => {
    const sortedData = [...data];
    
    switch (sortBy) {
      case 'newest':
        return sortedData.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'oldest':
        return sortedData.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'price_low':
        return sortedData.sort((a, b) => a.price - b.price);
      case 'price_high':
        return sortedData.sort((a, b) => b.price - a.price);
      case 'rating':
        return sortedData.sort((a, b) => {
          const ratingA = a.sellerId?.sellerRating || 0;
          const ratingB = b.sellerId?.sellerRating || 0;
          return ratingB - ratingA;
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
  };

  // Function to send email notification to seller
  const sendSellerNotification = async (type: 'offer' | 'direct_purchase', data: any) => {
    try {
      const templateParams = {
        to_email: data.sellerEmail,
        to_name: data.sellerName,
        buyer_name: data.buyerName,
        listing_title: data.listingTitle,
        amount: data.amount,
        message: data.message || 'No message provided',
        expected_delivery: data.expectedDelivery || 'Not specified',
        requirements: data.requirements || 'No specific requirements',
        order_id: data.orderId,
        offer_id: data.offerId,
        type: type,
        date: new Date().toLocaleDateString(),
        dashboard_url: `${window.location.origin}/marketplace/seller/dashboard`
      };

      const serviceID = 'service_pykwrta'; // Replace with your EmailJS service ID
      const templateID = type === 'offer' ? 'template_xtnsrmg' : 'template_h4gtoxd'; // Replace with your template IDs

      await emailjs.send(serviceID, templateID, templateParams);
      
      console.log(`✅ ${type === 'offer' ? 'Offer' : 'Purchase'} notification email sent successfully to seller`);
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      // Don't throw error here - email failure shouldn't block the main flow
    }
  };

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      
      console.log('🔄 Submitting offer with payment...');

      const response = await axios.post(
        `http://localhost:3000/marketplace/offers/make-offer`,
        {
          listingId: selectedListing._id,
          amount: parseFloat(offerForm.amount),
          message: offerForm.message,
          requirements: offerForm.requirements,
          expectedDelivery: offerForm.expectedDelivery
        },
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log('✅ Offer with payment response:', response.data);

      // Check if clientSecret is present
      if (!response.data.clientSecret) {
        throw new Error('No client secret received from server');
      }

      setClientSecret(response.data.clientSecret);
      setOfferData(response.data);
      setShowOfferModal(false);
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error submitting offer with payment:', error);
      setPaymentStatus('failed');
      alert(error.response?.data?.error || error.message || 'Failed to submit offer');
    }
  };

  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;
    
    try {
      setPaymentStatus('processing');
      
      console.log('🔄 Creating direct payment for listing:', listing._id);

      const response = await axios.post(
        `http://localhost:3000/marketplace/offers/create-direct-payment`,
        {
          listingId: listing._id
        },
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log('✅ Direct payment response:', response.data);

      if (!response.data.clientSecret) {
        throw new Error('No client secret received from server');
      }

      setClientSecret(response.data.clientSecret);
      setOfferData({
        amount: listing.price,
        listing: listing,
        type: 'direct_purchase',
        paymentIntentId: response.data.paymentIntentId,
        order: response.data.order
      });
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error creating direct payment:', error);
      setPaymentStatus('failed');
      alert(error.response?.data?.error || error.message || 'Failed to initiate payment');
    }
  };
  
  const handlePaymentSuccess = async () => {
    try {
      // Send email notification based on payment type
      if (offerData?.type === 'direct_purchase') {
        await sendSellerNotification('direct_purchase', {
          sellerEmail: offerData.listing.sellerId?.email, // Make sure seller email is available
          sellerName: offerData.listing.sellerId?.username,
          buyerName: 'Buyer', // You might want to get this from user context
          listingTitle: offerData.listing.title,
          amount: offerData.amount,
          orderId: offerData.order?._id,
          type: 'direct_purchase'
        });
      } else {
        // For offers
        await sendSellerNotification('offer', {
          sellerEmail: offerData.offer?.sellerId?.email,
          sellerName: offerData.offer?.sellerId?.username,
          buyerName: 'Buyer', // You might want to get this from user context
          listingTitle: offerData.offer?.listingId?.title,
          amount: offerData.amount,
          message: offerForm.message,
          expectedDelivery: offerForm.expectedDelivery,
          requirements: offerForm.requirements,
          offerId: offerData.offer?._id,
          type: 'offer'
        });
      }
    } catch (error) {
      console.error('Failed to send notification email:', error);
      // Continue with success flow even if email fails
    }

    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('success');
    
    // Redirect to orders page with success message
    navigate('/marketplace/my-orders', { 
      state: { message: 'Payment completed successfully! Your order has been placed.' } 
    });
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    setSelectedListing(null);
    setClientSecret('');
    setOfferData(null);
    setPaymentStatus('idle');
  };

  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      sortBy: 'newest'
    });
    setSearchQuery('');
  };

  // Filter listings based on search query
  const filteredListings = listings.filter(listing =>
    listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (listing.tags && listing.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  );

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
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
                <p className="mt-2 text-gray-600">
                  Discover and trade amazing video content and scripts
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => navigate('/marketplace/create')}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                >
                  <FiPlus className="mr-2" size={18} />
                  <span className="hidden sm:inline">Create Listing</span>
                  <span className="sm:hidden">Create</span>
                </button>
                
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
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
                  placeholder="Search listings by title, description, or tags..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* Filters Section */}
          {showFilters && (
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
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
                    placeholder="Video, Script, Music..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select 
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200 text-sm"
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
          )}

          {/* Results Count */}
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

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="inline-flex items-center justify-center px-4 py-3 sm:px-6 border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                  >
                    <FiPlus className="mr-2" size={18} />
                    Create First Listing
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xs:grid-cols-1 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredListings.map(listing => (
                <div key={listing._id} className="flex justify-center">
                  <ListingCard
                    listing={listing}
                    onViewDetails={handleViewDetails}
                    onMakeOffer={handleMakeOffer}
                    onDirectPayment={handleDirectPayment}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {filteredListings.length > 0 && filteredListings.length >= 12 && (
            <div className="mt-8 sm:mt-12 text-center">
              <button 
                onClick={fetchListings}
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
              >
                Load more listings
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Offer Modal */}
      {showOfferModal && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-md sm:max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden scale-95 sm:scale-100 transition-transform duration-200 ease-out">
            
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-50 to-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Make an Offer</h3>
                <p className="text-xs text-gray-600">Submit your offer for this listing</p>
              </div>
              <button
                onClick={() => setShowOfferModal(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <FiX size={18} className="text-gray-600" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-3 space-y-4">
              {/* Listing Preview */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm flex items-start gap-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-blue-300 flex-shrink-0">
                  {selectedListing.mediaUrls?.[0] ? (
                    <img
                      src={selectedListing.mediaUrls[0]}
                      alt={selectedListing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <FiPackage className="text-gray-400" size={20} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{selectedListing.title}</h4>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{selectedListing.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-green-600 text-base sm:text-lg font-bold">${selectedListing.price}</span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {selectedListing.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Offer Form */}
              <form onSubmit={handleSubmitOffer} className="space-y-3">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Offer Amount</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    value={offerForm.amount}
                    onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-xs sm:text-sm"
                    placeholder="Enter your offer amount"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Message to Seller</label>
                  <textarea
                    value={offerForm.message}
                    onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-none outline-none text-xs sm:text-sm"
                    rows={3}
                    placeholder="Introduce yourself and explain your requirements..."
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={offerForm.expectedDelivery}
                    onChange={(e) => setOfferForm({ ...offerForm, expectedDelivery: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 outline-none text-xs sm:text-sm"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-xs text-yellow-700 flex gap-2 items-start">
                  <FiCreditCard className="text-yellow-600 mt-0.5" size={14} />
                  <p>
                    Payment will be processed immediately and securely held in escrow until the seller accepts your offer.
                  </p>
                </div>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setShowOfferModal(false)}
                className="flex-1 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all text-xs sm:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitOffer}
                disabled={paymentStatus === 'processing'}
                className="flex-1 py-2 rounded-md bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white transition-all text-xs sm:text-sm font-medium"
              >
                {paymentStatus === 'processing' ? 'Processing...' : `Submit Offer & Pay $${offerForm.amount || '0.00'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="flex items-center justify-between p-4 sm:p-6 border-b">
              <h3 className="text-lg font-semibold">
                {offerData?.type === 'direct_purchase' ? 'Complete Purchase' : 'Complete Offer Payment'}
              </h3>
              <button 
                onClick={handlePaymentClose}
                className="text-gray-400 hover:text-gray-600 p-1"
                disabled={paymentStatus === 'processing'}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-4 sm:p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <FiCreditCard size={16} />
                    <span className="font-semibold text-sm">
                      {offerData?.type === 'direct_purchase' ? 'Purchase Amount' : 'Offer Amount'}: 
                      ${offerData?.amount}
                    </span>
                  </div>
                </div>
                {offerData?.listing && (
                  <p className="text-sm text-yellow-700 mt-2">
                    {offerData.listing.title}
                  </p>
                )}
              </div>

              <Elements stripe={stripePromise} options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                }
              }}>
                <PaymentForm 
                  offerData={offerData}
                  onSuccess={handlePaymentSuccess}
                  onClose={handlePaymentClose}
                  paymentStatus={paymentStatus}
                  setPaymentStatus={setPaymentStatus}
                  sendSellerNotification={sendSellerNotification}
                  offerForm={offerForm}
                />
              </Elements>
            </div>
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
};

// Enhanced Payment Form Component
const PaymentForm = ({ offerData, onSuccess, onClose, paymentStatus, setPaymentStatus, sendSellerNotification, offerForm }: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    setPaymentStatus('processing');
    setError('');

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/payment/success`,
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed');
        setPaymentStatus('failed');
        return;
      }

      // Confirm payment based on type
      if (offerData?.type === 'direct_purchase') {
        // Confirm direct purchase
        await axios.post(
          'http://localhost:3000/marketplace/payments/confirm-payment',
          { 
            orderId: offerData.order._id,
            paymentIntentId: paymentIntent?.id
          },
          { 
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            } 
          }
        );
      } else {
        // Confirm offer payment
        await axios.post(
          'http://localhost:3000/marketplace/offers/confirm-offer-payment',
          { 
            offerId: offerData.offer._id,
            paymentIntentId: paymentIntent?.id
          },
          { 
            headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            } 
          }
        );
      }

      setPaymentStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 1500);

    } catch (err: any) {
      console.error('Payment confirmation error:', err);
      setError(err.response?.data?.error || err.message || 'Payment failed');
      setPaymentStatus('failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-4">
        <PaymentElement 
          options={{
            layout: 'tabs'
          }}
        />
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {paymentStatus === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-700">
            <FiCheck size={16} />
            <span className="text-sm">Payment successful! Redirecting...</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
          className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success'}
          className="flex-1 py-2 px-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center text-sm font-medium"
        >
          {paymentStatus === 'processing' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : paymentStatus === 'success' ? (
            'Success!'
          ) : (
            `Pay $${offerData?.amount}`
          )}
        </button>
      </div>
    </form>
  );
};

export default Browse;