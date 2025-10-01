import React, { useState, useEffect } from 'react';
import ListingCard from '../../components/marketplace/ListingCard';
import CreateListingModal from '../../components/marketplace/CreateListingModal';
import MarketplaceLayout from '../../components/marketplace/MarketplaceLayout';
import { Listing } from '../../types/marketplace';

const Browse: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    minPrice: '',
    maxPrice: ''
  });

  // Fetch listings on component mount
  useEffect(() => {
    fetchListings();
  }, [filters]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketplace/listings');
      const data = await response.json();
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateListing = async (listingData: any) => {
    try {
      const response = await fetch('/api/marketplace/create-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });
      
      if (response.ok) {
        setShowCreateModal(false);
        fetchListings(); // Refresh listings
      }
    } catch (error) {
      console.error('Error creating listing:', error);
    }
  };

  const handleViewDetails = (listingId: string) => {
    // Navigate to listing details or show modal
    console.log('View details:', listingId);
  };

  const handleMakeOffer = (listing: Listing) => {
    // Open make offer modal
    console.log('Make offer:', listing);
  };

  if (loading) {
    return (
      <MarketplaceLayout>
        <div className="loading">Loading listings...</div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="browse-page">
        {/* Header with Filters */}
        <div className="page-header">
          <div className="header-actions">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              + Create Listing
            </button>
          </div>

          <div className="filters">
            <select 
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="">All Types</option>
              <option value="for_sale">For Sale</option>
              <option value="licensing">Licensing</option>
              <option value="adaptation_rights">Adaptation Rights</option>
              <option value="commission">Commission</option>
            </select>

            <input
              type="number"
              placeholder="Min Price"
              value={filters.minPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
            />

            <input
              type="number"
              placeholder="Max Price"
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
            />
          </div>
        </div>

        {/* Listings Grid */}
        <div className="listings-grid">
          {listings.length === 0 ? (
            <div className="empty-state">
              <h3>No listings found</h3>
              <p>Be the first to create a listing!</p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                Create First Listing
              </button>
            </div>
          ) : (
            listings.map(listing => (
              <ListingCard
                key={listing._id}
                listing={listing}
                onViewDetails={handleViewDetails}
                onMakeOffer={handleMakeOffer}
              />
            ))
          )}
        </div>

        {/* Create Listing Modal */}
        <CreateListingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateListing}
        />
      </div>
    </MarketplaceLayout>
  );
};

export default Browse;