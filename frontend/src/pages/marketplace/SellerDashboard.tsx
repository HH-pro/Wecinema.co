// src/pages/seller/SellerDashboard.tsx - TROUBLESHOOTING VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// First, let's test with a minimal version
import MarketplaceLayout from '../../components/Layout';

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-lg text-gray-800 font-medium">Loading your dashboard...</p>
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <p className="text-gray-600 mt-2">Simplified version for troubleshooting</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Component Import Test</h2>
            <p className="text-gray-600 mb-4">If you see this, basic rendering is working.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/marketplace/create')}
                className="px-4 py-3 bg-yellow-500 text-white font-medium rounded-lg hover:bg-yellow-600 transition"
              >
                + Create Listing
              </button>
              
              <button
                onClick={() => navigate('/marketplace/listings')}
                className="px-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
              >
                View Listings
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-medium mb-3">Quick Stats</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">₹0</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Active Orders</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Listings</p>
                <p className="text-2xl font-bold">0</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Offers</p>
                <p className="text-2xl font-bold">0</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default SellerDashboard;