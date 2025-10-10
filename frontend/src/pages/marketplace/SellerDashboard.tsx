import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import OrderSummary from '../../components/marketplae/OrderSummary';
import { getMyListings } from '../../api';

// ... interfaces same as before ...

const SellerDashboard: React.FC = () => {
  // ... state variables same as before ...

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      console.log('Fetching dashboard data...');
      
      // Sirf listings fetch karo with detailed logging
      const listingsData = await getMyListings(setLoading);
      console.log('Listings API Response:', listingsData);
      
      // Response structure debug karo
      let listingsArray: Listing[] = [];
      
      if (Array.isArray(listingsData)) {
        console.log('Listings data is array, length:', listingsData.length);
        listingsArray = listingsData;
      } else if (listingsData && listingsData.listings) {
        console.log('Listings data has listings property:', listingsData.listings.length);
        listingsArray = listingsData.listings;
      } else if (listingsData && listingsData.data) {
        console.log('Listings data has data property:', listingsData.data.length);
        listingsArray = listingsData.data;
      } else {
        console.log('Listings data structure:', listingsData);
        // Try to find array in response
        if (listingsData && typeof listingsData === 'object') {
          const keys = Object.keys(listingsData);
          console.log('Available keys in response:', keys);
          
          // Koi bhi array property find karo
          for (const key of keys) {
            if (Array.isArray(listingsData[key])) {
              console.log(`Found array in key "${key}":`, listingsData[key]);
              listingsArray = listingsData[key];
              break;
            }
          }
        }
      }
      
      console.log('Final listings array:', listingsArray);
      setListings(listingsArray);

      // Orders aur offers ko optional banayein
      let ordersArray: Order[] = [];
      let offersArray: Offer[] = [];

      try {
        console.log('Fetching orders...');
        const ordersResponse = await fetch('/marketplace/orders/seller-orders', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        console.log('Orders response status:', ordersResponse.status);
        if (ordersResponse.ok) {
          const ordersData = await ordersResponse.json();
          console.log('Orders API Response:', ordersData);
          
          if (Array.isArray(ordersData)) {
            ordersArray = ordersData;
          } else if (ordersData && ordersData.orders) {
            ordersArray = ordersData.orders;
          } else if (ordersData && ordersData.data) {
            ordersArray = ordersData.data;
          }
        }
      } catch (orderError) {
        console.log('Orders API not available:', orderError);
      }

      try {
        console.log('Fetching offers...');
        const offersResponse = await fetch('/marketplace/offers/seller-offers', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        console.log('Offers response status:', offersResponse.status);
        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          console.log('Offers API Response:', offersData);
          
          if (Array.isArray(offersData)) {
            offersArray = offersData;
          } else if (offersData && offersData.offers) {
            offersArray = offersData.offers;
          } else if (offersData && offersData.data) {
            offersArray = offersData.data;
          }
        }
      } catch (offerError) {
        console.log('Offers API not available:', offerError);
      }

      setRecentOrders(ordersArray.slice(0, 5));
      setOffers(offersArray);

      // Calculate statistics with available data
      calculateStats(ordersArray, listingsArray, offersArray);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Sirf error show karo agar listings bhi fetch nahi ho payi
      try {
        const listingsData = await getMyListings(setLoading);
        if (!listingsData || (Array.isArray(listingsData) && listingsData.length === 0)) {
          setError('Failed to load dashboard data. Please try again.');
        }
      } catch (finalError) {
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the functions same as before ...

  const ListingCard = ({ listing }: { listing: Listing }) => {
    console.log('Rendering listing:', listing); // Debug each listing
    
    return (
      <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between mb-3">
          <h4 className="font-medium text-gray-900 truncate">
            {listing.title || 'No Title'}
          </h4>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getListingStatusColor(listing.status)}`}>
            {listing.status || 'unknown'}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {listing.description || 'No description available'}
        </p>
        
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-green-600">
            {formatCurrency(listing.price || 0)}
          </span>
          <span className="text-gray-500">
            {listing.createdAt ? formatDate(listing.createdAt) : 'No date'}
          </span>
        </div>

        <div className="mt-3">
          <button
            onClick={() => handleViewListingDetails(listing._id)}
            className="w-full text-xs py-2 px-3 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  // ... rest of the component same as before ...

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Debug Info - Temporary */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
            <h3 className="text-sm font-semibold text-blue-900">Debug Info:</h3>
            <p className="text-xs text-blue-700">
              Listings: {listings.length} | Orders: {recentOrders.length} | Offers: {offers.length}
            </p>
            <p className="text-xs text-blue-700">
              Active Tab: {activeTab} | Loading: {loading.toString()}
            </p>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your listings, offers, and track your sales performance</p>
          </div>

          {/* ... rest of the JSX same as before ... */}
          
          {activeTab === 'listings' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    View your product listings ({listings.length} found)
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={fetchDashboardData}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>
              <div className="p-6">
                {listings.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No listings found</h3>
                    <p className="mt-2 text-gray-500">
                      We couldn't find any listings. Please check the API response structure.
                    </p>
                    <button
                      onClick={fetchDashboardData}
                      className="mt-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing, index) => (
                      <ListingCard key={listing._id || index} listing={listing} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;