// src/pages/marketplace/TestBrowse.tsx (temporary file)
import React, { useState, useEffect } from 'react';
import marketplaceApi from '../../api/marketplaceApi';

const TestBrowse: React.FC = () => {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.listings.getAllListings({
        category: 'all',
        page: 1,
        limit: 20,
        status: 'active',
        type: 'all'
      });

      console.log('📦 FULL API RESPONSE:', response);
      
      if (response.success) {
        console.log('✅ SUCCESS - Data structure:');
        console.log('Listings array:', response.data?.listings);
        console.log('Type of listings:', typeof response.data?.listings);
        console.log('Is array?', Array.isArray(response.data?.listings));
        console.log('Listings length:', response.data?.listings?.length);
        
        if (response.data?.listings && response.data.listings.length > 0) {
          console.log('📝 First listing details:', response.data.listings[0]);
          console.log('🎯 First listing keys:', Object.keys(response.data.listings[0]));
          console.log('🖼️ First listing mediaUrls:', response.data.listings[0].mediaUrls);
          console.log('💰 First listing price:', response.data.listings[0].price);
          console.log('👤 First listing sellerId:', response.data.listings[0].sellerId);
        }
        
        setListings(response.data?.listings || []);
      } else {
        console.error('❌ API Error:', response.error);
        setError(response.error || 'Failed to fetch listings');
      }
    } catch (err: any) {
      console.error('❌ Catch Error:', err);
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading test data...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Debug Test - Marketplace Listings</h1>
      <p>Total Listings: {listings.length}</p>
      
      <button 
        onClick={fetchListings}
        style={{ padding: '10px 20px', margin: '10px 0', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Refresh Data
      </button>

      <div style={{ marginTop: '20px' }}>
        <h2>Raw API Response Structure:</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px', overflow: 'auto' }}>
          {JSON.stringify(listings, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Listings Display:</h2>
        {listings.length === 0 ? (
          <p>No listings found</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {listings.map((listing, index) => (
              <div 
                key={listing._id || index}
                style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '15px',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                <h3 style={{ marginTop: 0 }}>{listing.title || 'No Title'}</h3>
                <p><strong>ID:</strong> {listing._id}</p>
                <p><strong>Price:</strong> {listing.formattedPrice || `$${listing.price || 0}`}</p>
                <p><strong>Category:</strong> {listing.category || 'N/A'}</p>
                <p><strong>Status:</strong> {listing.status || 'N/A'}</p>
                <p><strong>Seller:</strong> {listing.sellerId?.username || listing.seller?.username || 'Unknown'}</p>
                <p><strong>Media URLs:</strong> {Array.isArray(listing.mediaUrls) ? listing.mediaUrls.length : 'Not array'}</p>
                {listing.thumbnail && (
                  <img 
                    src={listing.thumbnail} 
                    alt={listing.title}
                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '5px' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x150?text=No+Image';
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestBrowse;