import React from 'react';

interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  sellerId: {
    username: string;
    avatar?: string;
    sellerRating: number;
  };
  mediaUrls: string[];
}

interface ListingCardProps {
  listing: Listing;
  onViewDetails: (listingId: string) => void;
  onMakeOffer: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ 
  listing, 
  onViewDetails, 
  onMakeOffer 
}) => {
  return (
    <div className="listing-card">
      <div className="listing-media">
        {listing.mediaUrls.length > 0 ? (
          <img src={listing.mediaUrls[0]} alt={listing.title} />
        ) : (
          <div className="no-image">No Image</div>
        )}
      </div>
      
      <div className="listing-content">
        <h3 className="listing-title">{listing.title}</h3>
        <p className="listing-description">{listing.description}</p>
        
        <div className="listing-meta">
          <span className="listing-price">${listing.price}</span>
          <span className="listing-type">{listing.type}</span>
        </div>
        
        <div className="seller-info">
          <span className="seller-name">By {listing.sellerId.username}</span>
          <span className="seller-rating">⭐ {listing.sellerId.sellerRating}</span>
        </div>
        
        <div className="listing-actions">
          <button 
            onClick={() => onViewDetails(listing._id)}
            className="btn btn-primary"
          >
            View Details
          </button>
          <button 
            onClick={() => onMakeOffer(listing)}
            className="btn btn-secondary"
          >
            Make Offer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;