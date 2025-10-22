import React, { useState, useEffect } from 'react';
import ListingCard from '../../components/marketplae/ListingCard';
import MarketplaceLayout from '../../components/Layout';
import { Listing } from '../../types/marketplace';
import { FiFilter, FiPlus, FiSearch, FiX, FiCreditCard, FiArrowRight, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

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

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedListing) return;

    try {
      setPaymentStatus('processing');
      
      console.log('🔄 Submitting offer with data:', {
        listingId: selectedListing._id,
        ...offerForm
      });

      const response = await axios.post(
        `http://localhost:3000/marketplace/offers/submit`,
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

      console.log('✅ Offer submission response:', response.data);

      // Check if clientSecret is present in response
      if (!response.data.clientSecret) {
        throw new Error('No client secret received from server');
      }

      setClientSecret(response.data.clientSecret);
      setOfferData(response.data);
      setShowOfferModal(false);
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error submitting offer:', error);
      setPaymentStatus('failed');
      alert(error.response?.data?.error || error.message || 'Failed to submit offer');
    }
  };

  const handleDirectPayment = async (listing: Listing) => {
    if (!listing._id) return;
    
    try {
      setPaymentStatus('processing');
      
      console.log('🔄 Creating direct payment for listing:', listing._id);

      // Create direct payment intent for immediate purchase
      const response = await axios.post(
        `http://localhost:3000/marketplace/payments/create-payment-intent`,
        {
          listingId: listing._id,
          amount: listing.price
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
        paymentIntentId: response.data.paymentIntentId
      });
      setShowPaymentModal(true);
      setPaymentStatus('idle');
      
    } catch (error: any) {
      console.error('❌ Error creating payment:', error);
      setPaymentStatus('failed');
      alert(error.response?.data?.error || error.message || 'Failed to initiate payment');
    }
  };

  const handlePaymentSuccess = () => {
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
          {/* Header and filters section remains same */}
          {/* ... */}

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <FiSearch size={32} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery || Object.values(filters).some(Boolean) 
                    ? 'No listings found' 
                    : 'No listings yet'
                  }
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || Object.values(filters).some(Boolean)
                    ? 'Try adjusting your search or filters to find what you\'re looking for.'
                    : 'Be the first to create a listing and start trading!'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={() => navigate('/marketplace/create')}
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                  >
                    <FiPlus className="mr-2" size={18} />
                    Create First Listing
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
              {filteredListings.map(listing => (
                <ListingCard
                  key={listing._id}
                  listing={listing}
                  onViewDetails={handleViewDetails}
                  onMakeOffer={handleMakeOffer}
                  onDirectPayment={handleDirectPayment}
                />
              ))}
            </div>
          )}

          {/* Load More */}
          {filteredListings.length > 0 && filteredListings.length >= 12 && (
            <div className="mt-12 text-center">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Make an Offer</h3>
              <button 
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitOffer} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900">{selectedListing.title}</h4>
                <p className="text-sm text-gray-600">Listed Price: ${selectedListing.price}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offer Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={offerForm.amount}
                  onChange={(e) => setOfferForm({ ...offerForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Enter your offer amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message to Seller
                </label>
                <textarea
                  value={offerForm.message}
                  onChange={(e) => setOfferForm({ ...offerForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows="3"
                  placeholder="Introduce yourself and your requirements..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Detailed Requirements
                </label>
                <textarea
                  required
                  value={offerForm.requirements}
                  onChange={(e) => setOfferForm({ ...offerForm, requirements: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows="4"
                  placeholder="Describe exactly what you need..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  required
                  value={offerForm.expectedDelivery}
                  onChange={(e) => setOfferForm({ ...offerForm, expectedDelivery: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <FiCreditCard />
                  <span className="font-semibold">Payment Required</span>
                </div>
                <p className="text-sm text-yellow-700">
                  Your offer will be submitted and payment will be processed immediately. The funds will be held securely until the seller accepts your offer.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOfferModal(false)}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentStatus === 'processing'}
                  className="flex-1 py-2 px-4 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 transition-colors flex items-center justify-center"
                >
                  {paymentStatus === 'processing' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Submit Offer & Pay <FiArrowRight className="ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && clientSecret && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                {offerData?.type === 'direct_purchase' ? 'Complete Purchase' : 'Complete Offer Payment'}
              </h3>
              <button 
                onClick={handlePaymentClose}
                className="text-gray-400 hover:text-gray-600"
                disabled={paymentStatus === 'processing'}
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <FiCreditCard />
                    <span className="font-semibold">
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
const PaymentForm = ({ offerData, onSuccess, onClose, paymentStatus, setPaymentStatus }: any) => {
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

      // If payment requires action, Stripe will handle redirect
      if (paymentIntent?.status === 'requires_action') {
        return; // Stripe will redirect to 3D Secure or other authentication
      }

      // Confirm payment on backend
      const endpoint = offerData?.type === 'direct_purchase' 
        ? 'http://localhost:3000/marketplace/payments/confirm-purchase'
        : 'http://localhost:3000/marketplace/offers/confirm-payment';

      const response = await axios.post(
        endpoint,
        { 
          ...(offerData?.type === 'direct_purchase' 
            ? { 
                listingId: offerData.listing._id, 
                paymentIntentId: paymentIntent?.id,
                amount: offerData.amount
              }
            : { 
                offerId: offerData.offer._id, 
                paymentIntentId: paymentIntent?.id,
                amount: offerData.amount
              }
          )
        },
        { 
          headers: { 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success) {
        setPaymentStatus('success');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        throw new Error(response.data.error || 'Payment confirmation failed');
      }

    } catch (err: any) {
      console.error('Payment error:', err);
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
            <FiCheck />
            <span>Payment successful! Redirecting...</span>
          </div>
        </div>
      )}
      
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={paymentStatus === 'processing' || paymentStatus === 'success'}
          className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || paymentStatus === 'processing' || paymentStatus === 'success'}
          className="flex-1 py-3 px-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-md transition-colors flex items-center justify-center"
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