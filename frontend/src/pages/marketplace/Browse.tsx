// src/pages/marketplace/Browse.tsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiFilter,
  FiPlus,
  FiSearch,
  FiX,
  FiRefreshCw,
  FiTrendingUp,
  FiDollarSign,
  FiStar,
  FiClock,
  FiPackage,
  FiEye,
  FiShoppingCart
} from 'react-icons/fi';

// Components
import ListingCard from '../../components/marketplae/ListingCard';
import MarketplaceLayout from '../../components/Layout';

// API
import marketplaceApi from '../../api/marketplaceApi';

// Types
import { Listing } from '../../types/marketplace';

const Browse: React.FC = () => {
  // State Management
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [debugData, setDebugData] = useState<any>(null);

  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState({
    category: 'all',
    minPrice: '',
    maxPrice: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: 'active',
    type: 'all'
  });

  // Categories for dropdown
  const categories = [
    'all', 'Video', 'Script', 'Music', 'Animation', 
    'Documentary', 'Commercial', 'Film', 'Short Film', 
    'Series', 'Other'
  ];

  // ==============================
  // EFFECTS
  // ==============================

  useEffect(() => {
    console.log('🔄 Browse component mounted');
    fetchListings();
  }, []);

  useEffect(() => {
    console.log('🔄 Filters changed:', filters);
    fetchListings();
  }, [filters]);

  // ==============================
  // API FUNCTIONS - UPDATED
  // ==============================

  const fetchListings = async () => {
    try {
      console.log('🔄 Fetching listings with filters:', filters);
      setLoading(true);
      setError('');
      setDebugData(null);

      const params = {
        ...filters,
        page: 1,
        limit: 20,
        search: searchQuery || undefined
      };

      console.log('📡 API Params:', params);

      const response = await marketplaceApi.listings.getAllListings(params);
      
      // Store debug data
      setDebugData({
        response: response,
        timestamp: new Date().toISOString(),
        params: params
      });

      console.log('📦 API Response Structure:', {
        success: response.success,
        hasData: !!response.data,
        hasListings: !!response.data?.listings,
        listingsType: typeof response.data?.listings,
        listingsIsArray: Array.isArray(response.data?.listings),
        listingsLength: response.data?.listings?.length || 0
      });

      if (response.success) {
        // ✅ FIXED: Handle different response structures
        let listingsData: Listing[] = [];
        
        if (response.data?.listings && Array.isArray(response.data.listings)) {
          listingsData = response.data.listings;
        } else if (Array.isArray(response.data)) {
          listingsData = response.data;
        } else if (response.data && typeof response.data === 'object') {
          // Try to extract listings from object
          listingsData = Object.values(response.data).find(val => Array.isArray(val)) || [];
        }

        console.log('✅ Processed Listings Data:', {
          count: listingsData.length,
          firstListing: listingsData[0] ? {
            id: listingsData[0]._id,
            title: listingsData[0].title,
            price: listingsData[0].price,
            seller: listingsData[0].sellerId,
            hasThumbnail: !!listingsData[0].thumbnail
          } : 'No listings'
        });

        // ✅ Transform data to ensure proper format
        const transformedListings = listingsData.map((item: any) => ({
          _id: item._id || item.id || Math.random().toString(),
          title: item.title || 'Untitled Listing',
          description: item.description || '',
          price: item.price || 0,
          formattedPrice: item.formattedPrice || `$${(item.price || 0).toFixed(2)}`,
          status: item.status || 'active',
          mediaUrls: Array.isArray(item.mediaUrls) ? item.mediaUrls : [],
          thumbnail: item.thumbnail || (Array.isArray(item.mediaUrls) ? item.mediaUrls[0] : null) || 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80',
          category: item.category || 'Uncategorized',
          tags: Array.isArray(item.tags) ? item.tags : [],
          views: item.views || item.viewCount || 0,
          favoriteCount: item.favoriteCount || 0,
          purchaseCount: item.purchaseCount || 0,
          sellerId: item.sellerId || item.seller || { 
            _id: 'unknown', 
            username: 'Unknown Seller',
            avatar: null,
            sellerRating: 0 
          },
          sellerEmail: item.sellerEmail || '',
          type: item.type || 'for_sale',
          currency: item.currency || 'USD',
          isDigital: item.isDigital !== false,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
          createdAtFormatted: item.createdAtFormatted || (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'),
          statusColor: item.statusColor || (item.status === 'active' ? 'green' : 'gray'),
          seller: item.seller || item.sellerId
        }));

        console.log('🎯 Transformed Listings Count:', transformedListings.length);
        
        setListings(transformedListings);
        
        if (transformedListings.length === 0) {
          setSuccessMessage('No listings found. Try adjusting your filters or be the first to create a listing!');
        } else {
          setSuccessMessage(`Found ${transformedListings.length} listings`);
        }
      } else {
        console.error('❌ API Error Response:', response);
        setError(response.error || 'Failed to fetch listings');
      }
    } catch (error: any) {
      console.error('❌ Network/System Error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // EVENT HANDLERS
  // ==============================

  const handleSearch = () => {
    console.log('🔍 Searching for:', searchQuery);
    fetchListings();
  };

  const handleViewDetails = (listingId: string) => {
    console.log('👁️ Viewing details for:', listingId);
    navigate(`/marketplace/listings/${listingId}`);
  };

  const handleMakeOffer = (listing: Listing) => {
    console.log('💰 Making offer for:', listing._id);
    alert('Make offer functionality will be implemented soon!');
  };

  const handleDirectPayment = (listing: Listing) => {
    console.log('💳 Direct payment for:', listing._id);
    alert('Direct payment functionality will be implemented soon!');
  };

  const clearFilters = () => {
    console.log('🗑️ Clearing filters');
    setFilters({
      category: 'all',
      minPrice: '',
      maxPrice: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'active',
      type: 'all'
    });
    setSearchQuery('');
    setError('');
    fetchListings();
  };

  // Filter listings based on search query
  const filteredListings = searchQuery 
    ? listings.filter(listing =>
        (listing.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (listing.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (listing.tags && listing.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    : listings;

  // ==============================
  // RENDER FUNCTIONS
  // ==============================

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-yellow-200 border-t-yellow-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FiPackage className="text-yellow-600 text-2xl" />
              </div>
            </div>
            <p className="mt-6 text-gray-600 text-lg font-medium">Loading marketplace...</p>
            <p className="mt-2 text-gray-500 text-sm">Discovering amazing content</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        {/* Debug Panel - Always visible for now */}
        {debugData && (
          <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white p-4 rounded-lg shadow-2xl max-w-md max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-semibold">Debug Panel</h4>
              <button 
                onClick={() => setDebugData(null)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="text-xs space-y-2">
              <div><strong>API Success:</strong> {debugData.response.success.toString()}</div>
              <div><strong>Listings Count:</strong> {listings.length}</div>
              <div><strong>Filtered Count:</strong> {filteredListings.length}</div>
              <div><strong>Error:</strong> {debugData.response.error || 'None'}</div>
              
              {listings.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <strong>Sample Listing:</strong>
                  <div className="text-xs mt-1 space-y-1">
                    <div><strong>Title:</strong> {listings[0].title}</div>
                    <div><strong>Price:</strong> {listings[0].formattedPrice}</div>
                    <div><strong>Has Thumbnail:</strong> {!!listings[0].thumbnail ? 'Yes' : 'No'}</div>
                    <div><strong>Seller:</strong> {listings[0].sellerId?.username || 'Unknown'}</div>
                  </div>
                </div>
              )}
              
              <button 
                onClick={() => console.log('Full Response:', debugData.response)}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Log Full Response to Console
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-700 text-white py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">Marketplace</h1>
                <p className="text-xl text-yellow-100 mb-8 max-w-2xl">
                  Buy, sell, and trade video content, scripts, and digital assets
                </p>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiTrendingUp />
                    <span>Trending Now</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiStar />
                    <span>Premium Quality</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
                    <FiDollarSign />
                    <span>Secure Payments</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate('/marketplace/create')}
                  className="group bg-white text-yellow-700 hover:bg-gray-50 px-8 py-4 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center gap-3"
                >
                  <FiPlus className="group-hover:rotate-90 transition-transform duration-300" size={24} />
                  <span>Create Listing</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Messages */}
          {error && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <FiPackage className="text-red-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-red-800 font-medium">{error}</p>
                  </div>
                  <button
                    onClick={() => setError('')}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 animate-fade-in">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                <div className="flex items-center gap-3">
                  <FiPackage className="text-green-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-green-800 font-medium">{successMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search Input */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search titles, descriptions, tags..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        handleSearch();
                      }}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <FiX className="text-gray-400 hover:text-gray-600" size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${
                    showFilters
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiFilter size={18} />
                  <span className="hidden sm:inline">Filters</span>
                </button>

                <button
                  onClick={() => fetchListings()}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-all duration-200 disabled:opacity-50"
                >
                  <FiRefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 pt-6 border-t border-gray-200 animate-slide-down">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === 'all' ? 'All Categories' : category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="all">All Types</option>
                      <option value="for_sale">For Sale</option>
                      <option value="licensing">Licensing</option>
                      <option value="adaptation_rights">Adaptation Rights</option>
                      <option value="commission">Commission</option>
                    </select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Price Range ($)
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    >
                      <option value="createdAt">Newest First</option>
                      <option value="price">Price: Low to High</option>
                      <option value="-price">Price: High to Low</option>
                    </select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {listings.length} listings
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={clearFilters}
                      className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                    >
                      Clear All
                    </button>
                    <button
                      onClick={() => {
                        fetchListings();
                        setShowFilters(false);
                      }}
                      className="px-5 py-2.5 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-medium"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Featured Listings'}
              </h2>
              <p className="text-gray-600 mt-1">
                {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'} found
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <FiClock size={16} />
              <span>Updated just now</span>
            </div>
          </div>

          {/* ✅ SIMPLE TEST DISPLAY - REMOVE LATER */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Test Display (Debug)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.slice(0, 3).map((listing, index) => (
                <div key={index} className="p-4 bg-white border rounded-lg">
                  <p><strong>Title:</strong> {listing.title}</p>
                  <p><strong>Price:</strong> {listing.formattedPrice}</p>
                  <p><strong>Category:</strong> {listing.category}</p>
                  {listing.thumbnail && (
                    <img 
                      src={listing.thumbnail} 
                      alt={listing.title}
                      className="mt-2 w-full h-32 object-cover rounded"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Listings Grid */}
          {filteredListings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-full flex items-center justify-center">
                  <FiSearch size={32} className="text-yellow-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {searchQuery ? 'No matching listings found' : 'No listings available'}
                </h3>
                <p className="text-gray-600 mb-8">
                  {searchQuery
                    ? 'Try adjusting your search terms or filters'
                    : 'Be the first to create a listing and start trading!'
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearFilters}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => navigate('/marketplace/create')}
                    className="px-6 py-3 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 font-medium"
                  >
                    Create Listing
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <FiShoppingCart className="text-green-600" size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Active Listings</div>
                      <div className="text-2xl font-bold text-gray-900">{filteredListings.length}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <FiDollarSign className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-700">Total Value</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${filteredListings.reduce((sum, listing) => sum + (listing.price || 0), 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Listings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredListings.map((listing, index) => {
                  console.log(`🎨 Rendering listing ${index + 1}:`, {
                    id: listing._id,
                    title: listing.title,
                    hasThumbnail: !!listing.thumbnail,
                    seller: listing.sellerId?.username
                  });
                  return (
                    <div 
                      key={listing._id} 
                      className="animate-fade-in" 
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <ListingCard
                        listing={listing}
                        onViewDetails={handleViewDetails}
                        onMakeOffer={handleMakeOffer}
                        onDirectPayment={handleDirectPayment}
                      />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default Browse;