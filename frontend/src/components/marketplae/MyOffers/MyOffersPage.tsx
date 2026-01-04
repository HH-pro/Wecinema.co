import React, { useEffect, useState } from 'react';
import { 
  FaDollarSign, 
  FaClock, 
  FaCheckCircle, 
  FaTimes, 
  FaEye, 
  FaComment,
  FaShoppingBag,
  FaSearch,
  FaFilter,
  FaSync,
  FaArrowLeft
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import MarketplaceLayout from '../../Layout/';
import { marketplaceAPI } from '../../../api/marketplaceApi';
import './MyOffersPage.css';

interface Offer {
  _id: string;
  listingId: {
    _id: string;
    title: string;
    price: number;
    mediaUrls?: string[];
  };
  buyerId: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  sellerId: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';
  message?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  counterOffer?: {
    amount: number;
    message?: string;
  };
}

const MyOffersPage: React.FC = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyOffers();
  }, []);

  const fetchMyOffers = async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.offers.getMy(setLoading) as any;
      
      if (response.success && response.offers) {
        setOffers(response.offers);
      } else {
        toast.error(response.error || 'Failed to fetch offers');
      }
    } catch (error: any) {
      toast.error(error.message || 'Error loading offers');
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewListing = (listingId: string) => {
    navigate(`/marketplace/listings/${listingId}`);
  };

  const handleContactSeller = (sellerId: string) => {
    navigate(`/marketplace/messages?seller=${sellerId}`);
  };

  const handleCancelOffer = async (offerId: string) => {
    if (window.confirm('Are you sure you want to cancel this offer?')) {
      try {
        setLoading(true);
        await marketplaceApi.offers.cancel(offerId, setLoading);
        toast.success('Offer cancelled successfully');
        fetchMyOffers();
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel offer');
      }
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#f39c12',
      accepted: '#27ae60',
      rejected: '#e74c3c',
      cancelled: '#95a5a6',
      expired: '#7f8c8d'
    };
    return colors[status] || '#95a5a6';
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.listingId.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.message?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || offer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStats = () => {
    const total = offers.length;
    const pending = offers.filter(o => o.status === 'pending').length;
    const accepted = offers.filter(o => o.status === 'accepted').length;
    const rejected = offers.filter(o => o.status === 'rejected').length;
    const totalAmount = offers.reduce((sum, offer) => sum + offer.amount, 0);
    
    return { total, pending, accepted, rejected, totalAmount };
  };

  const stats = getStats();

  if (loading && offers.length === 0) {
    return (
      <MarketplaceLayout>
        <div className="offers-loading">
          <FaSync className="loading-spinner" />
          <p>Loading your offers...</p>
        </div>
      </MarketplaceLayout>
    );
  }

  return (
    <MarketplaceLayout>
      <div className="my-offers-page">
        {/* Header */}
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate('/marketplace/buyer-dashboard')}>
            <FaArrowLeft /> Back to Dashboard
          </button>
          <div className="header-content">
            <h1>My Offers</h1>
            <p>View and manage your purchase offers</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="offers-stats">
          <div className="stat-card">
            <div className="stat-icon total">
              <FaShoppingBag />
            </div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Offers</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon pending">
              <FaClock />
            </div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon accepted">
              <FaCheckCircle />
            </div>
            <div className="stat-info">
              <h3>{stats.accepted}</h3>
              <p>Accepted</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon amount">
              <FaDollarSign />
            </div>
            <div className="stat-info">
              <h3>{formatCurrency(stats.totalAmount)}</h3>
              <p>Total Amount</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search offers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filter-dropdown">
            <FaFilter className="filter-icon" />
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-filter"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          
          <button className="refresh-btn" onClick={fetchMyOffers}>
            <FaSync /> Refresh
          </button>
        </div>

        {/* Offers List */}
        <div className="offers-list">
          {filteredOffers.length > 0 ? (
            filteredOffers.map(offer => (
              <div key={offer._id} className="offer-card">
                <div className="offer-header">
                  <h3 className="listing-title">{offer.listingId.title}</h3>
                  <div className="offer-status" style={{ color: getStatusColor(offer.status) }}>
                    {getStatusText(offer.status)}
                  </div>
                </div>
                
                <div className="offer-details">
                  <div className="detail-row">
                    <span className="detail-label">Offered Amount:</span>
                    <span className="detail-value amount">{formatCurrency(offer.amount)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Listing Price:</span>
                    <span className="detail-value">{formatCurrency(offer.listingId.price)}</span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Seller:</span>
                    <span className="detail-value">
                      {offer.sellerId.firstName ? 
                        `${offer.sellerId.firstName} ${offer.sellerId.lastName || ''}`.trim() : 
                        offer.sellerId.username}
                    </span>
                  </div>
                  
                  <div className="detail-row">
                    <span className="detail-label">Submitted:</span>
                    <span className="detail-value">{formatDate(offer.createdAt)}</span>
                  </div>
                  
                  {offer.expiresAt && (
                    <div className="detail-row">
                      <span className="detail-label">Expires:</span>
                      <span className="detail-value">{formatDate(offer.expiresAt)}</span>
                    </div>
                  )}
                  
                  {offer.message && (
                    <div className="offer-message">
                      <strong>Your Message:</strong>
                      <p>{offer.message}</p>
                    </div>
                  )}
                  
                  {offer.counterOffer && (
                    <div className="counter-offer">
                      <strong>Counter Offer:</strong>
                      <p>{formatCurrency(offer.counterOffer.amount)}</p>
                      {offer.counterOffer.message && (
                        <p className="counter-message">{offer.counterOffer.message}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="offer-actions">
                  <button 
                    className="action-btn view-listing"
                    onClick={() => handleViewListing(offer.listingId._id)}
                  >
                    <FaEye /> View Listing
                  </button>
                  
                  <button 
                    className="action-btn contact-seller"
                    onClick={() => handleContactSeller(offer.sellerId._id)}
                  >
                    <FaComment /> Contact Seller
                  </button>
                  
                  {offer.status === 'pending' && (
                    <button 
                      className="action-btn cancel-offer"
                      onClick={() => handleCancelOffer(offer._id)}
                    >
                      <FaTimes /> Cancel Offer
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-offers">
              <FaShoppingBag className="no-offers-icon" />
              <h3>No offers found</h3>
              <p>
                {offers.length === 0 
                  ? "You haven't made any offers yet" 
                  : "No offers match your search criteria"}
              </p>
              {offers.length === 0 && (
                <button 
                  className="cta-button"
                  onClick={() => navigate('/marketplace')}
                >
                  Browse Listings
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default MyOffersPage;