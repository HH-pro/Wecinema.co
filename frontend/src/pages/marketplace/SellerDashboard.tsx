import React, { useState, useEffect } from 'react';
import MarketplaceLayout from '../../components/Layout';
import { getMyListings } from '../../api';

interface Listing {
  _id: string;
  title: string;
  price: number;
  status: string;
  updatedAt: string;
}

const SellerDashboard: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('🔄 Starting fetchListings...');
      
      // Direct API call
      const response = await getMyListings(setLoading);
      
      console.log('📝 getMyListings response:', response);
      console.log('📝 Response type:', typeof response);
      console.log('📝 Is array:', Array.isArray(response));
      
      if (Array.isArray(response)) {
        console.log('✅ Listings array received, length:', response.length);
        if (response.length > 0) {
          console.log('📝 First listing:', response[0]);
        }
        setListings(response);
      } else {
        console.warn('⚠️ Response is not array:', response);
        setListings([]);
        setError('Invalid response format from server');
      }
      
    } catch (error) {
      console.error('❌ Error in fetchListings:', error);
      setError('Failed to load listings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Direct fetch test
  const testDirectFetch = async () => {
    try {
      console.log('🧪 Testing direct fetch...');
      setLoading(true);
      
      const response = await fetch('/marketplace/listings/my-listings', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🧪 Direct fetch status:', response.status);
      console.log('🧪 Direct fetch headers:', Object.fromEntries(response.headers.entries()));
      
      const text = await response.text();
      console.log('🧪 Direct fetch raw text:', text);
      console.log('🧪 Text length:', text.length);
      
      if (text) {
        try {
          const jsonData = JSON.parse(text);
          console.log('🧪 Parsed JSON:', jsonData);
        } catch (parseError) {
          console.error('🧪 JSON parse error:', parseError);
        }
      }
      
    } catch (error) {
      console.error('🧪 Direct fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has any listings in database
  const checkDatabase = async () => {
    try {
      console.log('🗄️ Checking all listings...');
      const response = await fetch('/marketplace/listings', {
        credentials: 'include'
      });
      const allListings = await response.json();
      console.log('🗄️ All listings in database:', allListings);
      console.log('🗄️ Total listings count:', Array.isArray(allListings) ? allListings.length : 'N/A');
    } catch (error) {
      console.error('🗄️ Database check error:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
            <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Debug Panel */}
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Debug Panel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
              <div className="text-blue-700">
                <strong>Listings:</strong> {listings.length}
              </div>
              <div className="text-blue-700">
                <strong>Loading:</strong> {loading.toString()}
              </div>
              <div className="text-blue-700">
                <strong>Error:</strong> {error ? 'Yes' : 'No'}
              </div>
              <div className="text-blue-700">
                <strong>User ID:</strong> Check console
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={testDirectFetch}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
              >
                Test Direct Fetch
              </button>
              <button 
                onClick={fetchListings}
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded"
              >
                Refresh via API
              </button>
              <button 
                onClick={checkDatabase}
                className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
              >
                Check All Listings
              </button>
            </div>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage your product listings</p>
          </div>

          {/* Error Message */}
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

          {/* Listings Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">My Listings</h2>
              <p className="text-sm text-gray-600 mt-1">
                {listings.length} {listings.length === 1 ? 'listing' : 'listings'} found
              </p>
            </div>
            
            <div className="p-6">
              {listings.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {error ? 'API Error' : 'No Listings Found'}
                  </h3>
                  <p className="mt-2 text-gray-500">
                    {error 
                      ? 'There was an error fetching your listings.' 
                      : 'You currently don\'t have any listings. Create your first listing to get started.'
                    }
                  </p>
                  <div className="mt-4 space-x-3">
                    <button
                      onClick={fetchListings}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => window.location.href = '/create-listing'}
                      className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
                    >
                      Create Listing
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((listing) => (
                    <div key={listing._id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium text-gray-900 truncate flex-1 mr-2">
                          {listing.title}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          listing.status === 'active' 
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : listing.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                            : 'bg-gray-100 text-gray-800 border-gray-200'
                        }`}>
                          {listing.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(listing.price)}
                        </span>
                        <span className="text-gray-500">
                          Updated: {formatDate(listing.updatedAt)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={() => window.location.href = `/listings/${listing._id}`}
                          className="w-full text-sm py-2 px-3 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;